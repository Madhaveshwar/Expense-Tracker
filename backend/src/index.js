import app from './app.js';
import { getDbConnection } from './config/db.js';
import { initDb } from './models/schemas.js';

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Establish SQLite DB connection
    const db = await getDbConnection();

    // Run migrations and seed data programmatically on start
    await initDb(db);
    console.log('📦 SQLite database synced, migrated, and seeded successfully.');

    app.listen(PORT, () => {
      console.log(`🚀 API Server successfully listening on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Critical server startup error:', error.message);
    process.exit(1);
  }
}

startServer();

export default app;
