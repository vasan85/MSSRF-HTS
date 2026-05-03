const express = require('express');
const { AsyncLocalStorage } = require('async_hooks');
const router = express.Router();
const pool = require('../db/pool');
const auth = require('../middleware/auth');

function getGeoFilterParts(req) {
  const state = (req.query.state || '').trim();
  const district = (req.query.district || '').trim();
  const block = (req.query.block || '').trim();
  const village = (req.query.village || '').trim();

  const conditions = [];
  const params = [];

  if (state) {
    conditions.push('state_name = ?');
    params.push(state);
  }
  if (district) {
    conditions.push('district_name = ?');
    params.push(district);
  }
  if (block) {
    conditions.push('block_name = ?');
    params.push(block);
  }
  if (village) {
    conditions.push('village_name = ?');
    params.push(village);
  }

  return { conditions, params };
}

function buildGeoAwareSql(req, sql) {
  if (!/\bhousehold_master\b/i.test(sql)) {
    return { sql, params: [] };
  }

  const { conditions, params } = getGeoFilterParts(req);
  if (!conditions.length) {
    return { sql, params: [] };
  }

  const cte = `WITH filtered_households AS (SELECT * FROM household_master WHERE ${conditions.join(' AND ')})`;
  const rewrittenSql = sql.replace(/\bhousehold_master\b/gi, 'filtered_households');

  return {
    sql: `${cte} ${rewrittenSql}`,
    params
  };
}

// Request-scoped context — does NOT touch the global pool.query
const reportRequestContext = new AsyncLocalStorage();

function query(sql, params = []) {
  const store = reportRequestContext.getStore();
  const req = store?.req;
  const normalizedParams = Array.isArray(params) ? params : [params];
  // geo-options populates its own dropdowns and must not have geo-filtering applied
  if (!req || req.path === '/geo-options') return pool.query(sql, normalizedParams);
  const { sql: geoSql, params: geoParams } = buildGeoAwareSql(req, sql);
  return pool.query(geoSql, [...geoParams, ...normalizedParams]);
}

router.use((req, res, next) => {
  reportRequestContext.run({ req }, next);
});

router.get('/geo-options', async (req, res) => {
  try {
    const state = (req.query.state || '').trim();
    const district = (req.query.district || '').trim();
    const block = (req.query.block || '').trim();

    const [states] = await query(`
      SELECT DISTINCT state_name as value
      FROM household_master
      WHERE state_name IS NOT NULL AND state_name != ''
      ORDER BY state_name
    `);

    const districtParams = [];
    let districtWhere = "district_name IS NOT NULL AND district_name != ''";
    if (state) {
      districtWhere += ' AND state_name = ?';
      districtParams.push(state);
    }

    const [districts] = await query(`
      SELECT DISTINCT district_name as value
      FROM household_master
      WHERE ${districtWhere}
      ORDER BY district_name
    `, districtParams);

    const blockParams = [];
    let blockWhere = "block_name IS NOT NULL AND block_name != ''";
    if (state) {
      blockWhere += ' AND state_name = ?';
      blockParams.push(state);
    }
    if (district) {
      blockWhere += ' AND district_name = ?';
      blockParams.push(district);
    }

    const [blocks] = await query(`
      SELECT DISTINCT block_name as value
      FROM household_master
      WHERE ${blockWhere}
      ORDER BY block_name
    `, blockParams);

    const villageParams = [];
    let villageWhere = "village_name IS NOT NULL AND village_name != ''";
    if (state) {
      villageWhere += ' AND state_name = ?';
      villageParams.push(state);
    }
    if (district) {
      villageWhere += ' AND district_name = ?';
      villageParams.push(district);
    }
    if (block) {
      villageWhere += ' AND block_name = ?';
      villageParams.push(block);
    }

    const [villages] = await query(`
      SELECT DISTINCT village_name as value
      FROM household_master
      WHERE ${villageWhere}
      ORDER BY village_name
    `, villageParams);

    res.json({
      states: states.map(s => s.value),
      districts: districts.map(d => d.value),
      blocks: blocks.map(b => b.value),
      villages: villages.map(v => v.value)
    });
  } catch (error) {
    console.error('Geo options error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Demographic KPI
router.get('/demographic-kpi', async (req, res) => {
  try {
    const [rows] = await query(`
      SELECT 
        COUNT(DISTINCT h.household_id) as total_hh,
        ROUND(SUM(CASE WHEN h.marital_status='Widowed' THEN 1 ELSE 0 END)*100.0/COUNT(*), 1) as female_headed_pct,
        ROUND(SUM(CASE WHEN h.differently_abled='Yes' THEN 1 ELSE 0 END)*100.0/COUNT(*), 1) as differently_abled_pct,
        ROUND(SUM(CASE WHEN h.monthly_income_exact=0 OR h.monthly_income_exact IS NULL THEN 1 ELSE 0 END)*100.0/COUNT(*), 1) as zero_income_pct,
        (SELECT COUNT(*) FROM household_members m2 JOIN household_master h2 ON h2.household_id = m2.household_id) as total_members
      FROM household_master h
    `);
    res.json(rows[0] || {});
  } catch (error) {
    console.error('Demographic KPI error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Population Pyramid
router.get('/population-pyramid', async (req, res) => {
  try {
    const [rows] = await query(`
      SELECT 
        age_group,
        SUM(total_count) as total_count
      FROM (
        SELECT 
          CASE 
            WHEN age < 10 THEN '0-9'
            WHEN age < 20 THEN '10-19'
            WHEN age < 30 THEN '20-29'
            WHEN age < 40 THEN '30-39'
            WHEN age < 50 THEN '40-49'
            WHEN age < 60 THEN '50-59'
            ELSE '60+'
          END as age_group,
          1 as total_count,
          CASE 
            WHEN age < 10 THEN 1
            WHEN age < 20 THEN 2
            WHEN age < 30 THEN 3
            WHEN age < 40 THEN 4
            WHEN age < 50 THEN 5
            WHEN age < 60 THEN 6
            ELSE 7
          END as sort_order
        FROM household_members m
        JOIN household_master h ON h.household_id = m.household_id
        WHERE age IS NOT NULL
      ) age_data
      GROUP BY age_group, sort_order
      ORDER BY sort_order
    `);
    
    const ageGroups = rows.map(r => r.age_group);
    const males = rows.map(r => Math.floor(r.total_count / 2));
    const females = rows.map(r => Math.ceil(r.total_count / 2));
    
    res.json({ ageGroups, males, females });
  } catch (error) {
    console.error('Population pyramid error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Social Category Distribution
router.get('/social-category', auth, async (req, res) => {
  try {
    const [rows] = await query(`
      SELECT social_category as category, COUNT(*) as count
      FROM household_master
      WHERE social_category IS NOT NULL
      GROUP BY social_category
      ORDER BY count DESC
    `);
    res.json(rows);
  } catch (error) {
    console.error('Social category error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Marital Status Distribution
router.get('/marital-status', auth, async (req, res) => {
  try {
    const [rows] = await query(`
      SELECT marital_status as status, COUNT(*) as count
      FROM household_master
      WHERE marital_status IS NOT NULL
      GROUP BY marital_status
      ORDER BY count DESC
    `);
    res.json(rows);
  } catch (error) {
    console.error('Marital status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Vulnerability Heatmap
router.get('/vulnerability-heatmap', async (req, res) => {
  try {
    const [rows] = await query(`
      SELECT 
        h.block_name as block,
        COUNT(DISTINCT CASE WHEN h.marital_status='Widowed' THEN h.household_id END) as female_headed,
        COUNT(DISTINCT CASE WHEN h.differently_abled='Yes' THEN h.household_id END) as differently_abled,
        COUNT(DISTINCT CASE WHEN h.monthly_income_exact < 5000 THEN h.household_id END) as low_income,
        (COUNT(DISTINCT CASE WHEN h.marital_status='Widowed' THEN h.household_id END) + 
         COUNT(DISTINCT CASE WHEN h.differently_abled='Yes' THEN h.household_id END) +
         COUNT(DISTINCT CASE WHEN h.monthly_income_exact < 5000 THEN h.household_id END)) as risk_score
      FROM household_master h
      WHERE h.block_name IS NOT NULL
      GROUP BY h.block_name
      ORDER BY risk_score DESC
    `);
    res.json(rows);
  } catch (error) {
    console.error('Vulnerability heatmap error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Education Crosstab
router.get('/education-crosstab', async (req, res) => {
  try {
    const [rows] = await query(`
      SELECT 
        h.social_category as category,
        SUM(CASE WHEN m.education LIKE '%Illiterate%' OR m.education IS NULL THEN 1 ELSE 0 END) as illiterate,
        SUM(CASE WHEN m.education LIKE '%Primary%' OR m.education LIKE '%1st%' OR m.education LIKE '%5th%' THEN 1 ELSE 0 END) as pri_edu,
        SUM(CASE WHEN m.education LIKE '%Secondary%' OR m.education LIKE '%10th%' OR m.education LIKE '%12th%' THEN 1 ELSE 0 END) as sec_edu,
        SUM(CASE WHEN m.education LIKE '%Graduate%' OR m.education LIKE '%Degree%' OR m.education LIKE '%Professional%' THEN 1 ELSE 0 END) as graduate
      FROM household_master h
      LEFT JOIN household_members m ON h.household_id = m.household_id
      WHERE h.social_category IS NOT NULL
      GROUP BY h.social_category
    `);
    res.json(rows);
  } catch (error) {
    console.error('Education crosstab error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Occupation Crosstab
router.get('/occupation-crosstab', async (req, res) => {
  try {
    const [rows] = await query(`
      SELECT 
        occupation,
        COUNT(*) as total
      FROM household_members
      WHERE occupation IS NOT NULL AND occupation != ''
      GROUP BY occupation
      ORDER BY total DESC
      LIMIT 10
    `);
    // Add dummy male/female split for visualization
    const formatted = rows.map(r => ({
      occupation: r.occupation,
      male: Math.floor(r.total / 2),
      female: Math.ceil(r.total / 2),
      total: r.total
    }));
    res.json(formatted);
  } catch (error) {
    console.error('Occupation crosstab error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ============== 2. LIVELIHOOD & ECONOMIC REPORTS ==============

// Livelihood KPI
router.get('/livelihood-kpi', auth, async (req, res) => {
  try {
    const [rows] = await query(`
      SELECT 
        ROUND(AVG(monthly_income_exact), 0) as avg_monthly_income,
        ROUND(SUM(CASE WHEN occupation LIKE '%Agri%' OR occupation LIKE '%Farm%' THEN 1 ELSE 0 END)*100.0/COUNT(*), 1) as agri_dependent_pct,
        ROUND(SUM(CASE WHEN (COALESCE(shg_loan_savings,0) + COALESCE(shg_loan_bank,0) + COALESCE(shg_loan_mfi,0) + COALESCE(shg_loan_others,0)) > 0 THEN 1 ELSE 0 END)*100.0/COUNT(*), 1) as households_with_loan,
        COUNT(DISTINCT CASE WHEN shg_membership='Yes' THEN household_id END) as shg_members
      FROM household_master
    `);
    res.json(rows[0] || {});
  } catch (error) {
    console.error('Livelihood KPI error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Income Bracket Distribution
router.get('/income-bracket', auth, async (req, res) => {
  try {
    const [rows] = await query(`
      SELECT 
        CASE 
          WHEN monthly_income_exact < 5000 THEN '<5k'
          WHEN monthly_income_exact < 10000 THEN '5k-10k'
          WHEN monthly_income_exact < 15000 THEN '10k-15k'
          WHEN monthly_income_exact < 20000 THEN '15k-20k'
          ELSE '>20k'
        END as income_bracket,
        SUM(CASE WHEN shg_membership='Yes' THEN 1 ELSE 0 END) as shg_members,
        SUM(CASE WHEN shg_membership!='Yes' OR shg_membership IS NULL THEN 1 ELSE 0 END) as non_members
      FROM household_master
      WHERE monthly_income_exact IS NOT NULL
      GROUP BY income_bracket
      ORDER BY FIELD(income_bracket, '<5k', '5k-10k', '10k-15k', '15k-20k', '>20k')
    `);
    
    const brackets = ['<5k', '5k-10k', '10k-15k', '15k-20k', '>20k'];
    const shgMembers = brackets.map(b => rows.find(r => r.income_bracket === b)?.shg_members || 0);
    const nonMembers = brackets.map(b => rows.find(r => r.income_bracket === b)?.non_members || 0);
    
    res.json({ brackets, shgMembers, nonMembers });
  } catch (error) {
    console.error('Income bracket error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Occupation vs Income
router.get('/occupation-income', auth, async (req, res) => {
  try {
    const [rows] = await query(`
      SELECT 
        occupation,
        ROUND(AVG(monthly_income), 0) as avg_income,
        COUNT(*) as count
      FROM household_members
      WHERE occupation IS NOT NULL AND monthly_income IS NOT NULL
      GROUP BY occupation
      HAVING COUNT(*) >= 2
      ORDER BY avg_income DESC
      LIMIT 10
    `);
    
    const data = rows.map((r, i) => ({
      x: i,
      y: r.avg_income,
      r: Math.sqrt(r.count) * 10,
      label: r.occupation
    }));
    
    res.json(data);
  } catch (error) {
    console.error('Occupation income error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Loan Source Distribution
router.get('/loan-source', auth, async (req, res) => {
  try {
    const [rows] = await query(`
      SELECT 
        'SHG Savings' as source,
        COUNT(*) as households,
        ROUND(AVG(shg_loan_savings), 0) as avg_loan
      FROM household_master
      WHERE shg_loan_savings > 0
      UNION ALL
      SELECT 
        'Bank' as source,
        COUNT(*) as households,
        ROUND(AVG(shg_loan_bank), 0) as avg_loan
      FROM household_master
      WHERE shg_loan_bank > 0
      UNION ALL
      SELECT 
        'MFI' as source,
        COUNT(*) as households,
        ROUND(AVG(shg_loan_mfi), 0) as avg_loan
      FROM household_master
      WHERE shg_loan_mfi > 0
      UNION ALL
      SELECT 
        'Others' as source,
        COUNT(*) as households,
        ROUND(AVG(shg_loan_others), 0) as avg_loan
      FROM household_master
      WHERE shg_loan_others > 0
      ORDER BY households DESC
    `);
    res.json(rows);
  } catch (error) {
    console.error('Loan source error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Loan Utilisation Pattern
router.get('/loan-utilisation', auth, async (req, res) => {
  try {
    const [rows] = await query(`
      SELECT 
        h.block_name as block,
        ROUND(SUM(COALESCE(h.shg_loan_savings,0))/1000, 0) as shg_savings,
        ROUND(SUM(COALESCE(h.shg_loan_bank,0))/1000, 0) as bank,
        ROUND(SUM(COALESCE(h.shg_loan_mfi,0))/1000, 0) as mfi,
        ROUND(SUM(COALESCE(h.shg_loan_others,0))/1000, 0) as others,
        ROUND(SUM(COALESCE(h.shg_loan_savings,0) + COALESCE(h.shg_loan_bank,0) + COALESCE(h.shg_loan_mfi,0) + COALESCE(h.shg_loan_others,0))/1000, 0) as total
      FROM household_master h
      WHERE h.block_name IS NOT NULL
      GROUP BY h.block_name
      ORDER BY total DESC
    `);
    res.json(rows);
  } catch (error) {
    console.error('Loan utilisation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ============== 3. COMMUNITY INSTITUTIONS REPORTS ==============

// Community KPI
router.get('/community-kpi', auth, async (req, res) => {
  try {
    const [rows] = await query(`
      SELECT 
        ROUND(SUM(CASE WHEN shg_membership='Yes' THEN 1 ELSE 0 END)*100.0/COUNT(*), 1) as shg_pct,
        ROUND(SUM(CASE WHEN fpo_membership='Yes' THEN 1 ELSE 0 END)*100.0/COUNT(*), 1) as fpo_pct,
        ROUND(SUM(CASE WHEN gp_elected_member='Yes' THEN 1 ELSE 0 END)*100.0/COUNT(*), 1) as gp_members_pct,
        ROUND(AVG(COALESCE(shg_loan_savings,0) + COALESCE(shg_loan_bank,0) + COALESCE(shg_loan_mfi,0) + COALESCE(shg_loan_others,0)), 0) as avg_shg_loan,
        COUNT(*) as total_cbos
      FROM household_master
    `);
    res.json(rows[0] || {});
  } catch (error) {
    console.error('Community KPI error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Membership Funnel (SHG → FPO → GP)
router.get('/membership-funnel', auth, async (req, res) => {
  try {
    const [rows] = await query(`
      SELECT 
        SUM(CASE WHEN shg_membership='Yes' THEN 1 ELSE 0 END) as shg,
        SUM(CASE WHEN fpo_membership='Yes' THEN 1 ELSE 0 END) as fpo,
        SUM(CASE WHEN gp_elected_member='Yes' THEN 1 ELSE 0 END) as gp
      FROM household_master
    `);
    
    const data = [
      { stage: 'SHG Members', value: rows[0].shg || 0 },
      { stage: 'FPO Members', value: rows[0].fpo || 0 },
      { stage: 'GP Representatives', value: rows[0].gp || 0 }
    ];
    
    res.json(data);
  } catch (error) {
    console.error('Membership funnel error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// FPO Type Distribution
router.get('/fpo-type', auth, async (req, res) => {
  try {
    const [rows] = await query(`
      SELECT fpo_type as type, COUNT(*) as count
      FROM household_master
      WHERE fpo_type IS NOT NULL AND fpo_type != ''
      GROUP BY fpo_type
      ORDER BY count DESC
    `);
    res.json(rows);
  } catch (error) {
    console.error('FPO type error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GP Representation
router.get('/gp-representation', auth, async (req, res) => {
  try {
    const [rows] = await query(`
      SELECT 
        h.block_name as block,
        COUNT(*) as total_households,
        SUM(CASE WHEN h.gp_elected_member='Yes' THEN 1 ELSE 0 END) as gp_members,
        ROUND(SUM(CASE WHEN h.gp_elected_member='Yes' THEN 1 ELSE 0 END)*100.0/COUNT(*), 1) as pct
      FROM household_master h
      WHERE h.block_name IS NOT NULL
      GROUP BY h.block_name
      ORDER BY pct DESC
    `);
    res.json(rows);
  } catch (error) {
    console.error('GP representation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ============== 4. WASH & HOUSING REPORTS ==============

// WASH KPI
router.get('/wash-kpi', auth, async (req, res) => {
  try {
    const [rows] = await query(`
      SELECT
        ROUND(SUM(CASE WHEN type_of_toilet_facility IS NOT NULL AND type_of_toilet_facility!='' AND type_of_toilet_facility!='Open defecation' THEN 1 ELSE 0 END)*100.0/NULLIF(COUNT(*),0), 1) as odf_pct,
        ROUND(SUM(CASE WHEN primary_water_source='Piped water' THEN 1 ELSE 0 END)*100.0/NULLIF(COUNT(*),0), 1) as piped_water_pct,
        ROUND(SUM(CASE WHEN cooking_fuel='LPG' THEN 1 ELSE 0 END)*100.0/NULLIF(COUNT(*),0), 1) as lpg_pct,
        ROUND(SUM(CASE WHEN access_to_electricity='Yes' THEN 1 ELSE 0 END)*100.0/NULLIF(COUNT(*),0), 1) as electricity_pct,
        ROUND(SUM(CASE WHEN type_of_house='Pucca' THEN 1 ELSE 0 END)*100.0/NULLIF(COUNT(*),0), 1) as pucca_house_pct
      FROM household_master
    `);
    res.json(rows[0] || {});
  } catch (error) {
    console.error('WASH KPI error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// House Type Distribution by Block
router.get('/house-type', auth, async (req, res) => {
  try {
    const [rows] = await query(`
      SELECT
        b.block_name as block,
        ROUND(SUM(CASE WHEN h.type_of_house='Kutcha' THEN 1 ELSE 0 END)*100.0/NULLIF(COUNT(*),0), 1) as kutcha_pct,
        ROUND(SUM(CASE WHEN h.type_of_house='Semi-pucca' THEN 1 ELSE 0 END)*100.0/NULLIF(COUNT(*),0), 1) as semi_pucca_pct,
        ROUND(SUM(CASE WHEN h.type_of_house='Pucca' THEN 1 ELSE 0 END)*100.0/NULLIF(COUNT(*),0), 1) as pucca_pct
      FROM household_master h
      JOIN village_master v ON h.village_id = v.village_id
      JOIN block_master b ON v.block_id = b.block_id
      GROUP BY b.block_name
    `);
    res.json(rows);
  } catch (error) {
    console.error('House type error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ODF Progress by Block
router.get('/odf-progress', auth, async (req, res) => {
  try {
    const [rows] = await query(`
      SELECT
        b.block_name as block,
        COUNT(*) as total_hh,
        SUM(CASE WHEN h.type_of_toilet_facility IS NOT NULL AND h.type_of_toilet_facility!='' AND h.type_of_toilet_facility!='Open defecation' THEN 1 ELSE 0 END) as with_toilet,
        ROUND(SUM(CASE WHEN h.type_of_toilet_facility IS NOT NULL AND h.type_of_toilet_facility!='' AND h.type_of_toilet_facility!='Open defecation' THEN 1 ELSE 0 END)*100.0/NULLIF(COUNT(*),0), 1) as toilet_pct,
        ROUND(SUM(CASE WHEN h.type_of_toilet_facility='Open defecation' OR h.type_of_toilet_facility IS NULL OR h.type_of_toilet_facility='' THEN 1 ELSE 0 END)*100.0/NULLIF(COUNT(*),0), 1) as odf_pct
      FROM household_master h
      JOIN village_master v ON h.village_id = v.village_id
      JOIN block_master b ON v.block_id = b.block_id
      GROUP BY b.block_name
    `);
    res.json(rows);
  } catch (error) {
    console.error('ODF progress error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// WASH Radar Chart Data
router.get('/wash-radar', auth, async (req, res) => {
  try {
    const [rows] = await query(`
      SELECT
        ROUND(SUM(CASE WHEN primary_water_source IN ('Piped water', 'Borewell') THEN 1 ELSE 0 END)*100.0/NULLIF(COUNT(*),0), 1) as water,
        ROUND(SUM(CASE WHEN type_of_toilet_facility IS NOT NULL AND type_of_toilet_facility!='' AND type_of_toilet_facility!='Open defecation' THEN 1 ELSE 0 END)*100.0/NULLIF(COUNT(*),0), 1) as toilet,
        ROUND(SUM(CASE WHEN handwashing_facility='Yes' THEN 1 ELSE 0 END)*100.0/NULLIF(COUNT(*),0), 1) as handwashing,
        ROUND(SUM(CASE WHEN solid_waste_disposal IN ('Collected by municipality', 'Composting') THEN 1 ELSE 0 END)*100.0/NULLIF(COUNT(*),0), 1) as waste,
        ROUND(SUM(CASE WHEN cooking_fuel IN ('LPG', 'Biogas', 'Electricity') THEN 1 ELSE 0 END)*100.0/NULLIF(COUNT(*),0), 1) as fuel,
        ROUND(SUM(CASE WHEN access_to_electricity='Yes' THEN 1 ELSE 0 END)*100.0/NULLIF(COUNT(*),0), 1) as electricity
      FROM household_master
    `);
    res.json(rows[0] || {});
  } catch (error) {
    console.error('WASH radar error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Water Source Map
router.get('/water-source-map', auth, async (req, res) => {
  try {
    const [rows] = await query(`
      SELECT 
        village_name,
        gps_latitude as lat,
        gps_longitude as lng,
        'Well' as source
      FROM household_master
      WHERE gps_latitude IS NOT NULL AND gps_longitude IS NOT NULL
      LIMIT 100
    `);
    res.json(rows);
  } catch (error) {
    console.error('Water source map error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ============== 5. HEALTH & EDUCATION REPORTS ==============

// Health KPI
router.get('/health-kpi', auth, async (req, res) => {
  try {
    const [rows] = await query(`
      SELECT
        ROUND(SUM(CASE WHEN chronic_illness='Yes' THEN 1 ELSE 0 END)*100.0/NULLIF(COUNT(*),0), 1) as chronic_illness_pct,
        ROUND(SUM(CASE WHEN health_insurance='Yes' THEN 1 ELSE 0 END)*100.0/NULLIF(COUNT(*),0), 1) as insurance_coverage_pct,
        ROUND(SUM(CASE WHEN immunization_status NOT IN ('Not immunized','') AND immunization_status IS NOT NULL THEN 1 ELSE 0 END)*100.0/NULLIF(COUNT(*),0), 1) as immunisation_rate,
        ROUND(SUM(CASE WHEN anganwadi_access='Yes' THEN 1 ELSE 0 END)*100.0/NULLIF(COUNT(*),0), 1) as anganwadi_access_pct,
        ROUND(SUM(CASE WHEN children_attending_school IN ('All','Some') THEN 1 ELSE 0 END)*100.0/NULLIF(SUM(CASE WHEN children_attending_school IS NOT NULL AND children_attending_school!='' THEN 1 ELSE 0 END),0), 1) as school_enrolment_pct
      FROM household_master
    `);
    res.json(rows[0] || {});
  } catch (error) {
    console.error('Health KPI error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Risk Matrix (2x2: insured/uninsured x chronic/not)
router.get('/risk-matrix', auth, async (req, res) => {
  try {
    const [rows] = await query(`
      SELECT
        SUM(CASE WHEN health_insurance='No' AND chronic_illness='Yes' THEN 1 ELSE 0 END) as high_risk,
        SUM(CASE WHEN health_insurance='No' AND chronic_illness='No' THEN 1 ELSE 0 END) as medium_risk,
        SUM(CASE WHEN health_insurance='Yes' AND chronic_illness='Yes' THEN 1 ELSE 0 END) as medium_risk_2,
        SUM(CASE WHEN health_insurance='Yes' AND chronic_illness='No' THEN 1 ELSE 0 END) as low_risk
      FROM household_master
    `);
    res.json(rows);
  } catch (error) {
    console.error('Risk matrix error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Education Dropout Funnel
router.get('/dropout-funnel', auth, async (req, res) => {
  try {
    const [rows] = await query(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN children_attending_school IN ('All','Some') THEN 1 ELSE 0 END) as enrolled,
        SUM(CASE WHEN children_attending_school='All' THEN 1 ELSE 0 END) as all_attending,
        SUM(CASE WHEN dropout_cases='Yes' THEN 1 ELSE 0 END) as dropout
      FROM household_master
      WHERE children_attending_school IS NOT NULL AND children_attending_school != ''
    `);
    const r = rows[0];
    const total = r.total || 1;
    const data = [
      { stage: 'Enrolled', count: r.enrolled, pct: Math.round(r.enrolled / total * 100) },
      { stage: 'All Attending', count: r.all_attending, pct: Math.round(r.all_attending / total * 100) },
      { stage: 'Dropout', count: r.dropout, pct: Math.round(r.dropout / total * 100) }
    ];
    res.json(data);
  } catch (error) {
    console.error('Dropout funnel error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Immunisation Status by Block
router.get('/immunisation', auth, async (req, res) => {
  try {
    const [rows] = await query(`
      SELECT
        b.block_name as block,
        SUM(CASE WHEN h.immunization_status NOT IN ('Not immunized','Partially') AND h.immunization_status IS NOT NULL AND h.immunization_status!='' THEN 1 ELSE 0 END) as full,
        SUM(CASE WHEN h.immunization_status='Partially' THEN 1 ELSE 0 END) as partial,
        SUM(CASE WHEN h.immunization_status='Not immunized' OR h.immunization_status IS NULL OR h.immunization_status='' THEN 1 ELSE 0 END) as none
      FROM household_master h
      JOIN village_master v ON h.village_id = v.village_id
      JOIN block_master b ON v.block_id = b.block_id
      GROUP BY b.block_name
    `);
    res.json(rows);
  } catch (error) {
    console.error('Immunisation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Targeting Register
router.get('/targeting-register', auth, async (req, res) => {
  try {
    const [rows] = await query(`
      SELECT
        h.household_id,
        v.village_name as village,
        CASE
          WHEN h.health_insurance='No' AND h.chronic_illness='Yes' THEN 'Uninsured + Chronic Illness'
          WHEN h.dropout_cases='Yes' THEN 'School Dropout'
          WHEN h.immunization_status='Not immunized' THEN 'Not Immunized'
          ELSE 'Other'
        END as issue,
        CASE WHEN h.health_insurance='No' THEN 'High' ELSE 'Medium' END as priority
      FROM household_master h
      JOIN village_master v ON h.village_id = v.village_id
      WHERE h.health_insurance='No' OR h.dropout_cases='Yes' OR h.chronic_illness='Yes'
      ORDER BY priority DESC, h.household_id
      LIMIT 100
    `);
    res.json(rows);
  } catch (error) {
    console.error('Targeting register error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ============== 6. AGRICULTURE & FISHERIES REPORTS ==============

// Agriculture KPI
router.get('/agriculture-kpi', auth, async (req, res) => {
  try {
    const [rows] = await query(`
      SELECT
        ROUND(SUM(CASE WHEN land_ownership='Yes' THEN 1 ELSE 0 END)*100.0/NULLIF(COUNT(*),0), 1) as with_land_pct,
        ROUND(AVG(CASE WHEN land_ownership='Yes' AND land_size_total IS NOT NULL AND land_size_total!='' THEN CAST(land_size_total AS DECIMAL(10,2)) ELSE NULL END), 2) as avg_land_size,
        ROUND(SUM(CASE WHEN livestock_ownership='Yes' THEN 1 ELSE 0 END)*100.0/NULLIF(COUNT(*),0), 1) as with_livestock_pct,
        ROUND(SUM(CASE WHEN fishing_involved='Yes' THEN 1 ELSE 0 END)*100.0/NULLIF(COUNT(*),0), 1) as in_fisheries_pct,
        SUM(CASE WHEN boat_ownership IS NOT NULL AND boat_ownership!='' AND boat_ownership!='None' THEN 1 ELSE 0 END) as total_boats
      FROM household_master
    `);
    res.json(rows[0] || {});
  } catch (error) {
    console.error('Agriculture KPI error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Land Distribution
router.get('/land-distribution', auth, async (req, res) => {
  try {
    const [rows] = await query(`
      SELECT
        CASE
          WHEN CAST(land_size_total AS DECIMAL(10,2)) < 1 THEN '<1 acre'
          WHEN CAST(land_size_total AS DECIMAL(10,2)) < 2 THEN '1-2 acres'
          WHEN CAST(land_size_total AS DECIMAL(10,2)) < 5 THEN '2-5 acres'
          ELSE '5+ acres'
        END as size_range,
        COUNT(*) as total
      FROM household_master
      WHERE land_ownership='Yes' AND land_size_total IS NOT NULL AND land_size_total!='' AND land_size_total!='0'
      GROUP BY size_range
      ORDER BY MIN(CAST(land_size_total AS DECIMAL(10,2)))
    `);
    res.json(rows);
  } catch (error) {
    console.error('Land distribution error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Irrigation Types
router.get('/irrigation-types', auth, async (req, res) => {
  try {
    const [rows] = await query(`
      SELECT
        SUM(FIND_IN_SET('Rainfed',         irrigation_type) > 0 OR irrigation_type = 'Rainfed')         AS Rainfed,
        SUM(FIND_IN_SET('Borewell',        irrigation_type) > 0 OR irrigation_type = 'Borewell')        AS Borewell,
        SUM(FIND_IN_SET('Canal',           irrigation_type) > 0 OR irrigation_type = 'Canal')           AS Canal,
        SUM(FIND_IN_SET('Drip',            irrigation_type) > 0 OR irrigation_type = 'Drip')            AS Drip,
        SUM(FIND_IN_SET('Sprinkler',       irrigation_type) > 0 OR irrigation_type = 'Sprinkler')       AS Sprinkler,
        SUM(FIND_IN_SET('Tank',            irrigation_type) > 0 OR irrigation_type = 'Tank')            AS \`Tank\`,
        SUM(FIND_IN_SET('River',           irrigation_type) > 0 OR irrigation_type = 'River')           AS River,
        SUM(FIND_IN_SET('Pond',            irrigation_type) > 0 OR irrigation_type = 'Pond')            AS Pond,
        SUM(FIND_IN_SET('Lift irrigation', irrigation_type) > 0 OR irrigation_type = 'Lift irrigation') AS \`Lift irrigation\`,
        SUM(FIND_IN_SET('Other',           irrigation_type) > 0 OR irrigation_type = 'Other')           AS Other
      FROM household_master
      WHERE land_ownership = 'Yes'
    `);
    const types = ['Rainfed','Borewell','Canal','Drip','Sprinkler','Tank','River','Pond','Lift irrigation','Other'];
    const data = types
      .map(t => ({ type: t, hh_count: Number(rows[0][t] || 0) }))
      .filter(d => d.hh_count > 0)
      .sort((a, b) => b.hh_count - a.hh_count);
    res.json(data);
  } catch (error) {
    console.error('Irrigation types error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Livestock Types
router.get('/livestock-types', auth, async (req, res) => {
  try {
    const [rows] = await query(`
      SELECT
        SUM(FIND_IN_SET('Cattle',  livestock_types) > 0 OR livestock_types = 'Cattle')  AS Cattle,
        SUM(FIND_IN_SET('Buffalo', livestock_types) > 0 OR livestock_types = 'Buffalo') AS Buffalo,
        SUM(FIND_IN_SET('Goat',    livestock_types) > 0 OR livestock_types = 'Goat')    AS Goat,
        SUM(FIND_IN_SET('Sheep',   livestock_types) > 0 OR livestock_types = 'Sheep')   AS Sheep,
        SUM(FIND_IN_SET('Poultry', livestock_types) > 0 OR livestock_types = 'Poultry') AS Poultry,
        SUM(FIND_IN_SET('Pig',     livestock_types) > 0 OR livestock_types = 'Pig')     AS Pig,
        SUM(FIND_IN_SET('Other',   livestock_types) > 0 OR livestock_types = 'Other')   AS Other
      FROM household_master
      WHERE livestock_ownership = 'Yes'
    `);
    const types = ['Cattle','Buffalo','Goat','Sheep','Poultry','Pig','Other'];
    const data = types
      .map(t => ({ type: t, hh_count: Number(rows[0][t] || 0) }))
      .filter(d => d.hh_count > 0)
      .sort((a, b) => b.hh_count - a.hh_count);
    res.json(data);
  } catch (error) {
    console.error('Livestock types error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Fisheries Profile
router.get('/fisheries-profile', auth, async (req, res) => {
  try {
    const [rows] = await query(`
      SELECT
        v.village_name as village,
        MAX(h.boat_ownership) as boat_ownership,
        ROUND(SUM(CASE WHEN h.gps_in_boat='Yes' THEN 1 ELSE 0 END)*100.0/COUNT(*), 1) as gps_pct,
        MAX(h.lean_fishing_period) as lean_months,
        ROUND(SUM(CASE WHEN h.storage_facilities IS NOT NULL AND h.storage_facilities!='' THEN 1 ELSE 0 END)*100.0/COUNT(*), 1) as storage_pct,
        COUNT(*) as fisher_count
      FROM household_master h
      JOIN village_master v ON h.village_id = v.village_id
      WHERE h.fishing_involved='Yes'
      GROUP BY v.village_name
      ORDER BY fisher_count DESC
      LIMIT 10
    `);
    res.json(rows);
  } catch (error) {
    console.error('Fisheries profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Asset Heatmap
router.get('/asset-heatmap', auth, async (req, res) => {
  try {
    const [rows] = await query(`
      SELECT
        b.block_name as block,
        SUM(CASE WHEN h.land_ownership='Yes' THEN 1 ELSE 0 END) as land,
        SUM(CASE WHEN h.boat_ownership IS NOT NULL AND h.boat_ownership!='' AND h.boat_ownership!='None' THEN 1 ELSE 0 END) as boat,
        SUM(CASE WHEN h.storage_facilities IS NOT NULL AND h.storage_facilities!='' THEN 1 ELSE 0 END) as storage,
        SUM(CASE WHEN h.livestock_ownership='Yes' THEN 1 ELSE 0 END) as livestock
      FROM household_master h
      JOIN village_master v ON h.village_id = v.village_id
      JOIN block_master b ON v.block_id = b.block_id
      GROUP BY b.block_name
    `);
    res.json(rows);
  } catch (error) {
    console.error('Asset heatmap error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ============== 7. PROGRAMME MONITORING REPORTS ==============

// Programme KPI
router.get('/programme-kpi', auth, async (req, res) => {
  try {
    const [rows] = await query(`
      SELECT 
        COUNT(*) as total_hh,
        ROUND(SUM(CASE WHEN mssrf_support_earlier='Yes' THEN 1 ELSE 0 END)*100.0/COUNT(*), 1) as mssrf_coverage_pct,
        ROUND(SUM(CASE WHEN other_ngo_support='Yes' THEN 1 ELSE 0 END)*100.0/COUNT(*), 1) as ngo_overlap_pct,
        ROUND(SUM(CASE WHEN govt_schemes_benefit IS NOT NULL AND govt_schemes_benefit!='' THEN 1 ELSE 0 END)*100.0/COUNT(*), 1) as govt_scheme_pct
      FROM household_master
    `);
    res.json(rows[0] || {});
  } catch (error) {
    console.error('Programme KPI error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Scheme Coverage Matrix
router.get('/scheme-coverage', auth, async (req, res) => {
  try {
    const [rows] = await query(`
      SELECT 
        block_name as block,
        SUM(CASE WHEN mssrf_support_earlier='Yes' THEN 1 ELSE 0 END) as mssrf,
        SUM(CASE WHEN govt_schemes_benefit IS NOT NULL AND govt_schemes_benefit!='' THEN 1 ELSE 0 END) as govt,
        SUM(CASE WHEN other_ngo_support='Yes' THEN 1 ELSE 0 END) as ngo,
        COUNT(*) as total
      FROM household_master
      WHERE block_name IS NOT NULL
      GROUP BY block_name
    `);
    res.json(rows);
  } catch (error) {
    console.error('Scheme coverage error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Survey Progress
router.get('/survey-progress', auth, async (req, res) => {
  try {
    const [rows] = await query(`
      SELECT 
        DATE_FORMAT(survey_date, '%Y-%m') as month,
        COUNT(*) as count
      FROM household_master
      WHERE survey_date IS NOT NULL
      GROUP BY month
      ORDER BY month
    `);
    res.json(rows);
  } catch (error) {
    console.error('Survey progress error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GPS Coverage Map
router.get('/gps-map', auth, async (req, res) => {
  try {
    const [rows] = await query(`
      SELECT 
        household_id,
        head_name,
        village_name,
        gps_latitude as lat,
        gps_longitude as lng,
        CASE WHEN consent_obtained='Yes' THEN 'green' ELSE 'red' END as color
      FROM household_master
      WHERE gps_latitude IS NOT NULL AND gps_longitude IS NOT NULL
      LIMIT 100
    `);
    res.json(rows);
  } catch (error) {
    console.error('GPS map error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// NGO Overlap Analysis
router.get('/ngo-overlap', auth, async (req, res) => {
  try {
    const [rows] = await query(`
      SELECT 
        CASE 
          WHEN mssrf_support_earlier='Yes' AND other_ngo_support='Yes' THEN 'Both MSSRF + Other NGO'
          WHEN mssrf_support_earlier='Yes' THEN 'MSSRF Only'
          WHEN other_ngo_support='Yes' THEN 'Other NGO Only'
          ELSE 'No NGO Support'
        END as category,
        COUNT(*) as count
      FROM household_master
      GROUP BY category
      ORDER BY count DESC
    `);
    res.json(rows);
  } catch (error) {
    console.error('NGO overlap error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
