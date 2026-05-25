import express from 'express';
import { sendMessage, getChatHistory, clearChatHistory } from '../controllers/chatController.js';
import { protect } from '../middleware/authMiddleware.js';
import { aiLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.use(protect);

router.post('/message', aiLimiter, sendMessage);
router.get('/history', getChatHistory);
router.delete('/history', clearChatHistory);

export default router;
