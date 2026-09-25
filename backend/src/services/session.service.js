/**
 * ============================================================
 * PROBNEXUS — SESSION SERVICE
 * ============================================================
 * Manages user session lifecycle in the user_sessions table.
 *
 * ONLINE RULE:
 *   A user is ONLINE if they have at least one session where:
 *     is_active = true  AND  last_activity_at > NOW() - 15 minutes
 *
 *   Otherwise they are OFFLINE.
 * ============================================================
 */

const crypto = require('crypto');
const db = require('../config/db');

const INACTIVITY_THRESHOLD_MINUTES = 15;

// ---------------------------------------------------------------------------
// Session lifecycle
// ---------------------------------------------------------------------------

/**
 * Create a new session when a user logs in.
 * @param {string} userId
 * @returns {Promise<object>} The created session row.
 */
async function createSession(userId) {
  const id = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();
  const now = new Date();

  const result = await db.query(
    `INSERT INTO user_sessions (id, user_id, login_at, last_activity_at, is_active, created_at, updated_at)
     VALUES ($1, $2, $3, $3, TRUE, $3, $3)
     RETURNING *`,
    [id, userId, now]
  );

  return result.rows[0];
}

/**
 * Close all active sessions for a user (logout).
 * @param {string} userId
 */
async function closeSession(userId) {
  const now = new Date();
  await db.query(
    `UPDATE user_sessions
     SET is_active = FALSE, logout_at = $1, updated_at = $1
     WHERE user_id = $2 AND is_active = TRUE`,
    [now, userId]
  );
}

/**
 * Update last_activity_at for the user's active session(s).
 * Fire-and-forget — errors are logged but do not propagate.
 * @param {string} userId
 */
async function touchActivity(userId) {
  try {
    const now = new Date();
    await db.query(
      `UPDATE user_sessions
       SET last_activity_at = $1, updated_at = $1
       WHERE user_id = $2 AND is_active = TRUE`,
      [now, userId]
    );
  } catch (err) {
    console.error('[SessionService] touchActivity error:', err.message);
  }
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Get dashboard statistics.
 * @returns {Promise<{totalUsers: number, activeUsers: number, activeToday: number}>}
 */
async function getStats() {
  const totalResult = await db.query('SELECT COUNT(*)::int AS count FROM "user"');
  const totalUsers = totalResult.rows[0].count;

  // ONLINE = active session with activity within threshold
  const activeResult = await db.query(
    `SELECT COUNT(DISTINCT user_id)::int AS count
     FROM user_sessions
     WHERE is_active = TRUE
       AND last_activity_at > NOW() - INTERVAL '${INACTIVITY_THRESHOLD_MINUTES} minutes'`
  );
  const activeUsers = activeResult.rows[0].count;

  // Active today = users who logged in today (any session)
  const todayResult = await db.query(
    `SELECT COUNT(DISTINCT user_id)::int AS count
     FROM user_sessions
     WHERE login_at >= CURRENT_DATE`
  );
  const activeToday = todayResult.rows[0].count;

  return { totalUsers, activeUsers, activeToday };
}

/**
 * Get all users with their session status (safe fields only).
 * Never returns password, passwordHash, tokens, or secrets.
 * @returns {Promise<Array>}
 */
async function listUsersWithStatus() {
  const result = await db.query(`
    SELECT
      u.id,
      u."fullName",
      u."departmentId",
      u.email,
      u.role,
      u."emailVerified",
      u."createdAt",
      -- Last login: most recent login_at across all sessions
      (SELECT MAX(s.login_at) FROM user_sessions s WHERE s.user_id = u.id) AS "lastLoginAt",
      -- Last logout: most recent logout_at across all sessions
      (SELECT MAX(s.logout_at) FROM user_sessions s WHERE s.user_id = u.id AND s.logout_at IS NOT NULL) AS "lastLogoutAt",
      -- Is online: has active session with recent activity
      EXISTS (
        SELECT 1 FROM user_sessions s
        WHERE s.user_id = u.id
          AND s.is_active = TRUE
          AND s.last_activity_at > NOW() - INTERVAL '${INACTIVITY_THRESHOLD_MINUTES} minutes'
      ) AS "isOnline"
    FROM "user" u
    ORDER BY u."createdAt" DESC
  `);

  return result.rows;
}

/**
 * Get session history for a specific user (safe fields only).
 * @param {string} userId
 * @returns {Promise<Array>}
 */
async function getUserSessions(userId) {
  const result = await db.query(
    `SELECT id, login_at AS "loginAt", logout_at AS "logoutAt",
            last_activity_at AS "lastActivityAt", is_active AS "isActive",
            created_at AS "createdAt"
     FROM user_sessions
     WHERE user_id = $1
     ORDER BY login_at DESC
     LIMIT 50`,
    [userId]
  );

  return result.rows;
}

module.exports = {
  createSession,
  closeSession,
  touchActivity,
  getStats,
  listUsersWithStatus,
  getUserSessions,
  INACTIVITY_THRESHOLD_MINUTES,
};
