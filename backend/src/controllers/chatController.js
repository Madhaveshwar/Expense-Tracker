import crypto from 'crypto';
import { getDbConnection } from '../config/db.js';
import { chatWithAssistant } from '../services/geminiService.js';

export async function sendMessage(req, res, next) {
  try {
    const { message } = req.body;
    const userId = req.user.id;

    if (!message || message.trim() === '') {
      return res.status(400).json({ error: 'Message content cannot be empty' });
    }

    const db = await getDbConnection();

    // 1. Fetch user budget profile
    const user = await db.get('SELECT monthly_budget FROM users WHERE id = ?', [userId]);
    const userBudget = user ? user.monthly_budget : 2000;

    // 2. Fetch last 15 messages from persistent chat history for context
    const chatLogs = await db.all(
      `SELECT role, content FROM chat_history 
       WHERE user_id = ? 
       ORDER BY created_at ASC LIMIT 15`,
      [userId]
    );

    // 3. Fetch all expenses for this user to pass as live analytical context
    const expenses = await db.all(
      `SELECT amount, category, merchant, description, transaction_date 
       FROM expenses WHERE user_id = ? 
       ORDER BY transaction_date DESC`,
      [userId]
    );

    // 4. Save User's query message to database
    const userMsgId = crypto.randomUUID();
    await db.run(
      `INSERT INTO chat_history (id, user_id, role, content) VALUES (?, ?, ?, ?)`,
      [userMsgId, userId, 'user', message.trim()]
    );

    // 5. Send context + query to Gemini AI Assistant
    const aiResponseText = await chatWithAssistant(
      message.trim(),
      chatLogs,
      expenses,
      userBudget
    );

    // 6. Save AI's response message to database
    const aiMsgId = crypto.randomUUID();
    await db.run(
      `INSERT INTO chat_history (id, user_id, role, content) VALUES (?, ?, ?, ?)`,
      [aiMsgId, userId, 'assistant', aiResponseText]
    );

    return res.status(200).json({
      query: message.trim(),
      reply: aiResponseText
    });
  } catch (error) {
    next(error);
  }
}

export async function getChatHistory(req, res, next) {
  try {
    const userId = req.user.id;
    const db = await getDbConnection();

    const history = await db.all(
      `SELECT id, role, content, created_at as createdAt FROM chat_history 
       WHERE user_id = ? 
       ORDER BY created_at ASC`,
      [userId]
    );

    return res.status(200).json({
      history: history.map(h => ({
        id: h.id,
        role: h.role,
        content: h.content,
        createdAt: h.createdAt
      }))
    });
  } catch (error) {
    next(error);
  }
}

export async function clearChatHistory(req, res, next) {
  try {
    const userId = req.user.id;
    const db = await getDbConnection();

    await db.run('DELETE FROM chat_history WHERE user_id = ?', [userId]);

    return res.status(200).json({ message: 'Chat history cleared successfully' });
  } catch (error) {
    next(error);
  }
}
