import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import * as map from 'lib0/map';
import { IncomingMessage } from 'http';
import WebSocket from 'ws';

const wsReadyStateOpen = 1;

const messageSync = 0;
const messageAwareness = 1;

type Persistence = {
    bindState: (docName: string, doc: Y.Doc) => Promise<void>;
    writeState: (docName: string, doc: Y.Doc) => Promise<void>;
};

type AwarenessDoc = Y.Doc & {
    awareness: awarenessProtocol.Awareness;
    conns: Map<WebSocket, Set<number>>;
    name: string;
    hasRedisListener?: boolean;
    whenLoaded?: Promise<void>;
};

const docs = new Map<string, AwarenessDoc>();
let persistence: Persistence | null = null;

export const setPersistence = (p: Persistence) => {
    persistence = p;
};

export const getYDoc = (docName: string, gc = true) =>
    map.setIfUndefined(docs, docName, () => {
        const doc = new Y.Doc({ gc }) as AwarenessDoc;
        doc.name = docName;
        doc.conns = new Map();
        doc.awareness = new awarenessProtocol.Awareness(doc);
        doc.awareness.setLocalState(null);

        const awarenessChangeHandler = ({
            added,
            updated,
            removed
        }: {
            added: number[];
            updated: number[];
            removed: number[];
        }) => {
            const changedClients = added.concat(updated).concat(removed);
            const encoder = encoding.createEncoder();
            encoding.writeVarUint(encoder, messageAwareness);
            const awarenessUpdate = awarenessProtocol.encodeAwarenessUpdate(doc.awareness, changedClients);
            encoding.writeVarUint8Array(encoder, awarenessUpdate);
            const buff = encoding.toUint8Array(encoder);
            doc.conns.forEach((_controlledIds, conn) => {
                send(doc, conn, buff);
            });
        };

        doc.awareness.on('update', awarenessChangeHandler);

        doc.on('update', (update: Uint8Array, origin: any, doc: Y.Doc) => {
            const encoder = encoding.createEncoder();
            encoding.writeVarUint(encoder, messageSync);
            syncProtocol.writeUpdate(encoder, update);
            const message = encoding.toUint8Array(encoder);
            (doc as AwarenessDoc).conns.forEach((_, conn) => send(doc as AwarenessDoc, conn, message));
        });

        if (persistence) {
            doc.whenLoaded = persistence.bindState(docName, doc);
        }

        return doc;
    });

const send = (doc: AwarenessDoc, conn: WebSocket, m: Uint8Array) => {
    if (conn.readyState !== wsReadyStateOpen) {
        closeConn(doc, conn);
        return;
    }
    try {
        conn.send(m, (err) => {
            if (err) {
                closeConn(doc, conn);
            }
        });
    } catch (e) {
        closeConn(doc, conn);
    }
};

const closeConn = (doc: AwarenessDoc, conn: WebSocket) => {
    if (doc.conns.has(conn)) {
        const controlledIds = doc.conns.get(conn);
        if (controlledIds) {
            doc.conns.delete(conn);
            awarenessProtocol.removeAwarenessStates(doc.awareness, Array.from(controlledIds), null);
        }
        if (doc.conns.size === 0 && persistence) {
            // Wait for document to be loaded before writing state
            const promise = doc.whenLoaded ? doc.whenLoaded : Promise.resolve();
            promise.then(() => {
                if (doc.conns.size === 0 && persistence) { // Check again in case someone connected in the meantime
                    return persistence.writeState(doc.name, doc).then(() => {
                        doc.destroy();
                        docs.delete(doc.name);
                    });
                }
            });
        }
    }
    conn.close();
};

export const setupWSConnection = (
    conn: WebSocket,
    req: IncomingMessage,
    { docName = req.url?.slice(1).split('?')[0] ?? 'default', gc = true } = {}
) => {
    conn.binaryType = 'arraybuffer';
    const doc = getYDoc(docName, gc);
    doc.conns.set(conn, new Set());

    const awarenessStates = doc.awareness.getStates();
    if (awarenessStates.size > 0) {
        const changedClients = Array.from(awarenessStates.keys()) as number[];
        const encoderAwareness = encoding.createEncoder();
        encoding.writeVarUint(encoderAwareness, messageAwareness);
        const awarenessUpdate = awarenessProtocol.encodeAwarenessUpdate(doc.awareness, changedClients);
        encoding.writeVarUint8Array(encoderAwareness, awarenessUpdate);
        send(doc, conn, encoding.toUint8Array(encoderAwareness));
    }

    conn.on('message', (message: ArrayBuffer) => {
        const encoder = encoding.createEncoder();
        const decoder = decoding.createDecoder(new Uint8Array(message));
        const messageType = decoding.readVarUint(decoder);

        console.log(`[WS] Message received for ${docName}, type: ${messageType}, size: ${message.byteLength}`);

        switch (messageType) {
            case messageSync:
                encoding.writeVarUint(encoder, messageSync);
                const beforeSize = Y.encodeStateAsUpdate(doc).length;
                syncProtocol.readSyncMessage(decoder, encoder, doc, conn);
                const afterSize = Y.encodeStateAsUpdate(doc).length;
                console.log(`[WS] Sync message processed for ${docName}, doc size before: ${beforeSize}, after: ${afterSize}`);
                if (encoding.length(encoder) > 1) {
                    send(doc, conn, encoding.toUint8Array(encoder));
                }
                break;
            case messageAwareness:
                awarenessProtocol.applyAwarenessUpdate(doc.awareness, decoding.readVarUint8Array(decoder), conn);
                break;
            default:
                break;
        }
    });

    conn.on('close', () => {
        console.log(`[WS] Connection closed for ${docName}`);
        closeConn(doc, conn);
    });

    const encoderSync = encoding.createEncoder();
    encoding.writeVarUint(encoderSync, messageSync);
    syncProtocol.writeSyncStep1(encoderSync, doc);
    send(doc, conn, encoding.toUint8Array(encoderSync));

    console.log(`[WS] Connection established for ${docName}, sent sync step 1`);
};

export { docs };
