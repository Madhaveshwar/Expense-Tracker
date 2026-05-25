import express from 'express';
import { addExpense, getExpenses, editExpense, deleteExpense, exportExpensesCsv } from '../controllers/expenseController.js';
import { protect } from '../middleware/authMiddleware.js';
import { apiLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.use(protect);

router.post('/', apiLimiter, addExpense);
router.get('/', getExpenses);
router.put('/:id', apiLimiter, editExpense);
router.delete('/:id', deleteExpense);
router.get('/export/csv', exportExpensesCsv);

export default router;
