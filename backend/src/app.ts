import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.routes';
import documentRoutes from './routes/document.routes';
import { authenticateToken } from './middleware/auth.middleware';

import { metricsService } from './services/metrics.service';
import logger from './utils/logger';

const app = express();

app.use(helmet());
app.set('trust proxy', 1); // Enable if behind reverse proxy (Heroku, etc)
app.use(
    cors({
        origin: (origin, callback) => {
            // Allow requests with no origin (like mobile apps or curl requests)
            if (!origin) return callback(null, true);

            // Allow localhost
            if (origin.includes('localhost')) return callback(null, true);

            // Allow Render domains
            if (origin.endsWith('.onrender.com')) return callback(null, true);

            // Fallback: allow all for this demo
            return callback(null, true);
        },
        credentials: true
    })
);
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// Request logging middleware
app.use((req, res, next) => {
    metricsService.incrementHttpRequests();
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info('HTTP Request', {
            method: req.method,
            url: req.url,
            status: res.statusCode,
            duration,
            userAgent: req.get('user-agent'),
            ip: req.ip
        });
    });
    next();
});

app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/metrics', authenticateToken, (req, res) => {
    // In a real app, restrict this to admin users
    res.json(metricsService.getMetrics());
});

import path from 'path';
import uploadRoutes from './routes/upload.routes';

// ...

app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));
app.use('/api/auth', authRoutes);
app.use('/api/upload', authenticateToken, uploadRoutes);
app.use('/api/documents', authenticateToken, documentRoutes);

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

export default app;
