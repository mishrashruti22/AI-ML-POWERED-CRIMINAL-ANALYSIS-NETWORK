/**
 * ProbNexus — Session Migration Runner
 * Runs migrations/add_user_sessions.sql against the PostgreSQL database.
 * Usage: node scripts/run-session-migration.js
 */
require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const sqlPath = path.join(__dirname, '..', 'migrations', 'add_user_sessions.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log('Running user_sessions migration...');
  try {
    await pool.query(sql);
    console.log('✅  user_sessions table and indexes created (or already exist).');
  } catch (err) {
    console.error('❌  Migration failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
