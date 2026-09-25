require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function verifyAllUsers() {
  try {
    const res = await pool.query('UPDATE "user" SET "emailVerified" = true RETURNING id, "fullName", email, "emailVerified"');
    console.log('Verified users count:', res.rows.length);
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}
verifyAllUsers();
