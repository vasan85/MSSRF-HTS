const jwt   = require('jsonwebtoken');
const pool  = require('../db/pool');
const cache = require('../utils/cache');

module.exports = async function auth(req, res, next) {
  const header = req.headers['authorization'];
  if (!header) return res.status(401).json({ message: 'No token provided' });

  const token = header.startsWith('Bearer ') ? header.slice(7) : header;
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'secret');
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }

  // Check block status — cached per user for 2 minutes
  try {
    const cacheKey = `block:${req.user.id}`;
    let blocked = cache.get(cacheKey);
    if (blocked === undefined) {
      const [[row]] = await pool.query(
        'SELECT is_blocked, blocked_reason FROM users WHERE id = ?',
        [req.user.id]
      );
      blocked = row ? { is_blocked: row.is_blocked, reason: row.blocked_reason } : { is_blocked: 0 };
      cache.set(cacheKey, blocked, 120); // 2-minute TTL
    }
    if (blocked.is_blocked) {
      return res.status(403).json({
        message: 'Your account has been temporarily blocked.',
        reason: blocked.reason || null,
        blocked: true,
      });
    }
  } catch (err) {
    // If block check fails, allow through — don't break on DB error
    console.error('Block check error:', err.message);
  }

  next();
};

// Role guard factory
module.exports.roles = (...allowed) => (req, res, next) => {
  if (!allowed.includes(req.user?.role))
    return res.status(403).json({ message: 'Access denied for your role' });
  next();
};
