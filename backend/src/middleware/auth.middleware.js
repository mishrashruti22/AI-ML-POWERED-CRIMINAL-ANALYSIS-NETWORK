const jwt = require('jsonwebtoken');
const sessionService = require('../services/session.service');

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const secret = process.env.JWT_SECRET || 'fallback-secret-for-dev';
    const decoded = jwt.verify(token, secret);
    req.user = decoded; // { id, email, role, ... }

    // Update last_activity_at (fire-and-forget, non-blocking)
    sessionService.touchActivity(decoded.id);

    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
}

module.exports = {
  requireAuth
};
