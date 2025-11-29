import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../services/prisma';
import { createSession, deleteSession } from '../services/session.service';
import { AuthRequest } from '../middleware/auth.middleware';

const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'refresh-secret';
const TOKEN_TTL_SECONDS = 15 * 60; // 15 minutes
const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

const registerSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    displayName: z.string().min(2).max(50).optional()
});

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8)
});

export const register = async (req: Request, res: Response) => {
    console.log('Register request:', req.body);
    try {
        const payload = registerSchema.parse(req.body);
        const existing = await prisma.user.findUnique({ where: { email: payload.email.toLowerCase() } });

        if (existing) {
            return res.status(409).json({ error: 'Email already in use' });
        }

        const hashedPassword = await bcrypt.hash(payload.password, 12);
        const user = await prisma.user.create({
            data: {
                email: payload.email.toLowerCase(),
                password: hashedPassword,
                displayName: payload.displayName
            },
            select: {
                id: true,
                email: true,
                displayName: true,
                createdAt: true
            }
        });

        const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: TOKEN_TTL_SECONDS });
        const refreshToken = jwt.sign({ userId: user.id }, REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_TTL_SECONDS });

        await createSession(token, user.id, TOKEN_TTL_SECONDS);
        await prisma.refreshToken.create({
            data: {
                token: refreshToken,
                userId: user.id,
                expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000)
            }
        });

        res.status(201).json({ token, refreshToken, user });
    } catch (error: any) {
        console.error('Register error', error);
        const status = error.status || (error.name === 'ZodError' ? 400 : 500);
        res.status(status).json({ error: error.message ?? 'Registration failed' });
    }
};

export const login = async (req: Request, res: Response) => {
    console.log('Login request received:', req.body);
    try {
        const payload = loginSchema.parse(req.body);
        console.log('Payload parsed successfully');

        const user = await prisma.user.findUnique({ where: { email: payload.email.toLowerCase() } });
        console.log('User lookup result:', user ? 'Found' : 'Not Found');

        if (!user) {
            console.log('User not found, returning 401');
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        console.log('Comparing password...');
        const passwordMatch = await bcrypt.compare(payload.password, user.password);
        console.log('Password match:', passwordMatch);

        if (!passwordMatch) {
            console.log('Password mismatch, returning 401');
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        console.log('Generating tokens...');
        const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: TOKEN_TTL_SECONDS });
        const refreshToken = jwt.sign({ userId: user.id }, REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_TTL_SECONDS });

        await createSession(token, user.id, TOKEN_TTL_SECONDS);
        await prisma.refreshToken.create({
            data: {
                token: refreshToken,
                userId: user.id,
                expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000)
            }
        });
        console.log('Login successful, sending response');

        res.json({
            token,
            refreshToken,
            user: {
                id: user.id,
                email: user.email,
                displayName: user.displayName
            }
        });
    } catch (error: any) {
        console.error('Login error detailed:', error);
        const status = error.status || (error.name === 'ZodError' ? 400 : 500);
        res.status(status).json({ error: error.message ?? 'Login failed' });
    }
};

export const me = async (req: AuthRequest, res: Response) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { id: true, email: true, displayName: true, createdAt: true }
    });

    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
};

export const logout = async (req: AuthRequest, res: Response) => {
    const header = req.headers.authorization;
    const cookieToken = req.cookies?.token as string | undefined;
    const token = header?.startsWith('Bearer ') ? header.split(' ')[1] : cookieToken;

    if (!token) {
        return res.status(200).json({ message: 'Logged out' });
    }

    await deleteSession(token);

    // Delete all refresh tokens for this user
    if (req.user) {
        await prisma.refreshToken.deleteMany({ where: { userId: req.user.id } });
    }

    res.json({ message: 'Logged out' });
};

export const refresh = async (req: Request, res: Response) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(401).json({ error: 'Refresh token required' });
        }

        // Verify refresh token
        const decoded = jwt.verify(refreshToken, REFRESH_SECRET) as { userId: string };

        // Check if refresh token exists in database
        const storedToken = await prisma.refreshToken.findUnique({
            where: { token: refreshToken },
            include: { user: true }
        });

        if (!storedToken || storedToken.expiresAt < new Date()) {
            return res.status(401).json({ error: 'Invalid or expired refresh token' });
        }

        // Generate new access token
        const newToken = jwt.sign(
            { userId: storedToken.user.id, email: storedToken.user.email },
            JWT_SECRET,
            { expiresIn: TOKEN_TTL_SECONDS }
        );

        await createSession(newToken, storedToken.user.id, TOKEN_TTL_SECONDS);

        res.json({ token: newToken });
    } catch (error: any) {
        console.error('Refresh error', error);
        res.status(401).json({ error: 'Invalid refresh token' });
    }
};
