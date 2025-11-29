const Redis = require('ioredis');
const WebSocket = require('ws');

const redis = new Redis('redis://localhost:6379');
const ws = new WebSocket('ws://localhost:3000/test-doc');

redis.subscribe('yjs-update', (err, count) => {
    if (err) console.error('Redis subscribe error:', err);
    else console.log(`Subscribed to ${count} channel(s). Waiting for updates...`);
});

redis.on('message', (channel, message) => {
    console.log(`Received message from ${channel}:`, message);
    process.exit(0);
});

ws.on('open', () => {
    console.log('WebSocket connected');
    setTimeout(() => {
        console.log('Timeout waiting for message. Exiting.');
        process.exit(0);
    }, 5000);
});
