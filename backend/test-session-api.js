/**
 * ============================================================
 * PROBNEXUS — SESSION TRACKING API TESTS
 * ============================================================
 * Tests the session tracking and user management features.
 * Usage: node test-session-api.js
 *
 * Prerequisites:
 *   - Backend running on port 5000
 *   - Database migrated (user_sessions table exists)
 *   - At least one admin user (run: node scripts/set-admin.js <email>)
 * ============================================================
 */

const BASE_URL = 'http://localhost:5000/api';

let PASS = 0;
let FAIL = 0;
let adminToken = null;
let regularToken = null;
let testUserId = null;
let adminUserId = null;

// ── Test user credentials (created during test) ──
const ADMIN_EMAIL = 'session_test_admin@probnexus.test';
const ADMIN_PASS = 'AdminTest123';
const REGULAR_EMAIL = 'session_test_user@probnexus.test';
const REGULAR_PASS = 'UserTest1234';

function assert(condition, testName) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    PASS++;
  } else {
    console.log(`  ❌ FAIL: ${testName}`);
    FAIL++;
  }
}

async function post(path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function get(path, token) {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${path}`, { headers });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

// ============================================================
// SETUP: Create test users
// ============================================================
async function setup() {
  console.log('\n═══════════════════════════════════════');
  console.log(' SETUP: Creating test users');
  console.log('═══════════════════════════════════════\n');

  // Register admin user
  await post('/auth/register', {
    fullName: 'Session Admin',
    departmentId: 'STA01',
    email: ADMIN_EMAIL,
    password: ADMIN_PASS,
    confirmPassword: ADMIN_PASS,
  });

  // Register regular user
  await post('/auth/register', {
    fullName: 'Session User',
    departmentId: 'STU01',
    email: REGULAR_EMAIL,
    password: REGULAR_PASS,
    confirmPassword: REGULAR_PASS,
  });

  // Verify emails directly via DB (bypass OTP for test)
  const { Pool } = require('pg');
  require('dotenv').config();
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  await pool.query('UPDATE "user" SET "emailVerified" = true WHERE email IN ($1, $2)', [ADMIN_EMAIL, REGULAR_EMAIL]);

  // Promote admin
  const adminResult = await pool.query(
    'UPDATE "user" SET role = $1 WHERE email = $2 RETURNING id',
    ['ADMIN', ADMIN_EMAIL]
  );
  if (adminResult.rows.length > 0) {
    adminUserId = adminResult.rows[0].id;
  }

  const userResult = await pool.query('SELECT id FROM "user" WHERE email = $1', [REGULAR_EMAIL]);
  if (userResult.rows.length > 0) {
    testUserId = userResult.rows[0].id;
  }

  await pool.end();
  console.log('  Setup complete.\n');
}

// ============================================================
// TESTS
// ============================================================
async function runTests() {
  console.log('═══════════════════════════════════════');
  console.log(' SESSION TRACKING TESTS');
  console.log('═══════════════════════════════════════\n');

  // ── Test 1: Login creates a session ──
  console.log('Test 1: Login creates a session');
  const loginRes = await post('/auth/login', { email: ADMIN_EMAIL, password: ADMIN_PASS });
  assert(loginRes.status === 200 && loginRes.data.token, 'Admin login succeeds');
  adminToken = loginRes.data.token;

  // Check session was created
  const sessionsRes = await get(`/users/${adminUserId}/sessions`, adminToken);
  assert(sessionsRes.status === 200, 'Can retrieve admin sessions');
  assert(sessionsRes.data.sessions && sessionsRes.data.sessions.length > 0, 'Session was created on login');
  const lastSession = sessionsRes.data.sessions[0];
  assert(lastSession.isActive === true, 'Session is active');
  assert(lastSession.loginAt != null, 'Session has loginAt timestamp');

  // ── Test 2: Failed login does not create session ──
  console.log('\nTest 2: Failed login does not create session');
  const failedLogin = await post('/auth/login', { email: ADMIN_EMAIL, password: 'WrongPassword' });
  assert(failedLogin.status === 401, 'Failed login returns 401');
  // Session count should not increase
  const sessionsAfterFail = await get(`/users/${adminUserId}/sessions`, adminToken);
  assert(
    sessionsAfterFail.data.sessions.length === sessionsRes.data.sessions.length,
    'No new session created on failed login'
  );

  // ── Test 3: Logout marks session inactive ──
  console.log('\nTest 3: Logout marks session inactive');
  // Login regular user first
  const regLogin = await post('/auth/login', { email: REGULAR_EMAIL, password: REGULAR_PASS });
  assert(regLogin.status === 200 && regLogin.data.token, 'Regular user login succeeds');
  regularToken = regLogin.data.token;

  // Logout regular user
  const logoutRes = await post('/auth/logout', {}, regularToken);
  assert(logoutRes.status === 200, 'Logout succeeds');

  // Check session is now inactive
  const regSessions = await get(`/users/${testUserId}/sessions`, adminToken);
  const closedSession = regSessions.data.sessions.find(s => !s.isActive);
  assert(closedSession != null, 'Session was marked inactive after logout');
  assert(closedSession.logoutAt != null, 'Session has logoutAt timestamp');

  // ── Test 4: Active user count is correct ──
  console.log('\nTest 4: Active user count is correct');
  const statsRes = await get('/users/stats', adminToken);
  assert(statsRes.status === 200, 'Stats endpoint returns 200');
  assert(typeof statsRes.data.totalUsers === 'number', 'totalUsers is a number');
  assert(typeof statsRes.data.activeUsers === 'number', 'activeUsers is a number');
  assert(typeof statsRes.data.activeToday === 'number', 'activeToday is a number');
  assert(statsRes.data.totalUsers >= 2, 'Total users >= 2');

  // ── Test 5: Multiple sessions for one user ──
  console.log('\nTest 5: Multiple sessions for one user');
  // Login regular user again (creates second session)
  const regLogin2 = await post('/auth/login', { email: REGULAR_EMAIL, password: REGULAR_PASS });
  assert(regLogin2.status === 200, 'Second login for same user succeeds');
  regularToken = regLogin2.data.token;

  const regSessions2 = await get(`/users/${testUserId}/sessions`, adminToken);
  assert(regSessions2.data.sessions.length >= 2, 'Multiple sessions exist for same user');

  // ── Test 6: Inactive user not counted as online ──
  console.log('\nTest 6: Inactive user not counted as online (after logout)');
  // Logout regular user
  await post('/auth/logout', {}, regularToken);
  const statsAfterLogout = await get('/users/stats', adminToken);
  // Admin is still active, regular user just logged out
  assert(statsAfterLogout.data.activeUsers >= 1, 'At least admin is active');

  // ── Test 7: Active today calculation ──
  console.log('\nTest 7: Active today calculation');
  assert(statsAfterLogout.data.activeToday >= 2, 'Both test users are active today (logged in today)');

  // ── Test 8: Last login is correct ──
  console.log('\nTest 8: Last login is correct');
  const usersRes = await get('/users', adminToken);
  assert(usersRes.status === 200, 'Users list returns 200');
  const adminInList = usersRes.data.users.find(u => u.email === ADMIN_EMAIL);
  assert(adminInList != null, 'Admin found in users list');
  assert(adminInList.lastLoginAt != null, 'Admin has lastLoginAt');

  // ── Test 9: Last logout is correct ──
  console.log('\nTest 9: Last logout is correct');
  const regInList = usersRes.data.users.find(u => u.email === REGULAR_EMAIL);
  assert(regInList != null, 'Regular user found in users list');
  assert(regInList.lastLogoutAt != null, 'Regular user has lastLogoutAt');

  // ── Test 10: Non-admin cannot access user management APIs ──
  console.log('\nTest 10: Non-admin cannot access user management');
  // Login regular user again (non-admin)
  const regLogin3 = await post('/auth/login', { email: REGULAR_EMAIL, password: REGULAR_PASS });
  const nonAdminToken = regLogin3.data.token;

  const forbiddenStats = await get('/users/stats', nonAdminToken);
  assert(forbiddenStats.status === 403, 'Non-admin gets 403 on /users/stats');

  const forbiddenUsers = await get('/users', nonAdminToken);
  assert(forbiddenUsers.status === 403, 'Non-admin gets 403 on /users');

  const forbiddenSessions = await get(`/users/${testUserId}/sessions`, nonAdminToken);
  assert(forbiddenSessions.status === 403, 'Non-admin gets 403 on /users/:id/sessions');

  // No token at all
  const noAuthStats = await get('/users/stats');
  assert(noAuthStats.status === 401, 'No-token request gets 401');

  // ── Test 11: Password/hash/token never returned ──
  console.log('\nTest 11: No sensitive data exposed in API responses');
  const fullUsers = usersRes.data.users;
  let sensitiveFound = false;
  for (const u of fullUsers) {
    if (u.password || u.passwordHash || u.token || u.otp || u.resetToken) {
      sensitiveFound = true;
      break;
    }
  }
  assert(!sensitiveFound, 'No password/hash/token/otp in users list');

  // ── Test 12: Existing auth works ──
  console.log('\nTest 12: Existing auth endpoints still work');
  const meRes = await get('/auth/me', adminToken);
  assert(meRes.status === 200, '/auth/me still works');
  assert(meRes.data.user.email === ADMIN_EMAIL, '/auth/me returns correct user');
}

// ============================================================
// CLEANUP
// ============================================================
async function cleanup() {
  console.log('\n═══════════════════════════════════════');
  console.log(' CLEANUP');
  console.log('═══════════════════════════════════════\n');

  const { Pool } = require('pg');
  require('dotenv').config();
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  // Delete test sessions
  await pool.query('DELETE FROM user_sessions WHERE user_id IN (SELECT id FROM "user" WHERE email IN ($1, $2))', [ADMIN_EMAIL, REGULAR_EMAIL]);
  // Delete test users
  await pool.query('DELETE FROM "user" WHERE email IN ($1, $2)', [ADMIN_EMAIL, REGULAR_EMAIL]);

  await pool.end();
  console.log('  Test data cleaned up.\n');
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║  PROBNEXUS — SESSION TRACKING TEST SUITE     ║');
  console.log('╚══════════════════════════════════════════════╝\n');

  try {
    await setup();
    await runTests();
  } catch (err) {
    console.error('\n❌ Unhandled test error:', err);
    FAIL++;
  } finally {
    await cleanup();
  }

  console.log('═══════════════════════════════════════');
  console.log(` RESULTS:  ${PASS} PASSED,  ${FAIL} FAILED`);
  console.log('═══════════════════════════════════════\n');

  process.exit(FAIL > 0 ? 1 : 0);
}

main();
