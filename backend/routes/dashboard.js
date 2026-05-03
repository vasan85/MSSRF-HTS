const router = require('express').Router();
const pool   = require('../db/pool');
const auth   = require('../middleware/auth');
const cache  = require('../utils/cache');

// Helper: format a MySQL date value to yyyy-MM-dd string safely
function fmtDate(val) {
  if (!val) return null;
  if (val instanceof Date) return val.toISOString().slice(0, 10);
  if (typeof val === 'string') return val.slice(0, 10);
  return String(val).slice(0, 10);
}

// Executive dashboard KPIs — 5-minute cache, single combined query
router.get('/executive', auth, async (req, res) => {
  try {
    const data = await cache.getOrSet('dashboard:executive', 300, async () => {
      const [[kpis]] = await pool.query(`
        SELECT
          (SELECT COUNT(*) FROM project_master WHERE active_status = 1)                          AS total_projects,
          (SELECT COUNT(*) FROM household_master)                                                 AS registered_hh,
          (SELECT COUNT(DISTINCT household_id) FROM project_household_link)                      AS unique_benefitted,
          (SELECT COUNT(*) FROM (
             SELECT household_id FROM project_household_link
             GROUP BY household_id HAVING COUNT(DISTINCT project_id) >= 2) t)                    AS multi_intervention,
          (SELECT COUNT(*) FROM village_master WHERE active = 1)                                 AS total_villages,
          (SELECT COALESCE(SUM(total_households), 0) FROM village_master)                        AS total_village_hh
      `);
      const coverage = kpis.total_village_hh > 0
        ? parseFloat(((kpis.unique_benefitted / kpis.total_village_hh) * 100).toFixed(1))
        : 0;
      return {
        total_projects:     kpis.total_projects,
        registered_hh:      kpis.registered_hh,
        unique_benefitted:  kpis.unique_benefitted,
        coverage_pct:       coverage,
        multi_intervention: kpis.multi_intervention,
        total_villages:     kpis.total_villages,
      };
    });
    res.set('Cache-Control', 'private, max-age=300');
    res.json(data);
  } catch (err) {
    console.error('executive error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Village-wise coverage — 5-minute cache
router.get('/village-coverage', auth, async (req, res) => {
  try {
    const rows = await cache.getOrSet('dashboard:village-coverage', 300, async () => {
      const [data] = await pool.query(`
        SELECT v.village_id, v.village_name, v.total_households,
               COUNT(DISTINCT h.household_id) AS registered_hh,
               COUNT(DISTINCT l.household_id) AS benefitted_hh,
               b.block_id, b.block_name,
               d.district_id, d.district_name,
               s.id AS state_id, s.state_name,
               ROUND(COUNT(DISTINCT l.household_id) / NULLIF(v.total_households,0) * 100, 1) AS coverage_pct
        FROM village_master v
        LEFT JOIN household_master h       ON h.village_id  = v.village_id
        LEFT JOIN project_household_link l ON l.village_id  = v.village_id
        JOIN  block_master b               ON v.block_id    = b.block_id
        JOIN  district_master d            ON b.district_id = d.district_id
        JOIN  state_master s               ON d.state_id    = s.id
        WHERE v.active = 1
        GROUP BY v.village_id, v.village_name, v.total_households,
                 b.block_id, b.block_name, d.district_id, d.district_name, s.id, s.state_name
        ORDER BY s.state_name, d.district_name, b.block_name, v.village_name
      `);
      return data;
    });
    res.set('Cache-Control', 'private, max-age=300');
    res.json(rows);
  } catch (err) {
    console.error('village-coverage error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Project-wise stats
router.get('/project-stats', auth, async (req, res) => {
  try {
    const { project_id } = req.query;
    let sql = `
      SELECT p.project_id, p.project_name, p.project_code,
             p.start_date, p.end_date, p.project_type,
             COUNT(DISTINCT l.household_id) AS total_hh,
             COUNT(DISTINCT CASE WHEN l.status='Active' THEN l.household_id END) AS active_hh,
             COUNT(DISTINCT CASE WHEN h.female_headed_household = 'Yes'
                                 THEN l.household_id END) AS vulnerable_hh,
             COALESCE(SUM(l.monetary_value), 0) AS total_value
      FROM project_master p
      LEFT JOIN project_household_link l ON l.project_id  = p.project_id
      LEFT JOIN household_master h       ON h.household_id = l.household_id
    `;
    const params = [];
    if (project_id) { sql += ' WHERE p.project_id = ?'; params.push(project_id); }
    sql += ' GROUP BY p.project_id, p.project_name, p.project_code, p.start_date, p.end_date, p.project_type';
    const [rows] = await pool.query(sql, params);

    // Normalise date fields so Vue receives yyyy-MM-dd strings, not ISO timestamps
    const normalised = rows.map(r => ({
      ...r,
      start_date: fmtDate(r.start_date),
      end_date:   fmtDate(r.end_date),
    }));
    res.json(normalised);
  } catch (err) {
    console.error('project-stats error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Per-village breakdown for a single project
router.get('/project-village-stats', auth, async (req, res) => {
  try {
    const { project_id } = req.query;
    if (!project_id) return res.status(400).json({ message: 'project_id required' });

    const [rows] = await pool.query(`
      SELECT v.village_id, v.village_name,
             b.block_name, d.district_name,
             COUNT(DISTINCT l.household_id)                                               AS linked_hh,
             COUNT(DISTINCT CASE WHEN l.status='Active'   THEN l.household_id END)        AS active_hh,
             COUNT(DISTINCT CASE WHEN l.status='Pending'  THEN l.household_id END)        AS pending_hh,
             COUNT(DISTINCT CASE WHEN l.status='Partial'  THEN l.household_id END)        AS partial_hh,
             COUNT(DISTINCT CASE WHEN l.status='Closed'   THEN l.household_id END)        AS closed_hh,
             COALESCE(SUM(l.monetary_value), 0)                                           AS total_value,
             MIN(l.enrollment_date)                                                        AS first_enrollment
      FROM project_household_link l
      JOIN village_master v  ON l.village_id  = v.village_id
      JOIN block_master b    ON v.block_id    = b.block_id
      JOIN district_master d ON b.district_id = d.district_id
      WHERE l.project_id = ?
      GROUP BY v.village_id, v.village_name, b.block_name, d.district_name
      ORDER BY linked_hh DESC, v.village_name
    `, [project_id]);

    res.json(rows);
  } catch (err) {
    console.error('project-village-stats error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Benefit type distribution
router.get('/benefit-distribution', auth, async (req, res) => {
  try {
    const { project_id } = req.query;
    let sql = `SELECT benefit_type,
                      COUNT(*) AS count,
                      COALESCE(SUM(monetary_value),0) AS total_value
               FROM project_household_link`;
    const params = [];
    if (project_id) { sql += ' WHERE project_id = ?'; params.push(project_id); }
    sql += ' GROUP BY benefit_type ORDER BY count DESC';
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('benefit-distribution error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Org-wide report metrics
router.get('/org-report', auth, async (req, res) => {
  try {
    const [[row]] = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM household_master)                                                        AS registered_hh,
        (SELECT COUNT(DISTINCT household_id) FROM project_household_link)                              AS unique_benefitted,
        (SELECT COUNT(*) FROM (
           SELECT household_id FROM project_household_link
           GROUP BY household_id HAVING COUNT(DISTINCT project_id) >= 2) t2)                          AS multi_intervention,
        (SELECT ROUND(COUNT(*) / NULLIF(COUNT(DISTINCT household_id),0),1) FROM project_household_link) AS avg_interventions,
        (SELECT COUNT(*) FROM (
           SELECT household_id FROM project_household_link
           GROUP BY household_id HAVING COUNT(DISTINCT project_id) >= 3) t3)                          AS overlap_3plus,
        (SELECT COUNT(*) FROM (
           SELECT v.village_id FROM village_master v
           LEFT JOIN project_household_link l ON l.village_id = v.village_id
           GROUP BY v.village_id, v.total_households
           HAVING COUNT(DISTINCT l.household_id) / NULLIF(v.total_households,0) * 100 > 50) vc)       AS vill_above50,
        (SELECT COUNT(*) FROM village_master WHERE active=1)                                           AS total_vill
    `);

    res.json({
      registered_hh:         row.registered_hh,
      unique_benefitted:     row.unique_benefitted,
      multi_intervention:    row.multi_intervention,
      avg_interventions:     row.avg_interventions,
      overlap_3plus:         row.overlap_3plus,
      village_coverage_ratio: row.total_vill > 0
        ? parseFloat(((row.vill_above50 / row.total_vill) * 100).toFixed(1))
        : 0,
    });
  } catch (err) {
    console.error('org-report error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Shared village GPS coordinates (hardcoded until field GPS is captured for village centroids)
const VILLAGE_COORDS = {
  V01: { lat: 12.9141, lng: 80.2011 },
  V02: { lat: 12.9073, lng: 80.2289 },
  V03: { lat: 12.9208, lng: 80.0736 },
  V04: { lat: 12.9631, lng: 79.9218 },
};
const addCoords = rows => rows.map(r => ({
  ...r,
  lat: VILLAGE_COORDS[r.village_id]?.lat ?? null,
  lng: VILLAGE_COORDS[r.village_id]?.lng ?? null,
}));

// GIS – village locations (Coverage layer)
router.get('/gis-villages', auth, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT v.village_id, v.village_name, v.total_households,
             b.block_name, d.district_name,
             COUNT(DISTINCT h.household_id) AS registered_hh,
             COUNT(DISTINCT l.household_id) AS benefitted_hh,
             ROUND(COUNT(DISTINCT l.household_id) / NULLIF(v.total_households,0) * 100, 1) AS coverage_pct,
             COUNT(DISTINCT CASE WHEN h.gps_latitude IS NOT NULL THEN h.household_id END) AS geotagged_hh
      FROM village_master v
      LEFT JOIN household_master h           ON h.village_id  = v.village_id
      LEFT JOIN project_household_link l     ON l.village_id  = v.village_id
      JOIN  block_master b                   ON v.block_id    = b.block_id
      JOIN  district_master d                ON b.district_id = d.district_id
      WHERE v.active = 1
      GROUP BY v.village_id, v.village_name, v.total_households, b.block_name, d.district_name
    `);
    res.json(addCoords(rows));
  } catch (err) {
    console.error('gis-villages error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GIS – Vulnerability Heat Map (female-headed, differently-abled, migrant HH by village)
router.get('/gis-vulnerability', auth, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT v.village_id, v.village_name, v.total_households,
             b.block_name, d.district_name,
             COUNT(h.household_id) AS total_hh,
             ROUND(SUM(CASE WHEN h.female_headed_household='Yes' THEN 1 ELSE 0 END)*100.0/NULLIF(COUNT(h.household_id),0),1) AS female_hh_pct,
             ROUND(SUM(CASE WHEN h.differently_abled='Yes' THEN 1 ELSE 0 END)*100.0/NULLIF(COUNT(h.household_id),0),1) AS diff_abled_pct,
             ROUND(SUM(CASE WHEN h.migration_status='Migrant' THEN 1 ELSE 0 END)*100.0/NULLIF(COUNT(h.household_id),0),1) AS migrant_pct,
             SUM(CASE WHEN h.female_headed_household='Yes' THEN 1 ELSE 0 END) AS female_hh_count,
             SUM(CASE WHEN h.differently_abled='Yes' THEN 1 ELSE 0 END) AS diff_abled_count,
             SUM(CASE WHEN h.migration_status='Migrant' THEN 1 ELSE 0 END) AS migrant_count
      FROM village_master v
      LEFT JOIN household_master h ON h.village_id = v.village_id
      JOIN block_master b ON v.block_id = b.block_id
      JOIN district_master d ON b.district_id = d.district_id
      WHERE v.active = 1
      GROUP BY v.village_id, v.village_name, v.total_households, b.block_name, d.district_name
    `);
    res.json(addCoords(rows));
  } catch (err) {
    console.error('gis-vulnerability error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GIS – WASH Choropleth (toilet, water, electricity, housing by village)
router.get('/gis-wash', auth, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT v.village_id, v.village_name, v.total_households,
             b.block_name, d.district_name,
             COUNT(h.household_id) AS total_hh,
             ROUND(SUM(CASE WHEN h.type_of_toilet_facility IS NOT NULL AND h.type_of_toilet_facility != ''
               AND h.type_of_toilet_facility != 'Open defecation' THEN 1 ELSE 0 END)*100.0/NULLIF(COUNT(h.household_id),0),1) AS odf_pct,
             ROUND(SUM(CASE WHEN h.primary_water_source='Piped water' THEN 1 ELSE 0 END)*100.0/NULLIF(COUNT(h.household_id),0),1) AS piped_pct,
             ROUND(SUM(CASE WHEN h.access_to_electricity='Yes' THEN 1 ELSE 0 END)*100.0/NULLIF(COUNT(h.household_id),0),1) AS electricity_pct,
             ROUND(SUM(CASE WHEN h.cooking_fuel='LPG' THEN 1 ELSE 0 END)*100.0/NULLIF(COUNT(h.household_id),0),1) AS lpg_pct,
             ROUND(SUM(CASE WHEN h.type_of_house='Pucca' THEN 1 ELSE 0 END)*100.0/NULLIF(COUNT(h.household_id),0),1) AS pucca_pct
      FROM village_master v
      LEFT JOIN household_master h ON h.village_id = v.village_id
      JOIN block_master b ON v.block_id = b.block_id
      JOIN district_master d ON b.district_id = d.district_id
      WHERE v.active = 1
      GROUP BY v.village_id, v.village_name, v.total_households, b.block_name, d.district_name
    `);
    res.json(addCoords(rows));
  } catch (err) {
    console.error('gis-wash error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GIS – Health Risk Choropleth (chronic illness, uninsured, anganwadi by village)
router.get('/gis-health', auth, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT v.village_id, v.village_name, v.total_households,
             b.block_name, d.district_name,
             COUNT(h.household_id) AS total_hh,
             ROUND(SUM(CASE WHEN h.chronic_illness='Yes' THEN 1 ELSE 0 END)*100.0/NULLIF(COUNT(h.household_id),0),1) AS chronic_pct,
             ROUND(SUM(CASE WHEN h.health_insurance='No' OR h.health_insurance IS NULL OR h.health_insurance=''
               THEN 1 ELSE 0 END)*100.0/NULLIF(COUNT(h.household_id),0),1) AS uninsured_pct,
             ROUND(SUM(CASE WHEN h.anganwadi_access='Yes' THEN 1 ELSE 0 END)*100.0/NULLIF(COUNT(h.household_id),0),1) AS anganwadi_pct,
             ROUND(SUM(CASE WHEN h.pregnant_lactating='Yes' THEN 1 ELSE 0 END)*100.0/NULLIF(COUNT(h.household_id),0),1) AS pregnant_pct,
             COALESCE(SUM(h.children_under_5),0) AS children_u5
      FROM village_master v
      LEFT JOIN household_master h ON h.village_id = v.village_id
      JOIN block_master b ON v.block_id = b.block_id
      JOIN district_master d ON b.district_id = d.district_id
      WHERE v.active = 1
      GROUP BY v.village_id, v.village_name, v.total_households, b.block_name, d.district_name
    `);
    res.json(addCoords(rows));
  } catch (err) {
    console.error('gis-health error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GIS – Asset Index Heat Map (land, livestock, SHG, FPO, credit by village)
router.get('/gis-assets', auth, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT v.village_id, v.village_name, v.total_households,
             b.block_name, d.district_name,
             COUNT(h.household_id) AS total_hh,
             ROUND(SUM(CASE WHEN h.land_ownership='Yes' THEN 1 ELSE 0 END)*100.0/NULLIF(COUNT(h.household_id),0),1) AS land_pct,
             ROUND(SUM(CASE WHEN h.livestock_ownership='Yes' THEN 1 ELSE 0 END)*100.0/NULLIF(COUNT(h.household_id),0),1) AS livestock_pct,
             ROUND(SUM(CASE WHEN h.shg_membership='Yes' THEN 1 ELSE 0 END)*100.0/NULLIF(COUNT(h.household_id),0),1) AS shg_pct,
             ROUND(SUM(CASE WHEN h.fpo_membership='Yes' THEN 1 ELSE 0 END)*100.0/NULLIF(COUNT(h.household_id),0),1) AS fpo_pct,
             ROUND(SUM(CASE WHEN h.access_to_credit='Yes' THEN 1 ELSE 0 END)*100.0/NULLIF(COUNT(h.household_id),0),1) AS credit_pct
      FROM village_master v
      LEFT JOIN household_master h ON h.village_id = v.village_id
      JOIN block_master b ON v.block_id = b.block_id
      JOIN district_master d ON b.district_id = d.district_id
      WHERE v.active = 1
      GROUP BY v.village_id, v.village_name, v.total_households, b.block_name, d.district_name
    `);
    res.json(addCoords(rows));
  } catch (err) {
    console.error('gis-assets error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GIS – households with GPS coordinates
router.get('/gis-households', auth, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT h.household_id, h.head_name, h.gps_latitude, h.gps_longitude, h.village_id,
             h.social_category, h.female_headed_household, h.status,
             v.village_name,
             COUNT(l.record_id) AS project_count
      FROM household_master h
      JOIN  village_master v                 ON h.village_id  = v.village_id
      LEFT JOIN project_household_link l     ON l.household_id = h.household_id
      WHERE h.gps_latitude IS NOT NULL AND h.gps_longitude IS NOT NULL
      GROUP BY h.household_id, h.head_name, h.gps_latitude, h.gps_longitude,
               h.village_id, h.social_category, h.female_headed_household, h.status, v.village_name
    `);
    res.json(rows);
  } catch (err) {
    console.error('gis-households error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Form-based household KPIs for Executive Dashboard
router.get('/form-kpis', auth, async (req, res) => {
  try {
    // Single scan of household_master for all percentage KPIs
    const [[hh], [socialCat], [incomeDist], [[members]]] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*) as total,
          ROUND(SUM(CASE WHEN type_of_toilet_facility IS NOT NULL
            AND type_of_toilet_facility != '' AND type_of_toilet_facility != 'Open defecation'
            THEN 1 ELSE 0 END)*100.0/NULLIF(COUNT(*),0),1) as odf_pct,
          ROUND(SUM(CASE WHEN primary_water_source='Piped water' THEN 1 ELSE 0 END)*100.0/NULLIF(COUNT(*),0),1) as piped_pct,
          ROUND(SUM(CASE WHEN access_to_electricity='Yes' THEN 1 ELSE 0 END)*100.0/NULLIF(COUNT(*),0),1) as electricity_pct,
          ROUND(SUM(CASE WHEN type_of_house='Pucca' THEN 1 ELSE 0 END)*100.0/NULLIF(COUNT(*),0),1) as pucca_pct,
          ROUND(SUM(CASE WHEN cooking_fuel='LPG' THEN 1 ELSE 0 END)*100.0/NULLIF(COUNT(*),0),1) as lpg_pct,
          ROUND(SUM(CASE WHEN gps_latitude IS NOT NULL THEN 1 ELSE 0 END)*100.0/NULLIF(COUNT(*),0),1) as gps_pct,
          SUM(CASE WHEN type_of_house='Pucca' THEN 1 ELSE 0 END) as pucca_count,
          SUM(CASE WHEN type_of_house='Kutcha' THEN 1 ELSE 0 END) as kutcha_count,
          SUM(CASE WHEN type_of_house='Semi-pucca' THEN 1 ELSE 0 END) as semipucca_count,
          ROUND(SUM(CASE WHEN chronic_illness='Yes' THEN 1 ELSE 0 END)*100.0/NULLIF(COUNT(*),0),1) as chronic_pct,
          ROUND(SUM(CASE WHEN health_insurance='Yes' THEN 1 ELSE 0 END)*100.0/NULLIF(COUNT(*),0),1) as insurance_pct,
          ROUND(SUM(CASE WHEN anganwadi_access='Yes' THEN 1 ELSE 0 END)*100.0/NULLIF(COUNT(*),0),1) as anganwadi_pct,
          ROUND(SUM(CASE WHEN pregnant_lactating='Yes' THEN 1 ELSE 0 END)*100.0/NULLIF(COUNT(*),0),1) as pregnant_pct,
          COALESCE(SUM(children_under_5),0) as children_u5,
          ROUND(SUM(CASE WHEN children_attending_school IN ('All','Some') THEN 1 ELSE 0 END)*100.0/NULLIF(COUNT(*),0),1) as school_pct,
          ROUND(SUM(CASE WHEN dropout_cases='Yes' THEN 1 ELSE 0 END)*100.0/NULLIF(COUNT(*),0),1) as dropout_pct,
          ROUND(SUM(CASE WHEN shg_membership='Yes' THEN 1 ELSE 0 END)*100.0/NULLIF(COUNT(*),0),1) as shg_pct,
          SUM(CASE WHEN shg_membership='Yes' THEN 1 ELSE 0 END) as shg_count,
          ROUND(SUM(CASE WHEN fpo_membership='Yes' THEN 1 ELSE 0 END)*100.0/NULLIF(COUNT(*),0),1) as fpo_pct,
          SUM(CASE WHEN fpo_membership='Yes' THEN 1 ELSE 0 END) as fpo_count,
          ROUND(SUM(CASE WHEN land_ownership='Yes' THEN 1 ELSE 0 END)*100.0/NULLIF(COUNT(*),0),1) as land_pct,
          ROUND(SUM(CASE WHEN livestock_ownership='Yes' THEN 1 ELSE 0 END)*100.0/NULLIF(COUNT(*),0),1) as livestock_pct,
          ROUND(SUM(CASE WHEN female_headed_household='Yes' THEN 1 ELSE 0 END)*100.0/NULLIF(COUNT(*),0),1) as female_hh_pct,
          SUM(CASE WHEN female_headed_household='Yes' THEN 1 ELSE 0 END) as female_hh_count,
          ROUND(SUM(CASE WHEN differently_abled='Yes' THEN 1 ELSE 0 END)*100.0/NULLIF(COUNT(*),0),1) as diff_abled_pct,
          ROUND(SUM(CASE WHEN migration_status='Migrant' THEN 1 ELSE 0 END)*100.0/NULLIF(COUNT(*),0),1) as migrant_pct,
          ROUND(SUM(CASE WHEN access_to_credit='Yes' THEN 1 ELSE 0 END)*100.0/NULLIF(COUNT(*),0),1) as credit_pct
        FROM household_master`),
      pool.query(`
        SELECT social_category, COUNT(*) as count
        FROM household_master
        WHERE social_category IS NOT NULL AND social_category NOT IN ('','Prefer not to say')
        GROUP BY social_category ORDER BY count DESC`),
      pool.query(`
        SELECT monthly_income as label, COUNT(*) as count
        FROM household_master
        WHERE monthly_income IS NOT NULL AND monthly_income != ''
        GROUP BY monthly_income ORDER BY count DESC LIMIT 8`),
      pool.query(`
        SELECT COUNT(*) as total_members,
               ROUND(AVG(NULLIF(age,0)),1) as avg_age,
               SUM(CASE WHEN differently_abled='Yes' THEN 1 ELSE 0 END) as diff_abled_count,
               SUM(CASE WHEN shg_membership='Yes' THEN 1 ELSE 0 END) as shg_members,
               SUM(CASE WHEN fpo_membership='Yes' THEN 1 ELSE 0 END) as fpo_members
        FROM household_members`),
    ]);

    const r = hh[0];
    res.json({
      wash: {
        total: r.total, odf_pct: r.odf_pct, piped_pct: r.piped_pct,
        electricity_pct: r.electricity_pct, pucca_pct: r.pucca_pct, lpg_pct: r.lpg_pct,
        gps_pct: r.gps_pct, pucca_count: r.pucca_count, kutcha_count: r.kutcha_count,
        semipucca_count: r.semipucca_count,
      },
      health: {
        chronic_pct: r.chronic_pct, insurance_pct: r.insurance_pct,
        anganwadi_pct: r.anganwadi_pct, pregnant_pct: r.pregnant_pct, children_u5: r.children_u5,
      },
      education: { school_pct: r.school_pct, dropout_pct: r.dropout_pct },
      livelihood: {
        shg_pct: r.shg_pct, shg_count: r.shg_count, fpo_pct: r.fpo_pct, fpo_count: r.fpo_count,
        land_pct: r.land_pct, livestock_pct: r.livestock_pct, female_hh_pct: r.female_hh_pct,
        female_hh_count: r.female_hh_count, diff_abled_pct: r.diff_abled_pct,
        migrant_pct: r.migrant_pct, credit_pct: r.credit_pct,
      },
      social_category: socialCat,
      income_distribution: incomeDist,
      members,
    });
  } catch (err) {
    console.error('form-kpis error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;