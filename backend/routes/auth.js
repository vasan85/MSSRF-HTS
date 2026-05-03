const router  = require('express').Router();
const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');
const pool    = require('../db/pool');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: 'Email and password required' });

  try {
    const [rows] = await pool.query(
      'SELECT id, name, email, role, password, is_blocked, blocked_reason FROM users WHERE email = ?',
      [email]
    );
    if (!rows.length)
      return res.status(401).json({ message: 'Invalid credentials' });

    const user = rows[0];

    // Check block status before doing any password work
    if (user.is_blocked) {
      return res.status(403).json({
        message: 'Your account has been temporarily blocked. Please contact the administrator.',
        reason: user.blocked_reason || null,
        blocked: true,
      });
    }

    const match = await bcrypt.compare(password, user.password).catch(() => false);
    if (!match)
      return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });

  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ message: 'An error occurred. Please try again.' });
  }
});

// GET /api/auth/me
router.get('/me', require('../middleware/auth'), (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;