const router = require('express').Router();
const pool   = require('../db/pool');
const auth   = require('../middleware/auth');
const { roles } = auth;
const cache  = require('../utils/cache');

// Invalidate geo caches when master data changes
function bustMastersCache() { cache.invalidatePrefix('masters:'); }

/* ── States — 1-hour cache ───────────────────────── */
router.get('/states', auth, async (req, res) => {
  try {
    const rows = await cache.getOrSet('masters:states', 3600, async () => {
      const [data] = await pool.query('SELECT id AS state_id, state_name FROM state_master ORDER BY state_name');
      return data;
    });
    res.set('Cache-Control', 'private, max-age=3600');
    res.json(rows);
  } catch (err) {
    console.error('states GET error:', err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/states', auth, roles('admin'), async (req, res) => {
  try {
    const { state_name } = req.body;
    const [r] = await pool.query('INSERT INTO state_master (state_name) VALUES (?)', [state_name]);
    bustMastersCache();
    res.json({ state_id: r.insertId, state_name });
  } catch (err) {
    console.error('states POST error:', err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/* ── Districts — cached per state_id ────────────── */
router.get('/districts', auth, async (req, res) => {
  try {
    const { state_id } = req.query;
    const sid = state_id ? parseInt(state_id, 10) : null;
    const cacheKey = `masters:districts:${sid || 'all'}`;

    const rows = await cache.getOrSet(cacheKey, 3600, async () => {
      let sql = `
        SELECT d.district_id, d.district_name, d.state_id, s.state_name
        FROM district_master d
        JOIN state_master s ON d.state_id = s.id
      `;
      const params = [];
      if (sid) { sql += ' WHERE d.state_id = ?'; params.push(sid); }
      sql += ' ORDER BY d.district_name';
      const [data] = await pool.query(sql, params);
      return data;
    });
    res.set('Cache-Control', 'private, max-age=3600');
    res.json(rows);
  } catch (err) {
    console.error('districts GET error:', err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/districts', auth, roles('admin'), async (req, res) => {
  try {
    const { district_id, district_name, state_id } = req.body;
    await pool.query(
      'INSERT INTO district_master (district_id, district_name, state_id) VALUES (?,?,?)',
      [district_id, district_name, parseInt(state_id, 10)]
    );
    bustMastersCache();
    res.json({ district_id, district_name, state_id });
  } catch (err) {
    console.error('districts POST error:', err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/* ── Blocks ──────────────────────────────────────── */
router.get('/blocks', auth, async (req, res) => {
  try {
    const { district_id } = req.query;

    let sql = `
      SELECT b.block_id,
             b.block_name,
             b.district_id,
             d.district_name
      FROM block_master b
      JOIN district_master d ON b.district_id = d.district_id
    `;
    const params = [];
    if (district_id) {
      sql += ' WHERE b.district_id = ?';
      params.push(district_id);
    }
    sql += ' ORDER BY b.block_name';

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('blocks GET error:', err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/blocks', auth, roles('admin'), async (req, res) => {
  try {
    const { block_id, block_name, district_id } = req.body;
    await pool.query(
      'INSERT INTO block_master (block_id, block_name, district_id) VALUES (?,?,?)',
      [block_id, block_name, district_id]
    );
    res.json({ block_id, block_name, district_id });
  } catch (err) {
    console.error('blocks POST error:', err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/* ── Villages ─────────────────────────────────────── */
router.get('/villages', auth, async (req, res) => {
  try {
    const { block_id } = req.query;

    let sql = `
      SELECT v.village_id,
             v.village_name,
             v.block_id,
             v.population,
             v.total_households,
             v.active,
             b.block_name,
             d.district_id,
             d.district_name,
             s.id       AS state_id,
             s.state_name
      FROM village_master v
      JOIN block_master b    ON v.block_id    = b.block_id
      JOIN district_master d ON b.district_id = d.district_id
      JOIN state_master s    ON d.state_id    = s.id
    `;
    const params = [];
    if (block_id) {
      sql += ' WHERE v.block_id = ?';
      params.push(block_id);
    }
    sql += ' ORDER BY v.village_name';

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('villages GET error:', err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/villages', auth, roles('admin'), async (req, res) => {
  try {
    const { village_id, village_name, block_id, population, total_households } = req.body;
    await pool.query(
      'INSERT INTO village_master (village_id, village_name, block_id, population, total_households, active) VALUES (?,?,?,?,?,1)',
      [village_id, village_name, block_id, population || 0, total_households || 0]
    );
    res.json({ village_id, village_name });
  } catch (err) {
    console.error('villages POST error:', err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.put('/villages/:id', auth, roles('admin'), async (req, res) => {
  try {
    const { village_name, block_id, population, total_households, active } = req.body;
    await pool.query(
      'UPDATE village_master SET village_name=?, block_id=?, population=?, total_households=?, active=? WHERE village_id=?',
      [village_name, block_id, population, total_households, active ? 1 : 0, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('villages PUT error:', err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/* ── Geo dropdowns filtered to only levels that have HH data ── */
router.get('/hh-states', auth, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT DISTINCT s.id AS state_id, s.state_name
      FROM state_master s
      JOIN district_master d ON d.state_id = s.id
      JOIN block_master b    ON b.district_id = d.district_id
      JOIN village_master v  ON v.block_id = b.block_id
      JOIN household_master h ON h.village_id = v.village_id
      ORDER BY s.state_name`);
    res.json(rows);
  } catch (err) { res.status(500).json({ message: 'Internal server error' }); }
});

router.get('/hh-districts', auth, async (req, res) => {
  try {
    const { state_id } = req.query;
    const params = [];
    let where = '';
    if (state_id) { where = 'WHERE d.state_id = ?'; params.push(parseInt(state_id, 10)); }
    const [rows] = await pool.query(`
      SELECT DISTINCT d.district_id, d.district_name, d.state_id
      FROM district_master d
      JOIN block_master b    ON b.district_id = d.district_id
      JOIN village_master v  ON v.block_id = b.block_id
      JOIN household_master h ON h.village_id = v.village_id
      ${where}
      ORDER BY d.district_name`, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ message: 'Internal server error' }); }
});

router.get('/hh-blocks', auth, async (req, res) => {
  try {
    const { district_id } = req.query;
    const params = [];
    let where = '';
    if (district_id) { where = 'WHERE b.district_id = ?'; params.push(district_id); }
    const [rows] = await pool.query(`
      SELECT DISTINCT b.block_id, b.block_name, b.district_id
      FROM block_master b
      JOIN village_master v  ON v.block_id = b.block_id
      JOIN household_master h ON h.village_id = v.village_id
      ${where}
      ORDER BY b.block_name`, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ message: 'Internal server error' }); }
});

router.get('/hh-villages', auth, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT DISTINCT
        v.village_id, v.village_name,
        b.block_id,   b.block_name,
        d.district_id, d.district_name,
        s.id AS state_id, s.state_name,
        COUNT(h.household_id) AS hh_count
      FROM village_master v
      JOIN household_master h ON h.village_id  = v.village_id
      JOIN block_master b     ON v.block_id     = b.block_id
      JOIN district_master d  ON b.district_id  = d.district_id
      JOIN state_master s     ON d.state_id     = s.id
      GROUP BY v.village_id, v.village_name, b.block_id, b.block_name,
               d.district_id, d.district_name, s.id, s.state_name
      ORDER BY s.state_name, d.district_name, b.block_name, v.village_name`);
    res.json(rows);
  } catch (err) { res.status(500).json({ message: 'Internal server error' }); }
});

module.exports = router;