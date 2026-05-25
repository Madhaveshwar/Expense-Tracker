import app from './app.js';
import { getDbConnection } from './config/db.js';
import { initDb } from './models/schemas.js';

const PORT = process.env.PORT || 5000;

// Programmatic start for local non-Vercel environment
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  async function startServer() {
    try {
      // Establish SQLite DB connection
      const db = await getDbConnection();
      
      // Run migrations and seed data programmatically on start
      await initDb(db);
      console.log('📦 SQLite database synced, migrated, and seeded successfully.');

      // Start Express app listening
      app.listen(PORT, () => {
        console.log(`🚀 API Server successfully listening on http://localhost:${PORT}`);
      });
    } catch (error) {
      console.error('❌ Critical server startup error:', error.message);
      process.exit(1);
    }
  }

  startServer();
}

export default app;
