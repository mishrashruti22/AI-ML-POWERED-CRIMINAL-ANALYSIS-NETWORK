require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function list() {
  try {
    const res = await pool.query('SELECT id, "fullName", email, role, "departmentId", "emailVerified" FROM "user" ORDER BY "createdAt" DESC');
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}
list();
