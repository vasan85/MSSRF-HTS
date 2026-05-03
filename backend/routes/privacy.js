const router = require('express').Router();
const pool   = require('../db/pool');
const auth   = require('../middleware/auth');
const { roles } = auth;

/* ── Record consent for a household ─────────────────────────── */
router.post('/consent', auth, async (req, res) => {
  try {
    const { household_id, consent_language = 'English', consent_method = 'verbal', consent_version = 'v1.0' } = req.body;
    if (!household_id) return res.status(400).json({ message: 'household_id required' });

    await pool.query(
      `UPDATE household_master
       SET consent_given=1, consent_at=NOW(), consent_language=?, consent_version=?
       WHERE household_id=?`,
      [consent_language, consent_version, household_id]
    );

    await pool.query(
      `INSERT INTO consent_log (household_id, enumerator_id, enumerator_name, consent_language, consent_version, consent_method)
       VALUES (?,?,?,?,?,?)`,
      [household_id, req.user.id, req.user.name, consent_language, consent_version, consent_method]
    );

    await pool.query(
      `INSERT INTO audit_log (user_id,user_name,role,module,action,record_id,detail) VALUES (?,?,?,?,?,?,?)`,
      [req.user.id, req.user.name, req.user.role, 'Privacy', 'CONSENT_RECORDED',
       household_id, `Consent recorded in ${consent_language} via ${consent_method}`]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('consent error:', err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/* ── Anonymize a household (Right to Erasure) ────────────────── */
router.post('/anonymize/:id', auth, roles('admin'), async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { reason } = req.body;
    if (!reason?.trim()) {
      await conn.rollback(); conn.release();
      return res.status(400).json({ message: 'Reason is required for anonymization' });
    }

    const [rows] = await conn.query(
      'SELECT household_id, head_name, is_anonymized FROM household_master WHERE household_id=?',
      [req.params.id]
    );
    if (!rows.length) {
      await conn.rollback(); conn.release();
      return res.status(404).json({ message: 'Household not found' });
    }
    if (rows[0].is_anonymized) {
      await conn.rollback(); conn.release();
      return res.status(400).json({ message: 'Household is already anonymized' });
    }

    // Clear all direct PII fields, preserve statistical/geographic fields
    await conn.query(
      `UPDATE household_master SET
         head_name             = '[ANONYMIZED]',
         mobile                = NULL,
         gps_latitude          = NULL,
         gps_longitude         = NULL,
         observation_remarks   = NULL,
         respondent_comments   = NULL,
         enumerator_name       = '[ANONYMIZED]',
         is_anonymized         = 1,
         anonymized_at         = NOW(),
         anonymized_by         = ?,
         anonymization_reason  = ?
       WHERE household_id = ?`,
      [req.user.id, reason.trim(), req.params.id]
    );

    // Anonymize member names and mobiles
    await conn.query(
      `UPDATE household_members SET member_name='[ANONYMIZED]', mobile_number=NULL WHERE household_id=?`,
      [req.params.id]
    );

    await conn.query(
      `INSERT INTO data_subject_requests
         (household_id, request_type, requested_by, requester_name, reason, status, resolved_by, resolved_at, resolution_note)
       VALUES (?,?,?,?,?,?,?,NOW(),?)`,
      [req.params.id, 'erasure', req.user.id, req.user.name, reason.trim(),
       'completed', req.user.id, 'PII fields anonymized; statistical data retained']
    );

    await conn.query(
      `INSERT INTO audit_log (user_id,user_name,role,module,action,record_id,detail) VALUES (?,?,?,?,?,?,?)`,
      [req.user.id, req.user.name, req.user.role, 'Privacy', 'ANONYMIZE',
       req.params.id, `PII anonymized. Reason: ${reason.trim()}`]
    );

    await conn.commit(); conn.release();
    res.json({ success: true });
  } catch (err) {
    await conn.rollback(); conn.release();
    console.error('anonymize error:', err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/* ── Log an export action ─────────────────────────────────────── */
router.post('/log-export', auth, async (req, res) => {
  try {
    const { filters, record_count, file_name } = req.body;
    await pool.query(
      `INSERT INTO audit_log (user_id,user_name,role,module,action,record_id,detail) VALUES (?,?,?,?,?,?,?)`,
      [req.user.id, req.user.name, req.user.role, 'Privacy', 'DATA_EXPORT',
       null, `Exported ${record_count} records to ${file_name}. Filters: ${JSON.stringify(filters || {})}`]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('log-export error:', err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/* ── Data subject requests list (admin) ──────────────────────── */
router.get('/requests', auth, roles('admin'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM data_subject_requests ORDER BY created_at DESC LIMIT 200`
    );
    res.json(rows);
  } catch (err) {
    console.error('requests error:', err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/* ── Consent log (admin) ─────────────────────────────────────── */
router.get('/consent-log', auth, roles('admin', 'mis_head'), async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const [rows] = await pool.query(
      `SELECT cl.*, h.village_name, h.is_anonymized
       FROM consent_log cl
       LEFT JOIN household_master h ON h.household_id = cl.household_id
       ORDER BY cl.recorded_at DESC LIMIT ? OFFSET ?`,
      [parseInt(limit), offset]
    );
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM consent_log`);
    res.json({ data: rows, total });
  } catch (err) {
    console.error('consent-log error:', err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/* ── Privacy stats summary (admin) ──────────────────────────── */
router.get('/stats', auth, roles('admin', 'mis_head'), async (req, res) => {
  try {
    const [[stats]] = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM household_master WHERE consent_given = 1)   AS consented_hh,
        (SELECT COUNT(*) FROM household_master WHERE consent_given = 0)   AS pending_consent,
        (SELECT COUNT(*) FROM household_master WHERE is_anonymized = 1)   AS anonymized_hh,
        (SELECT COUNT(*) FROM consent_log)                                AS total_consent_records,
        (SELECT COUNT(*) FROM data_subject_requests WHERE status='pending') AS open_dsr,
        (SELECT COUNT(*) FROM audit_log WHERE module='Privacy' AND action='DATA_EXPORT') AS total_exports
    `);
    res.json(stats);
  } catch (err) {
    console.error('privacy-stats error:', err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
