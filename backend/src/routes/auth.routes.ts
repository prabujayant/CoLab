import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { login, logout, me, register, refresh } from '../controllers/auth.controller';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', authenticateToken, logout);
router.post('/refresh', refresh);
router.get('/me', authenticateToken, me);

export default router;
