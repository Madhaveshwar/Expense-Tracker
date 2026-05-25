import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

import authRoutes from './routes/authRoutes.js';
import expenseRoutes from './routes/expenseRoutes.js';
import receiptRoutes from './routes/receiptRoutes.js';
import insightRoutes from './routes/insightRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';
import { getDbConnection } from './config/db.js';
import { initDb } from './models/schemas.js';

dotenv.config();

let dbInitialized = false;
async function ensureDb() {
  if (dbInitialized) return;
  const db = await getDbConnection();
  await initDb(db);
  dbInitialized = true;
}

const app = express();

const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

// Lazily boot and seed SQLite inside stateless serverless functions
app.use(async (req, res, next) => {
  try {
    await ensureDb();
    next();
  } catch (err) {
    console.error('Lazy DB initialization failed:', err);
    next(err);
  }
});

// Secure headers using Helmet
app.use(helmet());

// Enable CORS to support client requests
app.use(cors({
  origin: [
    clientOrigin,
    /^http:\/\/localhost:\d+$/,
    /^http:\/\/127\.0\.0\.1:\d+$/
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Express Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root health check status
app.get('/', (req, res) => {
  res.json({ status: 'Online', service: 'AI-Powered Expense Tracker API' });
});

// Mount modular sub-routers
app.use('/api/auth', authRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/receipts', receiptRoutes);
app.use('/api/insights', insightRoutes);
app.use('/api/chat', chatRoutes);

// Fallback handlers
app.use(notFound);
app.use(errorHandler);

export default app;
