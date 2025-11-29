const WebSocket = require('ws');
const Y = require('yjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const ws = new WebSocket('ws://localhost:3000/test-event-sourcing');

ws.on('open', async () => {
    console.log('WebSocket connected');

    // Ensure user exists
    try {
        // We need to use a unique email or check if it exists
        const user = await prisma.user.upsert({
            where: { email: 'test@example.com' },
            update: {},
            create: {
                email: 'test@example.com',
                password: 'password'
            }
        });
        console.log('User ensured:', user.id);
    } catch (e) {
        console.error('Error creating user:', e);
    }

    // Create a Yjs update
    const doc = new Y.Doc();
    doc.getText('monaco').insert(0, 'Hello Event Sourcing');
    const update = Y.encodeStateAsUpdate(doc);

    // Send update
    ws.send(update);
    console.log('Update sent');

    // Wait for persistence
    setTimeout(async () => {
        try {
            // Check database
            const events = await prisma.event.findMany({
                include: { document: true }
            });

            console.log(`Found ${events.length} events.`);
            const myEvent = events.find(e => e.document.name === 'test-event-sourcing');

            if (myEvent) {
                console.log('SUCCESS: Event found for document test-event-sourcing');
            } else {
                console.log('FAILURE: No event found for document test-event-sourcing');
            }
        } catch (e) {
            console.error('Error checking database:', e);
        } finally {
            await prisma.$disconnect();
            ws.close();
            process.exit(0);
        }
    }, 2000);
});

ws.on('error', (err) => {
    console.error('WebSocket error:', err);
    process.exit(1);
});
