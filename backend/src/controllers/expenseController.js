import crypto from 'crypto';
import { getDbConnection } from '../config/db.js';
import { categorizeExpense } from '../services/geminiService.js';

export async function addExpense(req, res, next) {
  try {
    const { amount, category, description, merchant, paymentMethod, transactionDate, receiptImageUrl } = req.body;
    const userId = req.user.id;

    if (!amount || !transactionDate) {
      return res.status(400).json({ error: 'Amount and transaction date are required' });
    }

    const db = await getDbConnection();

    // 1. Duplicate detection
    const isDuplicate = await db.get(
      `SELECT id FROM expenses 
       WHERE user_id = ? AND amount = ? AND merchant = ? AND transaction_date = ? LIMIT 1`,
      [userId, parseFloat(amount), merchant || '', transactionDate]
    );

    // 2. Smart categorization using Gemini
    let finalCategory = category || 'Other';
    let tags = [];

    if (!category || category === 'Other' || category === '') {
      try {
        const aiResult = await categorizeExpense(merchant || '', description || '', amount);
        finalCategory = aiResult.category;
        tags = aiResult.tags;
      } catch (err) {
        console.error('Failed to auto-categorize:', err.message);
      }
    }

    const expenseId = crypto.randomUUID();
    const parsedAmount = parseFloat(amount);

    await db.run(
      `INSERT INTO expenses (id, user_id, amount, category, description, merchant, payment_method, transaction_date, receipt_image_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        expenseId,
        userId,
        parsedAmount,
        finalCategory,
        description || '',
        merchant || 'Unknown',
        paymentMethod || 'Cash',
        transactionDate,
        receiptImageUrl || ''
      ]
    );

    // Retrieve full inserted item
    const newExpense = await db.get('SELECT * FROM expenses WHERE id = ?', [expenseId]);

    return res.status(201).json({
      message: 'Expense recorded successfully',
      expense: {
        id: newExpense.id,
        userId: newExpense.user_id,
        amount: newExpense.amount,
        category: newExpense.category,
        description: newExpense.description,
        merchant: newExpense.merchant,
        paymentMethod: newExpense.payment_method,
        transactionDate: newExpense.transaction_date,
        receiptImageUrl: newExpense.receipt_image_url,
        createdAt: newExpense.created_at
      },
      aiSuggestions: {
        categoryAutoSelected: !category,
        tags,
        detectedDuplicate: !!isDuplicate
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function getExpenses(req, res, next) {
  try {
    const userId = req.user.id;
    const { category, paymentMethod, startDate, endDate, search, limit = 50, offset = 0 } = req.query;

    const db = await getDbConnection();

    let query = `SELECT * FROM expenses WHERE user_id = ?`;
    const params = [userId];

    if (category) {
      query += ` AND category = ?`;
      params.push(category);
    }

    if (paymentMethod) {
      query += ` AND payment_method = ?`;
      params.push(paymentMethod);
    }

    if (startDate) {
      query += ` AND transaction_date >= ?`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND transaction_date <= ?`;
      params.push(endDate);
    }

    if (search) {
      query += ` AND (description LIKE ? OR merchant LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY transaction_date DESC, created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const expenses = await db.all(query, params);

    // Get total count for pagination
    let countQuery = `SELECT COUNT(*) as count FROM expenses WHERE user_id = ?`;
    const countParams = [userId];

    if (category) {
      countQuery += ` AND category = ?`;
      countParams.push(category);
    }
    if (paymentMethod) {
      countQuery += ` AND payment_method = ?`;
      countParams.push(paymentMethod);
    }
    if (startDate) {
      countQuery += ` AND transaction_date >= ?`;
      countParams.push(startDate);
    }
    if (endDate) {
      countQuery += ` AND transaction_date <= ?`;
      countParams.push(endDate);
    }
    if (search) {
      countQuery += ` AND (description LIKE ? OR merchant LIKE ?)`;
      countParams.push(`%${search}%`, `%${search}%`);
    }

    const countResult = await db.get(countQuery, countParams);

    const formattedExpenses = expenses.map(e => ({
      id: e.id,
      userId: e.user_id,
      amount: e.amount,
      category: e.category,
      description: e.description,
      merchant: e.merchant,
      paymentMethod: e.payment_method,
      transactionDate: e.transaction_date,
      receiptImageUrl: e.receipt_image_url,
      createdAt: e.created_at
    }));

    return res.status(200).json({
      expenses: formattedExpenses,
      pagination: {
        total: countResult.count,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function editExpense(req, res, next) {
  try {
    const { id } = req.params;
    const { amount, category, description, merchant, paymentMethod, transactionDate, receiptImageUrl } = req.body;
    const userId = req.user.id;

    const db = await getDbConnection();

    // Verify ownership
    const expense = await db.get('SELECT * FROM expenses WHERE id = ? AND user_id = ?', [id, userId]);
    if (!expense) {
      return res.status(404).json({ error: 'Expense not found or access denied' });
    }

    const newAmount = amount !== undefined ? parseFloat(amount) : expense.amount;
    const newCategory = category !== undefined ? category : expense.category;
    const newDesc = description !== undefined ? description : expense.description;
    const newMerchant = merchant !== undefined ? merchant : expense.merchant;
    const newPayment = paymentMethod !== undefined ? paymentMethod : expense.payment_method;
    const newDate = transactionDate !== undefined ? transactionDate : expense.transaction_date;
    const newUrl = receiptImageUrl !== undefined ? receiptImageUrl : expense.receipt_image_url;

    await db.run(
      `UPDATE expenses 
       SET amount = ?, category = ?, description = ?, merchant = ?, payment_method = ?, transaction_date = ?, receipt_image_url = ?
       WHERE id = ?`,
      [newAmount, newCategory, newDesc, newMerchant, newPayment, newDate, newUrl, id]
    );

    const updatedExpense = await db.get('SELECT * FROM expenses WHERE id = ?', [id]);

    return res.status(200).json({
      message: 'Expense updated successfully',
      expense: {
        id: updatedExpense.id,
        userId: updatedExpense.user_id,
        amount: updatedExpense.amount,
        category: updatedExpense.category,
        description: updatedExpense.description,
        merchant: updatedExpense.merchant,
        paymentMethod: updatedExpense.payment_method,
        transactionDate: updatedExpense.transaction_date,
        receiptImageUrl: updatedExpense.receipt_image_url,
        createdAt: updatedExpense.created_at
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteExpense(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const db = await getDbConnection();

    // Verify ownership
    const expense = await db.get('SELECT * FROM expenses WHERE id = ? AND user_id = ?', [id, userId]);
    if (!expense) {
      return res.status(404).json({ error: 'Expense not found or access denied' });
    }

    await db.run('DELETE FROM expenses WHERE id = ?', [id]);

    return res.status(200).json({ message: 'Expense deleted successfully', id });
  } catch (error) {
    next(error);
  }
}

export async function exportExpensesCsv(req, res, next) {
  try {
    const userId = req.user.id;
    const db = await getDbConnection();

    const expenses = await db.all(
      'SELECT amount, category, merchant, description, payment_method, transaction_date, created_at FROM expenses WHERE user_id = ? ORDER BY transaction_date DESC',
      [userId]
    );

    // Construct CSV
    const headers = ['Amount', 'Category', 'Merchant', 'Description', 'Payment Method', 'Transaction Date', 'Created At'];
    let csvContent = headers.join(',') + '\n';

    expenses.forEach(e => {
      const row = [
        e.amount,
        `"${(e.category || '').replace(/"/g, '""')}"`,
        `"${(e.merchant || '').replace(/"/g, '""')}"`,
        `"${(e.description || '').replace(/"/g, '""')}"`,
        `"${(e.payment_method || '').replace(/"/g, '""')}"`,
        e.transaction_date,
        e.created_at
      ];
      csvContent += row.join(',') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="expenses_export.csv"');
    return res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
}
