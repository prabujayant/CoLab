import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth.middleware';
import { prisma } from '../services/prisma';
import { generateSlug } from '../utils/slug';

const createDocumentSchema = z.object({
    title: z.string().min(1).max(120).optional()
});

export const listDocuments = async (req: AuthRequest, res: Response) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const documents = await prisma.document.findMany({
        where: {
            OR: [
                { ownerId: req.user.id },
                { userActivities: { some: { userId: req.user.id } } }
            ]
        },
        orderBy: { updatedAt: 'desc' },
        select: {
            id: true,
            title: true,
            slug: true,
            updatedAt: true,
            createdAt: true
        }
    });

    res.json({ documents });
};

export const createDocument = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const payload = createDocumentSchema.parse(req.body ?? {});
        const title = payload.title ?? 'Untitled Document';
        const slug = generateSlug(title);

        const document = await prisma.document.create({
            data: {
                title,
                slug,
                ownerId: req.user.id
            },
            select: {
                id: true,
                title: true,
                slug: true,
                createdAt: true,
                updatedAt: true
            }
        });

        res.status(201).json({ document });
    } catch (error: any) {
        const status = error.status || (error.name === 'ZodError' ? 400 : 500);
        res.status(status).json({ error: error.message ?? 'Failed to create document' });
    }
};

export const getDocument = async (req: AuthRequest, res: Response) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { slug } = req.params;
    const document = await prisma.document.findUnique({
        where: { slug },
        select: {
            id: true,
            title: true,
            slug: true,
            createdAt: true,
            updatedAt: true
        }
    });

    if (!document) {
        return res.status(404).json({ error: 'Document not found' });
    }

    // Record visit
    try {
        await prisma.userActivity.upsert({
            where: {
                userId_documentId: {
                    userId: req.user.id,
                    documentId: document.id
                }
            },
            create: {
                userId: req.user.id,
                documentId: document.id,
                lastVisit: new Date()
            },
            update: {
                lastVisit: new Date()
            }
        });
    } catch (error) {
        console.error('Failed to record document visit', error);
        // Don't fail the request if tracking fails
    }

    res.json({ document });
};

export const updateDocument = async (req: AuthRequest, res: Response) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { slug } = req.params;
    const payload = createDocumentSchema.parse(req.body);

    try {
        const document = await prisma.document.update({
            where: {
                slug,
                ownerId: req.user.id
            },
            data: {
                title: payload.title
            },
            select: {
                id: true,
                title: true,
                slug: true,
                updatedAt: true
            }
        });

        res.json({ document });
    } catch (error) {
        res.status(404).json({ error: 'Document not found' });
    }
};

export const deleteDocument = async (req: AuthRequest, res: Response) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { slug } = req.params;

    try {
        await prisma.document.delete({
            where: {
                slug,
                ownerId: req.user.id
            }
        });

        res.status(204).send();
    } catch (error) {
        res.status(404).json({ error: 'Document not found' });
    }
};

export const getDocumentHistory = async (req: AuthRequest, res: Response) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { slug } = req.params;

    try {
        const document = await prisma.document.findUnique({
            where: { slug },
            select: { id: true, content: true, updatedAt: true }
        });

        if (!document) {
            return res.status(404).json({ error: 'Document not found' });
        }

        // Get snapshots (documents with content saved)
        const snapshots = [];

        // Add current version
        if (document.content) {
            snapshots.push({
                id: 'current',
                timestamp: document.updatedAt,
                size: document.content.length
            });
        }

        res.json({ snapshots });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch history' });
    }
};

export const getSnapshot = async (req: AuthRequest, res: Response) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { slug, snapshotId } = req.params;
    const zlib = await import('zlib');
    const { promisify } = await import('util');
    const gunzip = promisify(zlib.gunzip);
    const Y = await import('yjs');

    try {
        const document = await prisma.document.findUnique({
            where: { slug },
            select: { content: true }
        });

        if (!document || !document.content) {
            return res.status(404).json({ error: 'Snapshot not found' });
        }

        // Decompress and load into Y.js document
        const decompressed = await gunzip(document.content);
        const ydoc = new Y.Doc();
        Y.applyUpdate(ydoc, decompressed);

        // Extract text content
        const ytext = ydoc.getText('monaco');
        const content = ytext.toString();

        res.json({ content });
    } catch (error) {
        console.error('Failed to fetch snapshot:', error);
        res.status(500).json({ error: 'Failed to fetch snapshot' });
    }
};

export const restoreSnapshot = async (req: AuthRequest, res: Response) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { slug, snapshotId } = req.params;

    try {
        const document = await prisma.document.findUnique({
            where: { slug },
            select: { id: true, content: true }
        });

        if (!document) {
            return res.status(404).json({ error: 'Document not found' });
        }

        // For now, just return success - actual restore happens via Y.js on frontend
        res.json({ success: true, message: 'Snapshot content retrieved' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to restore snapshot' });
    }
};

export const trackVisit = async (req: AuthRequest, res: Response) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { slug } = req.params;

    try {
        const document = await prisma.document.findUnique({
            where: { slug },
            select: { id: true }
        });

        if (!document) {
            return res.status(404).json({ error: 'Document not found' });
        }

        // Upsert user activity
        await prisma.userActivity.upsert({
            where: {
                userId_documentId: {
                    userId: req.user.id,
                    documentId: document.id
                }
            },
            create: {
                userId: req.user.id,
                documentId: document.id,
                lastVisit: new Date()
            },
            update: {
                lastVisit: new Date()
            }
        });

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to track visit' });
    }
};
