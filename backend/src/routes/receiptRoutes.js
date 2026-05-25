import express from 'express';
import multer from 'multer';
import { scanReceipt } from '../controllers/receiptController.js';
import { protect } from '../middleware/authMiddleware.js';
import { aiLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Multer memory storage configuration (keeps file in memory buffer for quick Gemini consumption)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB maximum file size limit
  }
});

router.post('/scan', protect, aiLimiter, upload.single('receipt'), scanReceipt);

export default router;
