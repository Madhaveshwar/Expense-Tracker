import express from 'express';
import { signUp, logIn, getMe, updateMe } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.post('/signup', authLimiter, signUp);
router.post('/login', authLimiter, logIn);
router.get('/me', protect, getMe);
router.put('/me', protect, updateMe);

export default router;
