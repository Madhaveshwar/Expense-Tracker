import crypto from 'crypto';
import { getDbConnection } from '../config/db.js';
import { generateFinancialInsights, forecastBudget } from '../services/geminiService.js';

export async function getDashboardStats(req, res, next) {
  try {
    const userId = req.user.id;
    const db = await getDbConnection();

    // 1. Get user configuration
    const user = await db.get(
      'SELECT monthly_budget, currency_preference FROM users WHERE id = ?',
      [userId]
    );

    if (!user) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    const monthlyBudget = user.monthly_budget || 0;
    const currency = user.currency_preference || 'USD';

    // Get current month date bounds (YYYY-MM-DD)
    const now = new Date();
    const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

    // 2. Total spent this month
    const spentRow = await db.get(
      `SELECT SUM(amount) as total FROM expenses 
       WHERE user_id = ? AND transaction_date >= ?`,
      [userId, startOfMonth]
    );
    const totalSpent = spentRow.total || 0;

    // 3. Category-wise totals
    const categoryTotals = await db.all(
      `SELECT category, SUM(amount) as amount FROM expenses 
       WHERE user_id = ? AND transaction_date >= ? 
       GROUP BY category ORDER BY amount DESC`,
      [userId, startOfMonth]
    );

    // 4. Budget limit definitions per category
    const budgets = await db.all(
      `SELECT category, limit_amount as limitAmount FROM budgets WHERE user_id = ?`,
      [userId]
    );

    // 5. Daily spending trends (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);
    const dateLimit = thirtyDaysAgo.toISOString().split('T')[0];

    const trends = await db.all(
      `SELECT transaction_date as date, SUM(amount) as amount FROM expenses 
       WHERE user_id = ? AND transaction_date >= ? 
       GROUP BY transaction_date ORDER BY transaction_date ASC`,
      [userId, dateLimit]
    );

    // 6. Recent transactions (last 5)
    const recent = await db.all(
      `SELECT id, amount, category, description, merchant, payment_method as paymentMethod, transaction_date as transactionDate, created_at 
       FROM expenses WHERE user_id = ? 
       ORDER BY transaction_date DESC, created_at DESC LIMIT 5`,
      [userId]
    );

    return res.status(200).json({
      monthlyBudget,
      totalSpent,
      currency,
      categoryTotals,
      budgets,
      trends,
      recent
    });
  } catch (error) {
    next(error);
  }
}

export async function getAiInsights(req, res, next) {
  try {
    const userId = req.user.id;
    const db = await getDbConnection();

    const user = await db.get('SELECT monthly_budget, currency_preference FROM users WHERE id = ?', [userId]);
    const expenses = await db.all('SELECT * FROM expenses WHERE user_id = ?', [userId]);
    const budgets = await db.all('SELECT category, limit_amount FROM budgets WHERE user_id = ?', [userId]);

    // Call Gemini Insights generator
    const analysis = await generateFinancialInsights(user, expenses, budgets);

    // Save insight logs in DB for record-keeping
    const insightId = crypto.randomUUID();
    await db.run(
      `INSERT INTO ai_insights (id, user_id, type, content) VALUES (?, ?, ?, ?)`,
      [insightId, userId, 'spending', JSON.stringify(analysis)]
    );

    return res.status(200).json(analysis);
  } catch (error) {
    next(error);
  }
}

export async function getAiForecast(req, res, next) {
  try {
    const userId = req.user.id;
    const db = await getDbConnection();

    const user = await db.get('SELECT monthly_budget FROM users WHERE id = ?', [userId]);
    const expenses = await db.all('SELECT amount, category, transaction_date FROM expenses WHERE user_id = ?', [userId]);

    const forecast = await forecastBudget(expenses, user.monthly_budget || 2000);

    return res.status(200).json(forecast);
  } catch (error) {
    next(error);
  }
}

export async function setCategoryBudget(req, res, next) {
  try {
    const { category, limitAmount } = req.body;
    const userId = req.user.id;

    if (!category || limitAmount === undefined) {
      return res.status(400).json({ error: 'Category and limitAmount are required' });
    }

    const parsedLimit = parseFloat(limitAmount);
    if (isNaN(parsedLimit) || parsedLimit < 0) {
      return res.status(400).json({ error: 'Limit amount must be a positive number' });
    }

    const db = await getDbConnection();
    const budgetId = crypto.randomUUID();

    // Use SQL UPSERT syntax standard in SQLite 3.24+
    await db.run(
      `INSERT INTO budgets (id, user_id, category, limit_amount) 
       VALUES (?, ?, ?, ?)
       ON CONFLICT(user_id, category) 
       DO UPDATE SET limit_amount = excluded.limit_amount`,
      [budgetId, userId, category, parsedLimit]
    );

    return res.status(200).json({
      message: `Budget for "${category}" set to $${parsedLimit.toFixed(2)} successfully.`,
      budget: {
        category,
        limitAmount: parsedLimit
      }
    });
  } catch (error) {
    next(error);
  }
}
