/**
 * ProbNexus — Set Admin Role
 * Promotes a user to ADMIN by email.
 * Usage: node scripts/set-admin.js <email>
 */
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: node scripts/set-admin.js <email>');
    process.exit(1);
  }

  try {
    const result = await pool.query(
      'UPDATE "user" SET role = $1, "updatedAt" = $2 WHERE email = $3 RETURNING id, "fullName", email, role',
      ['ADMIN', new Date(), email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      console.error('❌  No user found with email:', email);
      process.exit(1);
    }

    const user = result.rows[0];
    console.log('✅  User promoted to ADMIN:');
    console.log(`    Name:  ${user.fullName}`);
    console.log(`    Email: ${user.email}`);
    console.log(`    Role:  ${user.role}`);
  } catch (err) {
    console.error('❌  Error:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
