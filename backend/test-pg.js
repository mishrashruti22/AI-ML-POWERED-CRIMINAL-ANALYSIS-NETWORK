const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  try {
    const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'case'
    `);
    console.log('Columns for case:', res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
main();
