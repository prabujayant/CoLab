const WebSocket = require('ws');
const Y = require('yjs');

const BASE_URL = 'http://127.0.0.1:3000/api';
let token;
let docSlug;

async function registerAndLogin() {
    const email = `test${Date.now()}@example.com`;
    const password = 'password123';

    console.log('1. Registering...');
    await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, displayName: 'Test User' })
    });

    console.log('2. Logging in...');
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    const loginData = await loginRes.json();
    token = loginData.token;
    console.log('Login successful');
}

async function createDocument() {
    console.log('3. Creating document...');
    const res = await fetch(`${BASE_URL}/documents`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title: 'Live Typing Test' })
    });
    const data = await res.json();
    docSlug = data.document.slug;
    console.log('Document created:', docSlug);
}

async function simulateTyping() {
    console.log('4. Simulating typing (like the frontend does)...');
    const doc = new Y.Doc();
    const text = doc.getText('monaco');
    const ws = new WebSocket(`ws://localhost:3000/collab/${docSlug}`);

    return new Promise((resolve, reject) => {
        ws.binaryType = 'arraybuffer';
        let synced = false;

        ws.on('open', () => {
            console.log('WS Open');

            // Send initial sync
            const encoding = require('lib0/encoding');
            const syncProtocol = require('y-protocols/sync');
            const encoderSync = encoding.createEncoder();
            encoding.writeVarUint(encoderSync, 0); // MessageSync
            syncProtocol.writeSyncStep1(encoderSync, doc);
            ws.send(encoding.toUint8Array(encoderSync));
        });

        ws.on('message', (data) => {
            const decoding = require('lib0/decoding');
            const syncProtocol = require('y-protocols/sync');
            const encoding = require('lib0/encoding');

            const decoder = decoding.createDecoder(new Uint8Array(data));
            const messageType = decoding.readVarUint(decoder);

            if (messageType === 0) { // MessageSync
                const encoder = encoding.createEncoder();
                encoding.writeVarUint(encoder, 0);
                syncProtocol.readSyncMessage(decoder, encoder, doc, null);

                if (encoding.length(encoder) > 1) {
                    ws.send(encoding.toUint8Array(encoder));
                }

                if (!synced) {
                    synced = true;
                    console.log('Synced! Now typing...');

                    // Type some text
                    text.insert(0, 'Hello World from typing test!');
                    console.log('Typed:', text.toString());

                    // Wait a bit for the update to be sent and saved
                    setTimeout(() => {
                        console.log('Closing connection...');
                        ws.close();
                        resolve();
                    }, 2000);
                }
            }
        });

        ws.on('error', reject);
    });
}

async function verifyPersistence() {
    console.log('5. Verifying persistence (reconnecting)...');
    const doc = new Y.Doc();
    const ws = new WebSocket(`ws://localhost:3000/collab/${docSlug}`);

    return new Promise((resolve, reject) => {
        ws.binaryType = 'arraybuffer';

        ws.on('open', () => {
            console.log('Verify WS Open');
            const encoding = require('lib0/encoding');
            const syncProtocol = require('y-protocols/sync');
            const encoderSync = encoding.createEncoder();
            encoding.writeVarUint(encoderSync, 0);
            syncProtocol.writeSyncStep1(encoderSync, doc);
            ws.send(encoding.toUint8Array(encoderSync));
        });

        ws.on('message', (data) => {
            const decoding = require('lib0/decoding');
            const syncProtocol = require('y-protocols/sync');
            const encoding = require('lib0/encoding');

            const decoder = decoding.createDecoder(new Uint8Array(data));
            const messageType = decoding.readVarUint(decoder);

            if (messageType === 0) {
                const encoder = encoding.createEncoder();
                syncProtocol.readSyncMessage(decoder, encoder, doc, null);

                const text = doc.getText('monaco').toString();
                console.log('Received text:', text);

                setTimeout(() => {
                    ws.close();
                    if (text === 'Hello World from typing test!') {
                        console.log('SUCCESS: Content persisted!');
                        resolve();
                    } else {
                        console.log('FAIL: Content not persisted. Got:', text);
                        reject(new Error('Content not persisted'));
                    }
                }, 500);
            }
        });

        setTimeout(() => {
            ws.close();
            reject(new Error('Timeout waiting for sync'));
        }, 3000);
    });
}

async function test() {
    await registerAndLogin();
    await createDocument();
    await simulateTyping();
    await new Promise(r => setTimeout(r, 1000)); // Wait for server to save
    await verifyPersistence();
}

test().catch(console.error);
