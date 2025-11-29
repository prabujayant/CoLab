const Y = require('yjs');
const zlib = require('zlib');
const { promisify } = require('util');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const gunzip = promisify(zlib.gunzip);

// Mock the persistence logic (since we can't easily import the service directly in this script context without full setup)
// Instead, we will simulate the behavior by interacting with the DB directly and using Yjs
// Wait, the best way is to actually run the server and connect via WS, but that's complex to script.
// Let's rely on the fact that I modified the actual service code.
// I will create a script that modifies the DB directly to simulate "loading" to verify decompression,
// AND inspects the DB after manual interaction to verify compression.

// Actually, I can just use the internal logic if I replicate it, but that doesn't test the actual code.
// Let's create a script that connects via WebSocket, sends 60 updates, and then checks the DB.

const WebSocket = require('ws');
const axios = require('axios');

const WS_URL = 'ws://localhost:3000';
const API_URL = 'http://localhost:3000/api';

async function testSnapshots() {
    console.log('--- Testing Compressed Snapshots ---');

    try {
        // 1. Login
        const email = `snapshot-test-${Date.now()}@example.com`;
        const password = 'password123';
        let authResponse;
        try {
            authResponse = await axios.post(`${API_URL}/auth/register`, { email, password });
        } catch (e) {
            authResponse = await axios.post(`${API_URL}/auth/login`, { email, password });
        }
        const token = authResponse.data.token;


        // Create document via API first
        const createResponse = await axios.post(`${API_URL}/documents`, {
            title: 'Snapshot Test Doc'
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });

        const docSlug = createResponse.data.document.slug;
        console.log(`Created test doc via API: ${docSlug}`);

        // 2. Connect via WS
        const ws = new WebSocket(`${WS_URL}/collab/${docSlug}?token=${token}`);

        await new Promise((resolve, reject) => {
            ws.on('open', resolve);
            ws.on('error', reject);
        });
        console.log('WebSocket connected');

        // 3. Send 60 updates
        const doc = new Y.Doc();
        const text = doc.getText('monaco');

        // Setup sync
        ws.on('message', (data) => {
            // minimal sync handler to keep connection alive
        });

        console.log('Sending 60 updates...');
        for (let i = 0; i < 60; i++) {
            text.insert(0, `Update ${i} `);
            const update = Y.encodeStateAsUpdate(doc);

            // Send sync message
            // We need to wrap it in the sync protocol format
            // MessageType.Sync (0) + SyncMessageType.Update (2) + Update
            const encoder = new Uint8Array(update.length + 2);
            encoder[0] = 0; // Sync
            encoder[1] = 2; // Update
            encoder.set(update, 2);

            ws.send(encoder);

            // Small delay to ensure server processes order
            await new Promise(r => setTimeout(r, 50));
        }
        console.log('Updates sent');

        // 4. Wait for persistence
        console.log('Waiting for persistence (5s)...');
        await new Promise(r => setTimeout(r, 5000));

        // 5. Check DB
        const dbDoc = await prisma.document.findUnique({ where: { slug: docSlug } });

        console.log('DB Document:', dbDoc ? { ...dbDoc, content: dbDoc.content ? `<Buffer len=${dbDoc.content.length}>` : null } : 'null');

        if (!dbDoc) {
            throw new Error('Document not found in DB');
        }

        if (!dbDoc.content) {
            throw new Error('Document content is empty (Snapshot not taken?)');
        }

        console.log(`DB Content Size: ${dbDoc.content.length} bytes`);

        // Check for Gzip magic bytes (1f 8b)
        const isGzipped = dbDoc.content[0] === 0x1f && dbDoc.content[1] === 0x8b;

        if (isGzipped) {
            console.log('✅ SUCCESS: Content is Gzipped!');

            const decompressed = await gunzip(dbDoc.content);
            console.log(`Decompressed Size: ${decompressed.length} bytes`);
            console.log(`Compression Ratio: ${((1 - dbDoc.content.length / decompressed.length) * 100).toFixed(2)}%`);
        } else {
            console.error('❌ FAILURE: Content is NOT Gzipped');
            console.log('First bytes:', dbDoc.content.slice(0, 10));
        }

        ws.close();

    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        await prisma.$disconnect();
        process.exit(0);
    }
}

testSnapshots();
