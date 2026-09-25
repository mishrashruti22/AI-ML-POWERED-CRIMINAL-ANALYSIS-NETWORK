/**
 * ProbNexus — Reset User Password Script
 * Usage: node scripts/reset-user-password.js <email> <newPassword>
 */
require('dotenv').config();
const bcrypt = require('bcrypt');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function resetPassword() {
  const email = process.argv[2];
  const newPassword = process.argv[3];

  if (!email || !newPassword) {
    console.log('Usage: node scripts/reset-user-password.js <email> <newPassword>');
    process.exit(1);
  }

  try {
    const hash = await bcrypt.hash(newPassword, 10);
    const res = await pool.query(
      'UPDATE "user" SET "passwordHash" = $1, "emailVerified" = true, "updatedAt" = NOW() WHERE LOWER(email) = LOWER($2) RETURNING id, "fullName", email, role, "departmentId"',
      [hash, email.trim()]
    );

    if (res.rows.length === 0) {
      console.error('❌ User not found with email:', email);
      process.exit(1);
    }

    console.log('✅ Password successfully updated for:', res.rows[0]);
  } catch (err) {
    console.error('❌ Error resetting password:', err.message);
  } finally {
    await pool.end();
  }
}

resetPassword();
