const axios = require('axios');

const API_URL = 'http://localhost:3000/api';

async function testRateLimit() {
    console.log('--- Testing Rate Limiting ---');

    const email = 'test@example.com';
    const password = 'password';

    let successCount = 0;
    let blockedCount = 0;

    console.log('Sending 15 login requests (Limit is 10/min)...');

    for (let i = 0; i < 15; i++) {
        try {
            await axios.post(`${API_URL}/auth/login`, { email, password });
            successCount++;
            process.stdout.write('.');
        } catch (error) {
            if (error.response && error.response.status === 429) {
                blockedCount++;
                process.stdout.write('X');
            } else {
                // Ignore other errors (like invalid credentials) as long as it's not 429
                if (error.response && error.response.status !== 429) {
                    successCount++;
                    process.stdout.write('.');
                } else {
                    console.error('Unexpected error:', error.message);
                }
            }
        }
    }

    console.log('\n');
    console.log(`Success/Allowed: ${successCount}`);
    console.log(`Blocked (429): ${blockedCount}`);

    if (blockedCount > 0) {
        console.log('✅ Rate limiting is working!');
    } else {
        console.error('❌ Rate limiting failed: No requests were blocked.');
    }
}

testRateLimit();
