/**
 * ============================================================
 * PROBNEXUS — USER MANAGEMENT CONTROLLER
 * ============================================================
 * Admin-only endpoints for viewing users and sessions.
 * Never exposes passwords, hashes, tokens, or secrets.
 * ============================================================
 */

const sessionService = require('../services/session.service');

/**
 * GET /api/users/stats
 * Returns { totalUsers, activeUsers, activeToday }
 */
exports.getStats = async (req, res) => {
  try {
    const stats = await sessionService.getStats();
    res.status(200).json(stats);
  } catch (error) {
    console.error('User Stats Error:', error);
    res.status(500).json({ error: 'Failed to retrieve user statistics' });
  }
};

/**
 * GET /api/users
 * Returns safe user list with online/offline status.
 */
exports.listUsers = async (req, res) => {
  try {
    const users = await sessionService.listUsersWithStatus();
    res.status(200).json({ users });
  } catch (error) {
    console.error('List Users Error:', error);
    res.status(500).json({ error: 'Failed to retrieve user list' });
  }
};

/**
 * GET /api/users/:userId/sessions
 * Returns session history for a specific user.
 */
exports.getUserSessions = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ error: 'userId parameter is required' });
    }

    const sessions = await sessionService.getUserSessions(userId);
    res.status(200).json({ sessions });
  } catch (error) {
    console.error('User Sessions Error:', error);
    res.status(500).json({ error: 'Failed to retrieve session history' });
  }
};
