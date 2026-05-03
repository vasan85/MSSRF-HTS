const router = require('express').Router();
const pool   = require('../db/pool');
const auth   = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  const { module, action, page = 1, limit = 30 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const conditions = [], params = [];
  if (module) { conditions.push('module = ?'); params.push(module); }
  if (action) { conditions.push('action = ?'); params.push(action); }
  const where = conditions.length ? ' WHERE ' + conditions.join(' AND ') : '';
  const [rows] = await pool.query(
    `SELECT * FROM audit_log ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, parseInt(limit), offset]
  );
  const [counts] = await pool.query(`SELECT COUNT(*) AS total FROM audit_log ${where}`, params);
  res.json({ data: rows, total: counts[0].total });
});

module.exports = router;
