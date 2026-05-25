import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db = null;

export async function getDbConnection() {
  if (db) return db;

  const isVercel = process.env.VERCEL || process.env.NOW_BUILD_TRIGGER;
  const dbPath = isVercel 
    ? '/tmp/database.sqlite'
    : path.resolve(__dirname, '../../database.sqlite');
  
  db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  // Enable foreign key support
  await db.run('PRAGMA foreign_keys = ON');

  return db;
}
