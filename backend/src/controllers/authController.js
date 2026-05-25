import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { getDbConnection } from '../config/db.js';

// Helper to sign JWT
const signToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET || 'super_secure_development_secret_key_13579',
    { expiresIn: '30d' }
  );
};

export async function signUp(req, res, next) {
  try {
    const { name, email, password, currencyPreference, monthlyBudget } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Please provide all required fields (name, email, password)' });
    }

    const db = await getDbConnection();

    // Check if user already exists
    const existingUser = await db.get('SELECT * FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    if (existingUser) {
      return res.status(400).json({ error: 'A user with this email already exists' });
    }

    // Hash password
    const salt = await bcryptjs.genSalt(10);
    const hashedPassword = await bcryptjs.hash(password, salt);

    const userId = crypto.randomUUID();
    const currency = currencyPreference || 'USD';
    const budget = monthlyBudget ? parseFloat(monthlyBudget) : 2000.00;

    // Insert user
    await db.run(
      `INSERT INTO users (id, name, email, password, currency_preference, monthly_budget) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, name.trim(), email.toLowerCase().trim(), hashedPassword, currency, budget]
    );

    // Get created user details (exclude password)
    const user = {
      id: userId,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      currencyPreference: currency,
      monthlyBudget: budget
    };

    const token = signToken(userId);

    return res.status(201).json({
      user,
      token
    });
  } catch (error) {
    next(error);
  }
}

export async function logIn(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Please provide email and password' });
    }

    const db = await getDbConnection();

    // Check if user exists
    const user = await db.get('SELECT * FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Verify password
    const isMatch = await bcryptjs.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = signToken(user.id);

    return res.status(200).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        currencyPreference: user.currency_preference,
        monthlyBudget: user.monthly_budget,
        createdAt: user.created_at
      },
      token
    });
  } catch (error) {
    next(error);
  }
}

export async function getMe(req, res, next) {
  try {
    const db = await getDbConnection();
    const user = await db.get(
      'SELECT id, name, email, currency_preference, monthly_budget, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json({
      id: user.id,
      name: user.name,
      email: user.email,
      currencyPreference: user.currency_preference,
      monthlyBudget: user.monthly_budget,
      createdAt: user.created_at
    });
  } catch (error) {
    next(error);
  }
}

export async function updateMe(req, res, next) {
  try {
    const { name, currencyPreference, monthlyBudget } = req.body;
    const db = await getDbConnection();

    // Verify user exists
    const user = await db.get('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const newName = name !== undefined ? name.trim() : user.name;
    const newCurrency = currencyPreference !== undefined ? currencyPreference : user.currency_preference;
    const newBudget = monthlyBudget !== undefined ? parseFloat(monthlyBudget) : user.monthly_budget;

    await db.run(
      `UPDATE users SET name = ?, currency_preference = ?, monthly_budget = ? WHERE id = ?`,
      [newName, newCurrency, newBudget, req.user.id]
    );

    return res.status(200).json({
      id: req.user.id,
      name: newName,
      currencyPreference: newCurrency,
      monthlyBudget: newBudget,
      email: user.email,
      createdAt: user.created_at
    });
  } catch (error) {
    next(error);
  }
}
