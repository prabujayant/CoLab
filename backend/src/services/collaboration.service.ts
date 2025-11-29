import { Server } from 'http';
import WebSocket from 'ws';
import * as Y from 'yjs';
import { setupWSConnection, setPersistence, docs, getYDoc } from '../collab/y-websocket-utils';
import { prisma } from './prisma';
import { getRedisPublisher, getRedisSubscriber } from './redis.service';

import zlib from 'zlib';
import { promisify } from 'util';
import fs from 'fs';
import { metricsService } from './metrics.service';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

function debugLog(msg: string) {
    fs.appendFileSync('server-debug.log', msg + '\n');
}

type PersistenceDoc = Y.Doc & {
    hasRedisListener?: boolean;
    updateCount?: number;
};

const CHANNEL = 'yjs-update';
const SNAPSHOT_THRESHOLD = 50;

const persistence = {
    bindState: async (docName: string, ydoc: Y.Doc) => {
        debugLog(`[Persistence] bindState called for ${docName}`);
        (ydoc as PersistenceDoc).updateCount = 0;

        let isLoadingInitialData = true;

        // Attach update listener FIRST, before loading data
        ydoc.on('update', async (update: Uint8Array, origin: any) => {
            // Ignore updates that happen during initial data loading
            if (isLoadingInitialData) {
                // debugLog(`[Persistence] Ignoring update during initial load for ${docName}`);
                return;
            }

            const doc = ydoc as PersistenceDoc;
            doc.updateCount = (doc.updateCount || 0) + 1;

            debugLog(`[Persistence] Update ${doc.updateCount}/${SNAPSHOT_THRESHOLD} for ${docName}`);

            try {
                // Always save the individual update
                await prisma.document.update({
                    where: { slug: docName },
                    data: {
                        updates: {
                            create: {
                                update: Buffer.from(update)
                            }
                        }
                    }
                });

                // Check if we should take a snapshot
                if (doc.updateCount && doc.updateCount >= SNAPSHOT_THRESHOLD) {
                    debugLog(`[Persistence] Creating compressed snapshot for ${docName}`);
                    const state = Y.encodeStateAsUpdate(ydoc);
                    const compressed = await gzip(state);

                    await prisma.document.update({
                        where: { slug: docName },
                        data: {
                            content: compressed,
                            // Optional: Clean up old updates here if you want to implement pruning
                        }
                    });

                    doc.updateCount = 0;
                    debugLog(`[Persistence] Snapshot saved. Original: ${state.length}, Compressed: ${compressed.length}`);
                }
            } catch (error) {
                debugLog(`Failed to persist update for ${docName}: ${error}`);
            }
        });

        console.log(`[Persistence] Update listener attached for ${docName}`);

        // Now load existing data
        try {
            console.log(`[Persistence] Loading state for ${docName}`);
            const document = await prisma.document.findUnique({
                where: { slug: docName },
                include: {
                    updates: {
                        orderBy: { createdAt: 'asc' },
                        // In a real event sourcing system, you'd filter by createdAt > snapshotTime
                        // But since we're just overwriting content with the latest snapshot, 
                        // we can load the snapshot and then apply ALL updates that might have happened since.
                        // Ideally, we should track the vector clock or timestamp of the snapshot.
                        // For this implementation, we'll rely on Y.js idempotency (applying old updates is safe).
                    }
                }
            });

            if (document?.content) {
                let content = document.content;
                // Try to decompress
                try {
                    // Check for Gzip magic bytes (1f 8b)
                    if (content.length > 2 && content[0] === 0x1f && content[1] === 0x8b) {
                        console.log(`[Persistence] Decompressing snapshot for ${docName}`);
                        content = await gunzip(content);
                    }
                } catch (e) {
                    console.log(`[Persistence] Content not compressed or decompression failed, using raw content`);
                }

                console.log(`[Persistence] Applying initial content for ${docName}, size: ${content.length}`);
                Y.applyUpdate(ydoc, new Uint8Array(content));
            }

            if (document?.updates.length) {
                console.log(`[Persistence] Applying ${document.updates.length} updates for ${docName}`);
                document.updates.forEach((event) => {
                    Y.applyUpdate(ydoc, new Uint8Array(event.update));
                });
            }

            console.log(`[Persistence] Finished loading ${docName}`);
        } catch (error) {
            console.error('Failed to bind Y doc state', error);
        } finally {
            // Now that initial data is loaded, start saving new updates
            isLoadingInitialData = false;
            console.log(`[Persistence] Ready to save updates for ${docName}`);
        }
    },
    writeState: async (docName: string, ydoc: Y.Doc) => {
        try {
            console.log(`[Persistence] Writing final state for ${docName}`);
            const state = Y.encodeStateAsUpdate(ydoc);
            const compressed = await gzip(state);

            await prisma.document.update({
                where: { slug: docName },
                data: {
                    content: compressed
                }
            });
            console.log(`[Persistence] Final compressed state saved for ${docName}`);
        } catch (error) {
            console.error(`Failed to write final state for ${docName}`, error);
        }
    }
};

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

export const initializeCollaborationServer = (server: Server) => {
    const wss = new WebSocket.Server({ noServer: true });
    const pub = getRedisPublisher();
    const sub = getRedisSubscriber();

    // Subscribe to Redis updates
    sub.subscribe(CHANNEL);
    sub.on('message', (channel, message) => {
        if (channel === CHANNEL) {
            const { docName, update } = JSON.parse(message);
            const doc = docs.get(docName);
            if (doc) {
                const updateBuffer = Buffer.from(update, 'base64');
                Y.applyUpdate(doc, updateBuffer, 'redis');
            }
        }
    });

    // Handle upgrade manually to verify token
    server.on('upgrade', (request, socket, head) => {
        const url = new URL(request.url ?? '', `http://${request.headers.host}`);
        const token = url.searchParams.get('token');

        if (!token) {
            console.log('[WS] Connection rejected: No token provided');
            socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
            socket.destroy();
            return;
        }

        try {
            jwt.verify(token, JWT_SECRET);

            wss.handleUpgrade(request, socket, head, (ws) => {
                wss.emit('connection', ws, request);
            });
        } catch (error) {
            console.log('[WS] Connection rejected: Invalid token');
            socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
            socket.destroy();
        }
    });

    wss.on('connection', (ws, req) => {
        metricsService.incrementConnections();
        const url = req.url ?? '/';
        // Extract docName from path: /collab/docName?token=...
        const path = url.split('?')[0];
        const [, docSegment] = path.split('/collab/');
        const docName = docSegment || 'default';

        console.log(`[WS] New connection for ${docName}`);
        setupWSConnection(ws, req, { docName });

        // Instrument message handling
        ws.on('message', () => {
            metricsService.incrementWsMessages();
        });

        ws.on('close', () => {
            metricsService.decrementConnections();
        });

        const doc = getYDoc(docName) as PersistenceDoc;
        if (!doc.hasRedisListener) {
            doc.on('update', (update: Uint8Array, origin: any) => {
                if (origin === 'redis') return;
                const encoded = Buffer.from(update).toString('base64');
                pub.publish(CHANNEL, JSON.stringify({ docName, update: encoded }));
            });
            doc.hasRedisListener = true;
        }
    });

    // Initialize persistence
    setPersistence(persistence);
    console.log('Collaboration server ready');
};
