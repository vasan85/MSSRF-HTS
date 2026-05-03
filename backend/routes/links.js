const router = require('express').Router();
const pool   = require('../db/pool');
const auth   = require('../middleware/auth');
const cache  = require('../utils/cache');

// Format a mysql2 DATE value (returned as JS Date or string) to yyyy-MM-dd
function fmtDate(val) {
  if (!val) return null;
  if (val instanceof Date) return val.toISOString().slice(0, 10);
  return String(val).slice(0, 10);
}

router.get('/', auth, async (req, res) => {
  try {
    const { project_id, household_id, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = [], params = [];
    if (project_id)   { conditions.push('l.project_id = ?');   params.push(project_id); }
    if (household_id) { conditions.push('l.household_id = ?'); params.push(household_id); }
    const where = conditions.length ? ' WHERE ' + conditions.join(' AND ') : '';

    const [rows] = await pool.query(
      `SELECT l.*, p.project_name, p.project_code, h.head_name, v.village_name
       FROM project_household_link l
       JOIN project_master p   ON l.project_id   = p.project_id
       JOIN household_master h ON l.household_id  = h.household_id
       JOIN village_master v   ON l.village_id    = v.village_id
       ${where}
       ORDER BY l.enrollment_date DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );
    const [counts] = await pool.query(
      `SELECT COUNT(*) AS total FROM project_household_link l ${where}`, params
    );

    // Normalise date fields so Vue date inputs receive yyyy-MM-dd strings
    const normalised = rows.map(r => ({
      ...r,
      enrollment_date: fmtDate(r.enrollment_date),
    }));

    res.json({ data: normalised, total: counts[0].total });
  } catch (err) {
    console.error('links GET error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const d = req.body;

    // Validate: project must be HH-based and active
    const [proj] = await pool.query('SELECT * FROM project_master WHERE project_id = ?', [d.project_id]);
    if (!proj.length)
      return res.status(404).json({ message: 'Project not found' });
    if (!proj[0].is_household_based)
      return res.status(400).json({ message: 'Linking not allowed: project Impact Unit Type ≠ Household' });
    if (!proj[0].active_status)
      return res.status(400).json({ message: 'Project is not active' });

    // Validate enrollment date falls within project range
    if (d.enrollment_date) {
      const ed  = new Date(d.enrollment_date);
      const sd  = new Date(fmtDate(proj[0].start_date));
      const end = new Date(fmtDate(proj[0].end_date));
      if (ed < sd || ed > end)
        return res.status(400).json({ message: 'Enrollment date must be within project start and end dates' });
    }

    // Prevent duplicate same-project + same-household + same-date
    const [dup] = await pool.query(
      'SELECT record_id FROM project_household_link WHERE project_id=? AND household_id=? AND enrollment_date=?',
      [d.project_id, d.household_id, d.enrollment_date]
    );
    if (dup.length)
      return res.status(400).json({ message: 'Duplicate enrollment: same project, household, and date' });

    // Auto-pull village from household
    const [hh] = await pool.query('SELECT village_id FROM household_master WHERE household_id=?', [d.household_id]);
    const village_id = hh[0]?.village_id || d.village_id;

    // Generate next record ID — use MAX to handle gaps from deletions
    // and avoid collision with seeded records (L0001–L0050)
    const [maxRow] = await pool.query(
      "SELECT COALESCE(MAX(CAST(SUBSTRING(record_id,2) AS UNSIGNED)), 0) AS mx FROM project_household_link"
    );
    const record_id = 'L' + String(maxRow[0].mx + 1).padStart(4, '0');

    await pool.query(
      `INSERT INTO project_household_link
       (record_id, project_id, household_id, village_id, enrollment_date,
        benefit_type, benefit_category, monetary_value, service_quantity, status, remarks)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [record_id, d.project_id, d.household_id, village_id, d.enrollment_date,
       d.benefit_type, d.benefit_category, d.monetary_value || 0,
       d.service_quantity || 0, d.status || 'Active', d.remarks || null]
    );

    await pool.query(
      'INSERT INTO audit_log (user_id,user_name,role,module,action,record_id,detail) VALUES (?,?,?,?,?,?,?)',
      [req.user.id, req.user.name, req.user.role, 'ProjectLink', 'CREATE', record_id,
       `Linked ${d.household_id} to ${d.project_id}`]
    );

    cache.invalidate('dashboard:village-coverage');
    cache.invalidate('dashboard:executive');
    res.status(201).json({ record_id });
  } catch (err) {
    console.error('links POST error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const d = req.body;
    await pool.query(
      `UPDATE project_household_link
       SET benefit_type=?, benefit_category=?, monetary_value=?,
           service_quantity=?, status=?, remarks=?
       WHERE record_id=?`,
      [d.benefit_type, d.benefit_category, d.monetary_value,
       d.service_quantity, d.status, d.remarks || null, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('links PUT error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ── Village-level linking ─────────────────────────────────────

// GET /village-links?project_id=X
router.get('/village-links', auth, async (req, res) => {
  try {
    const { project_id } = req.query;
    if (!project_id) return res.status(400).json({ message: 'project_id is required' });

    const [rows] = await pool.query(`
      SELECT pvl.id, pvl.project_id, pvl.village_id, pvl.linked_at,
             v.village_name, b.block_name, v.total_households,
             COUNT(DISTINCT phl.household_id) AS linked_hh_count,
             u.name AS linked_by_name
      FROM project_village_link pvl
      JOIN village_master v   ON pvl.village_id  = v.village_id
      JOIN block_master b     ON v.block_id       = b.block_id
      LEFT JOIN project_household_link phl
             ON phl.project_id = pvl.project_id AND phl.village_id = pvl.village_id
      LEFT JOIN users u       ON pvl.linked_by_user_id = u.id
      WHERE pvl.project_id = ?
      GROUP BY pvl.id, pvl.project_id, pvl.village_id, pvl.linked_at,
               v.village_name, b.block_name, v.total_households, u.name
      ORDER BY v.village_name
    `, [project_id]);
    res.json(rows);
  } catch (err) {
    console.error('village-links GET error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /village-links — link a village to a project and auto-map existing approved households
router.post('/village-links', auth, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { project_id, village_id, enrollment_date, benefit_type, benefit_category, status } = req.body;
    if (!project_id || !village_id)
      return conn.rollback() || conn.release() || res.status(400).json({ message: 'project_id and village_id are required' });

    const [proj] = await conn.query('SELECT * FROM project_master WHERE project_id = ?', [project_id]);
    if (!proj.length) { await conn.rollback(); conn.release(); return res.status(404).json({ message: 'Project not found' }); }
    if (!proj[0].is_household_based) { await conn.rollback(); conn.release(); return res.status(400).json({ message: 'Project is not household-based' }); }
    if (!proj[0].active_status) { await conn.rollback(); conn.release(); return res.status(400).json({ message: 'Project is not active' }); }

    const [dup] = await conn.query(
      'SELECT id FROM project_village_link WHERE project_id=? AND village_id=?', [project_id, village_id]
    );
    if (dup.length) { await conn.rollback(); conn.release(); return res.status(400).json({ message: 'Village already linked to this project' }); }

    await conn.query(
      'INSERT INTO project_village_link (project_id, village_id, linked_by_user_id) VALUES (?,?,?)',
      [project_id, village_id, req.user.id]
    );

    // Bulk-link all approved households in this village not already linked to this project
    const ed = enrollment_date || new Date().toISOString().slice(0, 10);
    const [households] = await conn.query(`
      SELECT h.household_id
      FROM household_master h
      WHERE h.village_id = ? AND h.workflow_status = 'approved'
        AND NOT EXISTS (
          SELECT 1 FROM project_household_link WHERE project_id = ? AND household_id = h.household_id
        )
    `, [village_id, project_id]);

    const [maxRow] = await conn.query(
      "SELECT COALESCE(MAX(CAST(SUBSTRING(record_id,2) AS UNSIGNED)), 0) AS mx FROM project_household_link"
    );
    let mx = maxRow[0].mx;
    for (const hh of households) {
      mx++;
      const record_id = 'L' + String(mx).padStart(4, '0');
      await conn.query(
        `INSERT INTO project_household_link
         (record_id, project_id, household_id, village_id, enrollment_date, benefit_type, benefit_category, status)
         VALUES (?,?,?,?,?,?,?,?)`,
        [record_id, project_id, hh.household_id, village_id, ed,
         benefit_type || null, benefit_category || null, status || 'Active']
      );
    }

    await conn.query(
      'INSERT INTO audit_log (user_id,user_name,role,module,action,record_id,detail) VALUES (?,?,?,?,?,?,?)',
      [req.user.id, req.user.name, req.user.role, 'ProjectLink', 'VILLAGE_LINK', project_id,
       `Village ${village_id} linked to ${project_id}; ${households.length} households auto-mapped`]
    );

    await conn.commit();
    conn.release();
    cache.invalidate('dashboard:village-coverage');
    cache.invalidate('dashboard:executive');
    res.status(201).json({ auto_mapped: households.length });
  } catch (err) {
    await conn.rollback(); conn.release();
    console.error('village-links POST error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// DELETE /village-links/:id — remove a village-project link (does NOT remove household links)
router.delete('/village-links/:id', auth, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM project_village_link WHERE id=?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: 'Village link not found' });
    await pool.query('DELETE FROM project_village_link WHERE id=?', [req.params.id]);
    await pool.query(
      'INSERT INTO audit_log (user_id,user_name,role,module,action,record_id,detail) VALUES (?,?,?,?,?,?,?)',
      [req.user.id, req.user.name, req.user.role, 'ProjectLink', 'VILLAGE_UNLINK', rows[0].project_id,
       `Village ${rows[0].village_id} unlinked from ${rows[0].project_id}`]
    );
    cache.invalidate('dashboard:village-coverage');
    res.json({ success: true });
  } catch (err) {
    console.error('village-links DELETE error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
