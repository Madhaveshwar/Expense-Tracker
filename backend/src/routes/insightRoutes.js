import express from 'express';
import { getDashboardStats, getAiInsights, getAiForecast, setCategoryBudget } from '../controllers/insightController.js';
import { protect } from '../middleware/authMiddleware.js';
import { aiLimiter, apiLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.use(protect);

router.get('/dashboard', getDashboardStats);
router.get('/insights', aiLimiter, getAiInsights);
router.get('/forecast', aiLimiter, getAiForecast);
router.post('/budget', apiLimiter, setCategoryBudget);

export default router;
