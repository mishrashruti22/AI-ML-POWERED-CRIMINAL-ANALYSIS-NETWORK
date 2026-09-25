/**
 * ProbNexus — Admin Authorization Middleware
 * Requires req.user.role === 'ADMIN'. Must be used AFTER requireAuth.
 */

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }
  next();
}

module.exports = { requireAdmin };
