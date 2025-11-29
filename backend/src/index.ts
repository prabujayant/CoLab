import 'dotenv/config';
import http from 'http';
import app from './app';
import { initializeCollaborationServer } from './services/collaboration.service';
import { disconnectRedis, initRedis } from './services/redis.service';
import { prisma } from './services/prisma';


const PORT = Number(process.env.PORT) || 3000;
const server = http.createServer(app);

async function bootstrap() {
    try {
        await initRedis();
        await prisma.$connect();

        initializeCollaborationServer(server);

        server.listen(PORT, () => {
            console.log(`API server running on http://localhost:${PORT}`);
        });

    } catch (error) {
        console.error('Failed to start server', error);
        process.exit(1);
    }
}

bootstrap();

const shutdown = async () => {
    console.log('Gracefully shutting down...');
    server.close();
    await disconnectRedis();
    await prisma.$disconnect();
    process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
