import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { getSessionUserId } from '../services/session.service';

export interface AuthRequest extends Request {
    user?: {
        id: string;
        email: string;
    };
}

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const header = req.headers.authorization;
        const cookieToken = req.cookies?.token as string | undefined;
        const token = header?.startsWith('Bearer ') ? header.split(' ')[1] : cookieToken;

        if (!token) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string; exp: number };
        const sessionUserId = await getSessionUserId(token);

        if (!sessionUserId || sessionUserId !== decoded.userId) {
            return res.status(401).json({ error: 'Session expired' });
        }

        req.user = {
            id: decoded.userId,
            email: decoded.email
        };

        next();
    } catch (error) {
        console.error('Auth error:', error);
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};
