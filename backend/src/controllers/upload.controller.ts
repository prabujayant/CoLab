import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { prisma } from '../services/prisma';
import multer from 'multer';

// Configure multer to store in memory (we'll save to DB)
const storage = multer.memoryStorage();
export const uploadMiddleware = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

export const uploadFile = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const file = await prisma.fileAttachment.create({
            data: {
                filename: req.file.originalname,
                mimeType: req.file.mimetype,
                size: req.file.size,
                data: req.file.buffer as any,
                uploaderId: req.user?.id
            },
            select: {
                id: true,
                filename: true,
                mimeType: true,
                size: true,
                createdAt: true
            }
        });

        res.status(201).json({ file });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Failed to upload file' });
    }
};

export const getFile = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    try {
        const file = await prisma.fileAttachment.findUnique({
            where: { id }
        });

        if (!file) {
            return res.status(404).json({ error: 'File not found' });
        }

        res.setHeader('Content-Type', file.mimeType);
        res.setHeader('Content-Disposition', `inline; filename="${file.filename}"`);
        res.send(file.data);
    } catch (error) {
        console.error('File retrieval error:', error);
        res.status(500).json({ error: 'Failed to retrieve file' });
    }
};
