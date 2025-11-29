const WebSocket = require('ws');
const axios = require('axios');

const WS_URL = 'ws://localhost:3000';
const API_URL = 'http://localhost:3000/api';

async function testWebSocketAuth() {
    console.log('--- Testing WebSocket Security ---');

    // 1. Test connection without token
    console.log('\n1. Testing connection WITHOUT token...');
    await new Promise((resolve) => {
        const ws = new WebSocket(`${WS_URL}/collab/test-doc`);
        ws.on('open', () => {
            console.error('❌ Connection opened unexpectedly (should have failed)');
            ws.close();
            resolve();
        });
        ws.on('error', (err) => {
            console.log('✅ Connection failed as expected:', err.message);
            resolve();
        });
    });

    // 2. Test connection with invalid token
    console.log('\n2. Testing connection with INVALID token...');
    await new Promise((resolve) => {
        const ws = new WebSocket(`${WS_URL}/collab/test-doc?token=invalid-token`);
        ws.on('open', () => {
            console.error('❌ Connection opened unexpectedly (should have failed)');
            ws.close();
            resolve();
        });
        ws.on('error', (err) => {
            console.log('✅ Connection failed as expected:', err.message);
            resolve();
        });
    });

    // 3. Test connection with valid token
    console.log('\n3. Testing connection with VALID token...');
    try {
        // Register/Login to get token
        const email = `ws-test-${Date.now()}@example.com`;
        const password = 'password123';
        let authResponse;
        try {
            authResponse = await axios.post(`${API_URL}/auth/register`, { email, password });
        } catch (e) {
            authResponse = await axios.post(`${API_URL}/auth/login`, { email, password });
        }
        const token = authResponse.data.token;
        console.log('Got valid token:', token.substring(0, 20) + '...');

        await new Promise((resolve, reject) => {
            const ws = new WebSocket(`${WS_URL}/collab/test-doc?token=${token}`);
            ws.on('open', () => {
                console.log('✅ Connection opened successfully with valid token');
                ws.close();
                resolve();
            });
            ws.on('error', (err) => {
                console.error('❌ Connection failed with valid token:', err.message);
                reject(err);
            });
        });

    } catch (error) {
        console.error('❌ Failed to get valid token:', error.message);
    }

    console.log('\n--- Test Complete ---');
}

testWebSocketAuth();
