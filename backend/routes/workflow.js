const router  = require('express').Router();
const pool    = require('../db/pool');
const auth    = require('../middleware/auth');
const { roles } = auth;
const cache   = require('../utils/cache');

// Strict YYYY-MM-DD validator — rejects anything that isn't a real date string
function safeDate(val) {
  if (!val || !/^\d{4}-\d{2}-\d{2}$/.test(val)) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : val;
}

// Build a date-range WHERE clause from period param (no user values interpolated)
function periodClause(field, period, date_from, date_to) {
  const f = `h.${field}`;
  switch (period) {
    case 'today':         return `DATE(${f}) = CURDATE()`;
    case 'this_week':     return `YEARWEEK(${f}, 1) = YEARWEEK(CURDATE(), 1)`;
    case 'this_month':    return `YEAR(${f}) = YEAR(CURDATE()) AND MONTH(${f}) = MONTH(CURDATE())`;
    case 'last_month':    return `YEAR(${f}) = YEAR(DATE_SUB(CURDATE(), INTERVAL 1 MONTH)) AND MONTH(${f}) = MONTH(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))`;
    case 'this_quarter':  return `YEAR(${f}) = YEAR(CURDATE()) AND QUARTER(${f}) = QUARTER(CURDATE())`;
    case 'this_year':     return `YEAR(${f}) = YEAR(CURDATE())`;
    case 'custom': {
      const df = safeDate(date_from);
      const dt = safeDate(date_to);
      if (df && dt)  return `DATE(${f}) BETWEEN '${df}' AND '${dt}'`;
      if (df)        return `DATE(${f}) >= '${df}'`;
      if (dt)        return `DATE(${f}) <= '${dt}'`;
      return null;
    }
    default: return null;
  }
}

async function logRevision(conn, household_id, user, action, comment = null) {
  await conn.query(
    `INSERT INTO revision_log
       (household_id, changed_by_user_id, changed_by_name, user_role, action, comment)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [household_id, user.id, user.name, user.role, action, comment]
  );
}

/* ── Review queue (reviewer / admin) ──────────────────────────── */
router.get('/review-queue', auth, roles('mis_reviewer', 'admin'), async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const [rows] = await pool.query(`
      SELECT h.household_id, h.head_name, h.village_name, h.block_name,
             h.district_name, h.social_category, h.workflow_status,
             h.submitted_at, u.name AS submitted_by_name
      FROM household_master h
      LEFT JOIN users u ON h.created_by_user_id = u.id
      WHERE h.workflow_status IN ('submitted','under_review')
      ORDER BY h.submitted_at ASC
      LIMIT ? OFFSET ?
    `, [parseInt(limit), offset]);

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM household_master
       WHERE workflow_status IN ('submitted','under_review')`
    );

    res.json({ data: rows, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('review-queue error:', err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/* ── Enumerator's own submissions (all statuses) ──────────────── */
router.get('/my-queue', auth, roles('enumerator'), async (req, res) => {
  try {
    const { page = 1, limit = 20, period, date_from, date_to, workflow_status } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const conditions = ['h.created_by_user_id = ?'];
    const params     = [req.user.id];
    const periodWhere = period ? periodClause('created_at', period, date_from, date_to) : null;
    if (periodWhere) conditions.push(periodWhere);
    if (workflow_status) { conditions.push('h.workflow_status = ?'); params.push(workflow_status); }

    const where = 'WHERE ' + conditions.join(' AND ');

    const [rows] = await pool.query(`
      SELECT h.household_id, h.head_name, h.village_name, h.block_name,
             h.workflow_status, h.submitted_at, h.reviewed_at, h.review_comment,
             rev.name AS reviewed_by_name
      FROM household_master h
      LEFT JOIN users rev ON h.reviewed_by = rev.id
      ${where}
      ORDER BY h.updated_at DESC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), offset]);

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM household_master h ${where}`,
      params
    );

    res.json({ data: rows, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('my-queue error:', err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/* ── Revision history for a record ───────────────────────────── */
router.get('/:id/history', auth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, changed_by_name, user_role, action, comment, created_at,
              CASE WHEN snapshot IS NOT NULL THEN true ELSE false END AS has_snapshot
       FROM revision_log WHERE household_id = ? ORDER BY created_at DESC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('history error:', err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/* ── Revert to a specific revision (admin / mis_head only) ───── */
router.post('/:id/revert/:revisionId', auth, roles('admin', 'mis_head'), async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Load the target revision snapshot
    const [revRows] = await conn.query(
      `SELECT snapshot, members_snapshot FROM revision_log WHERE id = ? AND household_id = ?`,
      [req.params.revisionId, req.params.id]
    );
    if (!revRows.length || !revRows[0].snapshot) {
      await conn.rollback(); conn.release();
      return res.status(404).json({ message: 'Revision not found or has no snapshot data' });
    }

    const snap = typeof revRows[0].snapshot === 'string'
      ? JSON.parse(revRows[0].snapshot) : revRows[0].snapshot;
    const membersSnap = revRows[0].members_snapshot
      ? (typeof revRows[0].members_snapshot === 'string'
          ? JSON.parse(revRows[0].members_snapshot) : revRows[0].members_snapshot)
      : [];

    // Save current state as a snapshot before reverting
    const [currentHH] = await conn.query('SELECT * FROM household_master WHERE household_id = ?', [req.params.id]);
    const [currentMembers] = await conn.query('SELECT * FROM household_members WHERE household_id = ?', [req.params.id]);

    // Restore household_master from snapshot (exclude auto fields)
    const { household_id, created_at, updated_at, ...fields } = snap;
    const setClauses = Object.keys(fields).map(k => `\`${k}\` = ?`).join(', ');
    const setValues  = Object.values(fields);
    await conn.query(
      `UPDATE household_master SET ${setClauses} WHERE household_id = ?`,
      [...setValues, req.params.id]
    );

    // Restore members from snapshot
    await conn.query('DELETE FROM household_members WHERE household_id = ?', [req.params.id]);
    for (const m of membersSnap) {
      const { id: _id, household_id: _hid, ...mFields } = m;
      const mCols   = Object.keys(mFields).join(', ');
      const mPlaces = Object.keys(mFields).map(() => '?').join(', ');
      await conn.query(
        `INSERT INTO household_members (household_id, ${mCols}) VALUES (?, ${mPlaces})`,
        [req.params.id, ...Object.values(mFields)]
      );
    }

    // Log the revert action with snapshot of the pre-revert state
    await conn.query(
      `INSERT INTO revision_log (household_id, changed_by_user_id, changed_by_name, user_role, action, comment, snapshot, members_snapshot)
       VALUES (?, ?, ?, ?, 'EDITED', ?, ?, ?)`,
      [req.params.id, req.user.id, req.user.name, req.user.role,
       `Reverted to revision #${req.params.revisionId}`,
       JSON.stringify(currentHH[0]), JSON.stringify(currentMembers)]
    );

    await conn.query(
      'INSERT INTO audit_log (user_id,user_name,role,module,action,record_id,detail) VALUES (?,?,?,?,?,?,?)',
      [req.user.id, req.user.name, req.user.role, 'Household', 'REVERT',
       req.params.id, `Reverted to revision #${req.params.revisionId}`]
    );

    await conn.commit();
    conn.release();
    res.json({ success: true, message: `Household reverted to revision #${req.params.revisionId}` });
  } catch (err) {
    console.error('revert error:', err);
    if (conn) { await conn.rollback(); conn.release(); }
    res.status(500).json({ message: 'Internal server error' });
  }
});

/* ── Submit for review (enumerator only) ──────────────────────── */
router.post('/:id/submit', auth, roles('enumerator'), async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query(
      `SELECT workflow_status, created_by_user_id FROM household_master WHERE household_id = ?`,
      [req.params.id]
    );
    if (!rows.length) {
      await conn.rollback(); conn.release();
      return res.status(404).json({ message: 'Household not found' });
    }
    const hh = rows[0];
    if (hh.created_by_user_id !== req.user.id) {
      await conn.rollback(); conn.release();
      return res.status(403).json({ message: 'You can only submit your own records' });
    }
    if (!['draft', 'returned'].includes(hh.workflow_status)) {
      await conn.rollback(); conn.release();
      return res.status(400).json({ message: `Cannot submit a record in status: ${hh.workflow_status}` });
    }

    const action = hh.workflow_status === 'returned' ? 'RESUBMITTED' : 'SUBMITTED';

    await conn.query(
      `UPDATE household_master
       SET workflow_status='submitted', submitted_at=NOW(),
           review_comment=NULL, reviewed_at=NULL
       WHERE household_id=?`,
      [req.params.id]
    );

    await logRevision(conn, req.params.id, req.user, action);
    await conn.query(
      `INSERT INTO audit_log (user_id,user_name,role,module,action,record_id,detail)
       VALUES (?,?,?,?,?,?,?)`,
      [req.user.id, req.user.name, req.user.role, 'Workflow', action,
       req.params.id, `Household ${action.toLowerCase()} for review`]
    );

    await conn.commit();
    conn.release();
    res.json({ success: true });
  } catch (err) {
    await conn.rollback(); conn.release();
    console.error('submit error:', err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/* ── Approve record (reviewer / admin) ───────────────────────── */
router.post('/:id/approve', auth, roles('mis_reviewer', 'admin'), async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query(
      `SELECT workflow_status FROM household_master WHERE household_id = ?`,
      [req.params.id]
    );
    if (!rows.length) {
      await conn.rollback(); conn.release();
      return res.status(404).json({ message: 'Household not found' });
    }
    if (!['submitted', 'under_review'].includes(rows[0].workflow_status)) {
      await conn.rollback(); conn.release();
      return res.status(400).json({ message: `Cannot approve record in status: ${rows[0].workflow_status}` });
    }

    await conn.query(
      `UPDATE household_master
       SET workflow_status='approved', reviewed_by=?, reviewed_at=NOW(), review_comment=NULL
       WHERE household_id=?`,
      [req.user.id, req.params.id]
    );

    // Auto-link to any projects whose village matches this household
    const [hhRow] = await conn.query(
      'SELECT village_id FROM household_master WHERE household_id=?', [req.params.id]
    );
    if (hhRow.length && hhRow[0].village_id) {
      const [villProjects] = await conn.query(
        'SELECT project_id FROM project_village_link WHERE village_id=?', [hhRow[0].village_id]
      );
      const today = new Date().toISOString().slice(0, 10);
      for (const vp of villProjects) {
        const [exists] = await conn.query(
          'SELECT 1 FROM project_household_link WHERE project_id=? AND household_id=?',
          [vp.project_id, req.params.id]
        );
        if (!exists.length) {
          const [maxRow] = await conn.query(
            "SELECT COALESCE(MAX(CAST(SUBSTRING(record_id,2) AS UNSIGNED)), 0) AS mx FROM project_household_link"
          );
          const record_id = 'L' + String(maxRow[0].mx + 1).padStart(4, '0');
          await conn.query(
            `INSERT INTO project_household_link
             (record_id, project_id, household_id, village_id, enrollment_date, status)
             VALUES (?,?,?,?,?,'Active')`,
            [record_id, vp.project_id, req.params.id, hhRow[0].village_id, today]
          );
        }
      }
    }

    await logRevision(conn, req.params.id, req.user, 'APPROVED');
    await conn.query(
      `INSERT INTO audit_log (user_id,user_name,role,module,action,record_id,detail)
       VALUES (?,?,?,?,?,?,?)`,
      [req.user.id, req.user.name, req.user.role, 'Workflow', 'APPROVE',
       req.params.id, `Household approved`]
    );

    await conn.commit();
    conn.release();
    cache.invalidate('dashboard:village-coverage');
    cache.invalidate('dashboard:executive');
    res.json({ success: true });
  } catch (err) {
    await conn.rollback(); conn.release();
    console.error('approve error:', err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/* ── Return for clarification (reviewer / admin) ─────────────── */
router.post('/:id/return', auth, roles('mis_reviewer', 'admin'), async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const { comment } = req.body;
    if (!comment || !comment.trim()) {
      await conn.rollback(); conn.release();
      return res.status(400).json({ message: 'A comment is required when returning for clarification' });
    }

    const [rows] = await conn.query(
      `SELECT workflow_status FROM household_master WHERE household_id = ?`,
      [req.params.id]
    );
    if (!rows.length) {
      await conn.rollback(); conn.release();
      return res.status(404).json({ message: 'Household not found' });
    }
    if (!['submitted', 'under_review'].includes(rows[0].workflow_status)) {
      await conn.rollback(); conn.release();
      return res.status(400).json({ message: `Cannot return record in status: ${rows[0].workflow_status}` });
    }

    await conn.query(
      `UPDATE household_master
       SET workflow_status='returned', reviewed_by=?, reviewed_at=NOW(), review_comment=?
       WHERE household_id=?`,
      [req.user.id, comment.trim(), req.params.id]
    );

    await logRevision(conn, req.params.id, req.user, 'RETURNED', comment.trim());
    await conn.query(
      `INSERT INTO audit_log (user_id,user_name,role,module,action,record_id,detail)
       VALUES (?,?,?,?,?,?,?)`,
      [req.user.id, req.user.name, req.user.role, 'Workflow', 'RETURN',
       req.params.id, `Returned for clarification: ${comment.trim()}`]
    );

    await conn.commit();
    conn.release();
    res.json({ success: true });
  } catch (err) {
    await conn.rollback(); conn.release();
    console.error('return error:', err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/* ── Enumerator-wise submission stats (admin/mis_reviewer/mis_head) ── */
router.get('/enumerator-stats', auth, roles('admin', 'mis_reviewer', 'mis_head'), async (req, res) => {
  try {
    const { period, date_from, date_to } = req.query;
    const periodWhere = period ? periodClause('created_at', period, date_from, date_to) : null;
    const where = periodWhere ? `WHERE ${periodWhere}` : '';

    const [rows] = await pool.query(`
      SELECT
        u.id                                                                AS enumerator_id,
        u.name                                                              AS enumerator_name,
        u.email                                                             AS enumerator_email,
        u.is_blocked,
        COUNT(h.household_id)                                               AS total,
        SUM(h.workflow_status = 'draft')                                    AS draft,
        SUM(h.workflow_status = 'submitted')                                AS submitted,
        SUM(h.workflow_status = 'under_review')                             AS under_review,
        SUM(h.workflow_status = 'approved')                                 AS approved,
        SUM(h.workflow_status = 'returned')                                 AS returned,
        MAX(h.updated_at)                                                   AS last_activity
      FROM users u
      LEFT JOIN household_master h ON h.created_by_user_id = u.id ${where ? 'AND ' + periodWhere : ''}
      WHERE u.role = 'enumerator'
      GROUP BY u.id, u.name, u.email, u.is_blocked
      ORDER BY total DESC, u.name
    `);

    // Summary totals
    const summary = rows.reduce((acc, r) => ({
      total_enumerators: acc.total_enumerators + 1,
      total:        acc.total        + Number(r.total),
      draft:        acc.draft        + Number(r.draft),
      submitted:    acc.submitted    + Number(r.submitted),
      under_review: acc.under_review + Number(r.under_review),
      approved:     acc.approved     + Number(r.approved),
      returned:     acc.returned     + Number(r.returned),
    }), { total_enumerators: 0, total: 0, draft: 0, submitted: 0, under_review: 0, approved: 0, returned: 0 });

    res.json({ summary, data: rows });
  } catch (err) {
    console.error('enumerator-stats error:', err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/* ── Own submission stats (any authenticated user) ── */
router.get('/my-stats', auth, async (req, res) => {
  try {
    const { period, date_from, date_to } = req.query;
    const periodWhere = period ? periodClause('created_at', period, date_from, date_to) : null;
    const conditions  = ['h.created_by_user_id = ?'];
    if (periodWhere) conditions.push(periodWhere);
    const where = 'WHERE ' + conditions.join(' AND ');

    const [[stats]] = await pool.query(`
      SELECT
        COUNT(*)                                    AS total,
        SUM(workflow_status = 'draft')              AS draft,
        SUM(workflow_status = 'submitted')          AS submitted,
        SUM(workflow_status = 'under_review')       AS under_review,
        SUM(workflow_status = 'approved')           AS approved,
        SUM(workflow_status = 'returned')           AS returned,
        MIN(created_at)                             AS first_submission,
        MAX(updated_at)                             AS last_activity
      FROM household_master h
      ${where}
    `, [req.user.id]);

    // Recent 5 records
    const [recent] = await pool.query(`
      SELECT household_id, head_name, village_name, workflow_status, submitted_at, updated_at
      FROM household_master h
      ${where}
      ORDER BY updated_at DESC LIMIT 5
    `, [req.user.id]);

    res.json({ stats, recent });
  } catch (err) {
    console.error('my-stats error:', err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
