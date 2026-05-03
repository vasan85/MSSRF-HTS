const router = require('express').Router();
const pool   = require('../db/pool');
const auth   = require('../middleware/auth');
const { roles } = auth;

// ── Indian name pools for realistic dummy data ─────────────────────────────
const FIRST_NAMES = [
  'Murugan','Lakshmi','Selvam','Annamalai','Kavitha','Rajan','Meena','Sundar',
  'Priya','Arumugam','Radha','Senthil','Geetha','Palani','Sumathi','Kannan',
  'Valli','Durai','Saravanan','Malathi','Velan','Parvathi','Mani','Kamala',
  'Suresh','Vasantha','Krishnan','Saroja','Balan','Padma','Muthu','Gomathi',
  'Vijayan','Thilaga','Ramu','Chitra','Samy','Rekha','Natarajan','Jayanthi',
];
const LAST_INITIALS = ['A','B','C','D','G','K','M','N','P','R','S','T','V'];
const OCCUPATIONS   = ['Farmer','Daily Wage Labourer','Fisher','Small Trader','Govt Employee','Private Employee','MNREGA Worker','Artisan','Livestock Farmer','Self Employed'];
const EDUCATIONS    = ['Illiterate','Primary','Middle School','High School','Higher Secondary','Graduate','Post Graduate'];
const SOCIAL_CATS   = ['SC','ST','OBC','General','EWS'];
const MARITAL       = ['Married','Single','Widowed','Divorced'];
const INCOMES       = ['Below 5000','5001-10000','10001-20000','20001-30000','Above 30000'];
const ALL_STATUSES  = ['draft','submitted','under_review','approved','returned'];
const MIXED_STATUSES = ['draft','draft','submitted','submitted','under_review','approved','returned'];

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randMobile() { return '9' + String(randInt(100000000, 999999999)); }
function randSerial() { return String(randInt(1000, 9999)); }

// ── GET count of dummy records ─────────────────────────────────────────────
router.get('/dummy-data/count', auth, roles('admin'), async (req, res) => {
  try {
    const [[{ cnt }]] = await pool.query(
      `SELECT COUNT(*) AS cnt FROM household_master WHERE is_dummy = 1`
    );
    res.json({ count: Number(cnt) });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ── POST generate dummy records ────────────────────────────────────────────
router.post('/dummy-data', auth, roles('admin'), async (req, res) => {
  const count      = Math.min(Math.max(parseInt(req.body.count || 20), 1), 200);
  const statusParam = req.body.status || 'random';
  const fixedStatus = ALL_STATUSES.includes(statusParam) ? statusParam : null; // null = random mix
  const conn  = await pool.getConnection();
  try {
    // Fetch real villages with full geo
    const [villages] = await conn.query(`
      SELECT v.village_id, v.village_name,
             b.block_name, d.district_name, s.state_name
      FROM village_master v
      JOIN block_master   b ON v.block_id    = b.block_id
      JOIN district_master d ON b.district_id = d.district_id
      JOIN state_master    s ON d.state_id    = s.id
      WHERE v.active = 1
      LIMIT 50
    `);
    if (!villages.length) {
      conn.release();
      return res.status(400).json({ message: 'No active villages found in master data. Please add villages first.' });
    }

    // Fetch enumerator users
    const [enumerators] = await conn.query(
      `SELECT id, name FROM users WHERE role = 'enumerator' LIMIT 10`
    );

    const now = new Date();
    const inserted = [];

    for (let i = 0; i < count; i++) {
      const village   = rand(villages);
      const firstName = rand(FIRST_NAMES);
      const headName  = `${firstName} ${rand(LAST_INITIALS)}`;
      const wfStatus  = fixedStatus || rand(MIXED_STATUSES);
      const enumer    = enumerators.length ? rand(enumerators) : null;
      const serialNo  = randInt(1, 9999);
      const hhId      = `DEMO-${village.village_id}-${randSerial()}`;

      // Dates based on workflow status
      const createdDaysAgo = randInt(1, 90);
      const createdAt = new Date(now - createdDaysAgo * 86400000);
      let submittedAt = null, reviewedAt = null, reviewComment = null;

      if (['submitted','under_review','approved','returned'].includes(wfStatus)) {
        submittedAt = new Date(createdAt.getTime() + randInt(1, 5) * 86400000);
      }
      if (['approved','returned'].includes(wfStatus)) {
        reviewedAt = new Date(submittedAt.getTime() + randInt(1, 7) * 86400000);
        if (wfStatus === 'returned') reviewComment = 'Please verify the land ownership details and resubmit.';
      }

      await conn.query(`
        INSERT INTO household_master
          (household_id, village_id, serial_no, enumerator_name,
           survey_date, consent_obtained,
           state_name, district_name, block_name, village_name,
           head_name, head_age, mobile,
           social_category, marital_status, education, occupation,
           monthly_income, female_headed_household, migration_status,
           land_ownership, livestock_ownership, shg_membership, fpo_membership,
           status, workflow_status, is_dummy,
           submitted_at, reviewed_at, review_comment,
           created_by_user_id, created_at, updated_at)
        VALUES (?,?,?,?, ?,?, ?,?,?,?, ?,?,?, ?,?,?,?, ?,?,?, ?,?,?,?, ?,?,?, ?,?,?, ?,?,?)
      `, [
        hhId, village.village_id, serialNo, enumer ? enumer.name : 'Demo Enumerator',
        createdAt.toISOString().slice(0,10), 'Yes',
        village.state_name, village.district_name, village.block_name, village.village_name,
        headName, randInt(25, 72), randMobile(),
        rand(SOCIAL_CATS), rand(MARITAL), rand(EDUCATIONS), rand(OCCUPATIONS),
        rand(INCOMES), rand(['Yes','No']), rand(['Migrant','Non-migrant']),
        rand(['Yes','No']), rand(['Yes','No']), rand(['Yes','No']), rand(['Yes','No']),
        'Active', wfStatus, 1,
        submittedAt, reviewedAt, reviewComment,
        enumer ? enumer.id : req.user.id,
        createdAt, createdAt,
      ]);
      inserted.push(hhId);
    }

    conn.release();
    res.json({ success: true, inserted: inserted.length, ids: inserted });
  } catch (err) {
    conn.release();
    console.error('dummy-data generate error:', err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ── DELETE clear dummy records ─────────────────────────────────────────────
router.delete('/dummy-data', auth, roles('admin'), async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Remove from linked tables first
    await conn.query(`
      DELETE phl FROM project_household_link phl
      JOIN household_master h ON phl.household_id = h.household_id
      WHERE h.is_dummy = 1
    `);
    await conn.query(`
      DELETE hm FROM household_members hm
      JOIN household_master h ON hm.household_id = h.household_id
      WHERE h.is_dummy = 1
    `);
    await conn.query(`
      DELETE rl FROM revision_log rl
      JOIN household_master h ON rl.household_id = h.household_id
      WHERE h.is_dummy = 1
    `);

    const [result] = await conn.query(
      `DELETE FROM household_master WHERE is_dummy = 1`
    );

    await conn.query(
      `INSERT INTO audit_log (user_id, user_name, role, module, action, record_id, detail)
       VALUES (?,?,?,?,?,?,?)`,
      [req.user.id, req.user.name, req.user.role, 'Admin', 'CLEAR_DUMMY', null,
       `Cleared ${result.affectedRows} dummy household records`]
    );

    await conn.commit();
    conn.release();
    res.json({ success: true, deleted: result.affectedRows });
  } catch (err) {
    await conn.rollback();
    conn.release();
    console.error('dummy-data clear error:', err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
