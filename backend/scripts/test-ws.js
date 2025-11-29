const WebSocket = require('ws');
const Y = require('yjs');
const { Awareness } = require('y-protocols/awareness');

const doc = new Y.Doc();
const awareness = new Awareness(doc);

const ws = new WebSocket('ws://localhost:3000/collab/document-test');

ws.on('open', () => {
    console.log('Connected to WS');

    // Send awareness update
    awareness.setLocalState({ user: { name: 'Test User' } });
});

ws.on('message', (data) => {
    console.log('Received message:', data.length);
});

ws.on('error', (err) => {
    console.error('WS Error:', err);
});

ws.on('close', () => {
    console.log('WS Closed');
});

setTimeout(() => {
    console.log('Closing...');
    ws.close();
}, 5000);
