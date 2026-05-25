import bcryptjs from 'bcryptjs';

export async function initDb(db) {
  // 1. Create Users Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      currency_preference TEXT DEFAULT 'USD',
      monthly_budget REAL DEFAULT 0.0,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // 2. Create Expenses Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      amount REAL NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      merchant TEXT,
      payment_method TEXT,
      transaction_date TEXT NOT NULL,
      receipt_image_url TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // 3. Create Budgets Table (Category-level budgets)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS budgets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      category TEXT NOT NULL,
      limit_amount REAL NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, category),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // 4. Create AI Insights Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS ai_insights (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // 5. Create Chat History Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS chat_history (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Seed Data (if database is empty)
  const userCount = await db.get('SELECT COUNT(*) as count FROM users');
  if (userCount.count === 0) {
    console.log('Seeding database with demo data...');

    const demoUserId = 'demo-user-uuid-12345';
    const hashedPassword = await bcryptjs.hash('demo123', 10);

    // Insert demo user
    await db.run(
      `INSERT INTO users (id, name, email, password, currency_preference, monthly_budget) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [demoUserId, 'Demo User', 'demo@example.com', hashedPassword, 'USD', 2000.0]
    );

    // Insert category-level budgets
    const categoryBudgets = [
      { category: 'Food', limit: 400 },
      { category: 'Transport', limit: 200 },
      { category: 'Shopping', limit: 300 },
      { category: 'Bills', limit: 600 },
      { category: 'Entertainment', limit: 200 },
      { category: 'Health', limit: 100 },
      { category: 'Travel', limit: 500 }
    ];

    for (const b of categoryBudgets) {
      await db.run(
        `INSERT INTO budgets (id, user_id, category, limit_amount) VALUES (?, ?, ?, ?)`,
        [`budget-${b.category.toLowerCase()}`, demoUserId, b.category, b.limit]
      );
    }

    // Get date references (current month)
    const now = new Date();
    const formatOffsetDate = (daysAgo) => {
      const d = new Date();
      d.setDate(now.getDate() - daysAgo);
      return d.toISOString().split('T')[0];
    };

    // Insert historical expenses to populate graphs beautifully
    const demoExpenses = [
      { id: 'exp-1', amount: 45.50, category: 'Food', description: 'Weekly groceries', merchant: 'Whole Foods', payment_method: 'Credit Card', date: formatOffsetDate(2) },
      { id: 'exp-2', amount: 12.80, category: 'Food', description: 'Coffee and bakery snack', merchant: 'Starbucks', payment_method: 'Mobile Wallet', date: formatOffsetDate(1) },
      { id: 'exp-3', amount: 85.00, category: 'Bills', description: 'Monthly electricity bill', merchant: 'Power Grid Corp', payment_method: 'Bank Transfer', date: formatOffsetDate(10) },
      { id: 'exp-4', amount: 15.00, category: 'Transport', description: 'Ride home from office', merchant: 'Uber', payment_method: 'Credit Card', date: formatOffsetDate(3) },
      { id: 'exp-5', amount: 120.00, category: 'Shopping', description: 'Ergonomic office chair', merchant: 'Amazon', payment_method: 'Credit Card', date: formatOffsetDate(7) },
      { id: 'exp-6', amount: 45.00, category: 'Entertainment', description: 'Concert ticket', merchant: 'Ticketmaster', payment_method: 'Debit Card', date: formatOffsetDate(5) },
      { id: 'exp-7', amount: 200.00, category: 'Investments', description: 'Monthly S&P 500 purchase', merchant: 'Vanguard', payment_method: 'Bank Transfer', date: formatOffsetDate(12) },
      { id: 'exp-8', amount: 35.00, category: 'Health', description: 'Prescription refills', merchant: 'CVS Pharmacy', payment_method: 'Debit Card', date: formatOffsetDate(8) },
      { id: 'exp-9', amount: 49.00, category: 'Education', description: 'Python programming course', merchant: 'Coursera', payment_method: 'Credit Card', date: formatOffsetDate(15) },
      { id: 'exp-10', amount: 320.00, category: 'Travel', description: 'Weekend cabin rental', merchant: 'Airbnb', payment_method: 'Credit Card', date: formatOffsetDate(14) },
      { id: 'exp-11', amount: 25.00, category: 'Other', description: 'Dry cleaning', merchant: 'Cleaners Inc', payment_method: 'Cash', date: formatOffsetDate(4) },
      { id: 'exp-12', amount: 18.50, category: 'Food', description: 'Lunch combo', merchant: 'Chipotle', payment_method: 'Cash', date: formatOffsetDate(6) },
      { id: 'exp-13', amount: 65.00, category: 'Bills', description: 'High-speed internet', merchant: 'Comcast', payment_method: 'Auto-Pay', date: formatOffsetDate(11) },
      { id: 'exp-14', amount: 55.00, category: 'Shopping', description: 'Winter jacket on sale', merchant: 'Zara', payment_method: 'Credit Card', date: formatOffsetDate(13) },
      { id: 'exp-15', amount: 14.20, category: 'Transport', description: 'Train fare', merchant: 'Transit Authority', payment_method: 'Contactless', date: formatOffsetDate(9) }
    ];

    for (const exp of demoExpenses) {
      await db.run(
        `INSERT INTO expenses (id, user_id, amount, category, description, merchant, payment_method, transaction_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [exp.id, demoUserId, exp.amount, exp.category, exp.description, exp.merchant, exp.payment_method, exp.date]
      );
    }

    console.log('Database seeded successfully!');
  }
}
