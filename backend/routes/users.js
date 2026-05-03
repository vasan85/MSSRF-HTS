const router = require('express').Router();
const bcrypt  = require('bcrypt');
const pool    = require('../db/pool');
const auth    = require('../middleware/auth');
const { roles } = auth;

/* ── List all users (admin or mis_head) ───────────── */
router.get('/', auth, roles('admin', 'mis_head'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, email, role, created_at, is_blocked, blocked_reason, blocked_at FROM users ORDER BY id'
    );
    res.json(rows);
  } catch (err) {
    console.error('users GET error:', err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/* ── Create user (admin: any role; mis_head: enumerator/mis_reviewer only) ── */
router.post('/', auth, roles('admin', 'mis_head'), async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role)
      return res.status(400).json({ message: 'name, email, password and role are required' });

    const allRoles  = ['admin', 'enumerator', 'me', 'mis_reviewer', 'mis_head'];
    const headRoles = ['enumerator', 'mis_reviewer'];

    const validRoles = req.user.role === 'admin' ? allRoles : headRoles;
    if (!validRoles.includes(role))
      return res.status(400).json({ message: `You can only assign roles: ${validRoles.join(', ')}` });

    // Check duplicate email
    const [exist] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (exist.length)
      return res.status(409).json({ message: 'Email already registered' });

    const hash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO users (name, email, password, role) VALUES (?,?,?,?)',
      [name.trim(), email.trim().toLowerCase(), hash, role]
    );

    await pool.query(
      'INSERT INTO audit_log (user_id,user_name,role,module,action,record_id,detail) VALUES (?,?,?,?,?,?,?)',
      [req.user.id, req.user.name, req.user.role, 'UserMgmt', 'CREATE',
       String(result.insertId), `New user created: ${name} (${role})`]
    );

    res.status(201).json({ id: result.insertId, name, email, role });
  } catch (err) {
    console.error('users POST error:', err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/* ── Update user role (admin only) ──────────────── */
router.put('/:id', auth, roles('admin'), async (req, res) => {
  try {
    const { name, role } = req.body;
    const validRoles = ['admin', 'enumerator', 'me', 'mis_reviewer', 'mis_head'];
    if (role && !validRoles.includes(role))
      return res.status(400).json({ message: `Invalid role` });

    await pool.query(
      'UPDATE users SET name=?, role=? WHERE id=?',
      [name, role, req.params.id]
    );
    await pool.query(
      'INSERT INTO audit_log (user_id,user_name,role,module,action,record_id,detail) VALUES (?,?,?,?,?,?,?)',
      [req.user.id, req.user.name, req.user.role, 'UserMgmt', 'UPDATE',
       req.params.id, `User ${req.params.id} role changed to ${role}`]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('users PUT error:', err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/* ── Reset password (admin: any user; mis_head: enumerator/mis_reviewer only) ── */
router.post('/:id/reset-password', auth, roles('admin', 'mis_head'), async (req, res) => {
  try {
    const { new_password } = req.body;
    if (!new_password || new_password.length < 8)
      return res.status(400).json({ message: 'Password must be at least 8 characters' });

    const [target] = await pool.query('SELECT id, name, role FROM users WHERE id=?', [req.params.id]);
    if (!target.length) return res.status(404).json({ message: 'User not found' });

    if (req.user.role === 'mis_head') {
      const allowed = ['enumerator', 'mis_reviewer'];
      if (!allowed.includes(target[0].role))
        return res.status(403).json({ message: 'MIS Head can only reset passwords for Enumerators and MIS Reviewers' });
    }

    const hash = await bcrypt.hash(new_password, 10);
    await pool.query('UPDATE users SET password=? WHERE id=?', [hash, req.params.id]);
    await pool.query(
      'INSERT INTO audit_log (user_id,user_name,role,module,action,record_id,detail) VALUES (?,?,?,?,?,?,?)',
      [req.user.id, req.user.name, req.user.role, 'UserMgmt', 'UPDATE',
       req.params.id, `Password reset for user ${target[0].name} (${req.params.id})`]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('reset-password error:', err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/* ── Change own password (any authenticated user) ── */
router.post('/me/change-password', auth, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password)
      return res.status(400).json({ message: 'current_password and new_password are required' });
    if (new_password.length < 8)
      return res.status(400).json({ message: 'New password must be at least 8 characters' });

    const [rows] = await pool.query('SELECT password FROM users WHERE id=?', [req.user.id]);
    if (!rows.length) return res.status(404).json({ message: 'User not found' });

    const valid = await bcrypt.compare(current_password, rows[0].password);
    if (!valid) return res.status(401).json({ message: 'Current password is incorrect' });

    const hash = await bcrypt.hash(new_password, 10);
    await pool.query('UPDATE users SET password=? WHERE id=?', [hash, req.user.id]);
    await pool.query(
      'INSERT INTO audit_log (user_id,user_name,role,module,action,record_id,detail) VALUES (?,?,?,?,?,?,?)',
      [req.user.id, req.user.name, req.user.role, 'UserMgmt', 'UPDATE',
       String(req.user.id), `User changed their own password`]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('change-password error:', err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/* ── Deactivate / delete user (admin only) ───────── */
router.delete('/:id', auth, roles('admin'), async (req, res) => {
  try {
    // Prevent self-deletion
    if (parseInt(req.params.id) === req.user.id)
      return res.status(400).json({ message: 'Cannot delete your own account' });

    const [rows] = await pool.query('SELECT name FROM users WHERE id=?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: 'User not found' });

    // Null out FK refs in audit_log before deleting (ON DELETE SET NULL handles this via FK)
    await pool.query('DELETE FROM users WHERE id=?', [req.params.id]);
    await pool.query(
      'INSERT INTO audit_log (user_id,user_name,role,module,action,record_id,detail) VALUES (?,?,?,?,?,?,?)',
      [req.user.id, req.user.name, req.user.role, 'UserMgmt', 'DELETE',
       req.params.id, `User deleted: ${rows[0].name}`]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('users DELETE error:', err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/* ── Block user temporarily (admin only) ─────────── */
router.post('/:id/block', auth, roles('admin'), async (req, res) => {
  try {
    const { reason } = req.body;
    if (parseInt(req.params.id) === req.user.id)
      return res.status(400).json({ message: 'Cannot block your own account' });

    const [rows] = await pool.query('SELECT name, role FROM users WHERE id=?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: 'User not found' });
    if (rows[0].role === 'admin')
      return res.status(400).json({ message: 'Cannot block another admin account' });

    await pool.query(
      'UPDATE users SET is_blocked=1, blocked_reason=?, blocked_at=NOW(), blocked_by=? WHERE id=?',
      [reason || null, req.user.id, req.params.id]
    );
    // Flush cached block status so it takes effect within seconds
    const cache = require('../utils/cache');
    cache.invalidate(`block:${req.params.id}`);

    await pool.query(
      'INSERT INTO audit_log (user_id,user_name,role,module,action,record_id,detail) VALUES (?,?,?,?,?,?,?)',
      [req.user.id, req.user.name, req.user.role, 'UserMgmt', 'BLOCK',
       req.params.id, `User ${rows[0].name} blocked${reason ? ': ' + reason : ''}`]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('block error:', err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/* ── Unblock user (admin only) ───────────────────── */
router.post('/:id/unblock', auth, roles('admin'), async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT name FROM users WHERE id=?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: 'User not found' });

    await pool.query(
      'UPDATE users SET is_blocked=0, blocked_reason=NULL, blocked_at=NULL, blocked_by=NULL WHERE id=?',
      [req.params.id]
    );
    const cache = require('../utils/cache');
    cache.invalidate(`block:${req.params.id}`);

    await pool.query(
      'INSERT INTO audit_log (user_id,user_name,role,module,action,record_id,detail) VALUES (?,?,?,?,?,?,?)',
      [req.user.id, req.user.name, req.user.role, 'UserMgmt', 'UNBLOCK',
       req.params.id, `User ${rows[0].name} unblocked`]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('unblock error:', err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;