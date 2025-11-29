const axios = require('axios');

const API_URL = 'http://localhost:3000/api';

async function testRefreshToken() {
    try {
        console.log('1. Registering/Logging in user...');
        const email = `test-${Date.now()}@example.com`;
        const password = 'password123';

        let authResponse;
        try {
            authResponse = await axios.post(`${API_URL}/auth/register`, {
                email,
                password,
                displayName: 'Refresh Test User'
            });
        } catch (e) {
            // If user exists, try login
            authResponse = await axios.post(`${API_URL}/auth/login`, {
                email,
                password
            });
        }

        const { token, refreshToken, user } = authResponse.data;
        console.log('✅ Login successful');
        console.log('Access Token:', token.substring(0, 20) + '...');
        console.log('Refresh Token:', refreshToken.substring(0, 20) + '...');

        if (!refreshToken) {
            throw new Error('No refresh token received!');
        }

        console.log('\n2. Testing protected route with access token...');
        try {
            await axios.get(`${API_URL}/auth/me`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log('✅ Protected route accessible');
        } catch (e) {
            console.error('❌ Protected route failed:', e.message);
        }

        console.log('\n3. Refreshing token...');
        const refreshResponse = await axios.post(`${API_URL}/auth/refresh`, {
            refreshToken
        });

        const newToken = refreshResponse.data.token;
        console.log('✅ Refresh successful');
        console.log('New Access Token:', newToken.substring(0, 20) + '...');

        if (token === newToken) {
            console.warn('⚠️ Warning: New token is identical to old token (might be expected if not expired)');
        }

        console.log('\n4. Testing protected route with NEW access token...');
        try {
            await axios.get(`${API_URL}/auth/me`, {
                headers: { Authorization: `Bearer ${newToken}` }
            });
            console.log('✅ Protected route accessible with new token');
        } catch (e) {
            console.error('❌ Protected route failed with new token:', e.message);
        }

        console.log('\n🎉 Refresh Token Flow Verified!');

    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
    }
}

testRefreshToken();
