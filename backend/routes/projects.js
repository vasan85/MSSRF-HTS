const router = require('express').Router();
const pool   = require('../db/pool');
const auth   = require('../middleware/auth');
const { roles } = auth;

function fmtDate(val) {
  if (!val) return null;
  if (val instanceof Date) return val.toISOString().slice(0, 10);
  return String(val).slice(0, 10);
}

router.get('/', auth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT p.*,
         COUNT(DISTINCT l.household_id)                                      AS total_hh,
         COUNT(DISTINCT CASE WHEN l.status = 'Active' THEN l.household_id END) AS active_hh,
         COALESCE(SUM(l.monetary_value), 0)                                  AS total_value
       FROM project_master p
       LEFT JOIN project_household_link l ON l.project_id = p.project_id
       GROUP BY p.project_id
       ORDER BY p.project_id`
    );
    const normalised = rows.map(r => ({
      ...r,
      start_date: fmtDate(r.start_date),
      end_date:   fmtDate(r.end_date),
    }));
    res.json(normalised);
  } catch (err) {
    console.error('projects GET error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM project_master WHERE project_id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: 'Project not found' });
    const r = rows[0];
    res.json({ ...r, start_date: fmtDate(r.start_date), end_date: fmtDate(r.end_date) });
  } catch (err) {
    console.error('projects GET/:id error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/', auth, roles('admin'), async (req, res) => {
  try {
    const d = req.body;
    await pool.query(
      `INSERT INTO project_master
       (project_id, project_name, project_code, start_date, end_date, project_type,
        impact_unit_type, is_household_based, geographic_coverage, active_status)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [d.project_id, d.project_name, d.project_code, d.start_date, d.end_date,
       d.project_type, d.impact_unit_type, d.is_household_based ? 1 : 0,
       d.geographic_coverage || null, d.active_status ? 1 : 0]
    );
    await pool.query(
      'INSERT INTO audit_log (user_id,user_name,role,module,action,record_id,detail) VALUES (?,?,?,?,?,?,?)',
      [req.user.id, req.user.name, req.user.role, 'Project', 'CREATE', d.project_id, `Project created: ${d.project_name}`]
    );
    res.status(201).json({ project_id: d.project_id });
  } catch (err) {
    console.error('projects POST error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.put('/:id', auth, roles('admin'), async (req, res) => {
  try {
    const d = req.body;
    await pool.query(
      `UPDATE project_master SET
       project_name=?, project_code=?, start_date=?, end_date=?, project_type=?,
       impact_unit_type=?, is_household_based=?, geographic_coverage=?, active_status=?
       WHERE project_id=?`,
      [d.project_name, d.project_code, d.start_date, d.end_date, d.project_type,
       d.impact_unit_type, d.is_household_based ? 1 : 0, d.geographic_coverage || null,
       d.active_status ? 1 : 0, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('projects PUT error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;