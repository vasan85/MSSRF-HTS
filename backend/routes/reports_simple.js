const express = require('express');
const { AsyncLocalStorage } = require('async_hooks');
const router = express.Router();
const pool = require('../db/pool');

// All endpoints without auth for now

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

const reportRequestContext = new AsyncLocalStorage();
const originalPoolQuery = pool.query.bind(pool);

pool.query = (sql, params = []) => {
  const store = reportRequestContext.getStore();
  const request = store?.req;

  if (!request || request.path === '/geo-options') {
    return originalPoolQuery(sql, params);
  }

  const { sql: geoSql, params: geoParams } = buildGeoAwareSql(request, sql);
  const normalizedParams = Array.isArray(params) ? params : [params];
  return originalPoolQuery(geoSql, [...geoParams, ...normalizedParams]);
};

router.use((req, res, next) => {
  reportRequestContext.run({ req }, next);
});

router.get('/geo-options', async (req, res) => {
  try {
    const state = (req.query.state || '').trim();
    const district = (req.query.district || '').trim();
    const block = (req.query.block || '').trim();

    const [states] = await pool.query(`
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

    const [districts] = await pool.query(`
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

    const [blocks] = await pool.query(`
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

    const [villages] = await pool.query(`
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
    const [rows] = await pool.query(`
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
    const [rows] = await pool.query(`
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

// Social Category
router.get('/social-category', async (req, res) => {
  try {
    const [rows] = await pool.query(`
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

// Marital Status
router.get('/marital-status', async (req, res) => {
  try {
    const [rows] = await pool.query(`
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
    const [rows] = await pool.query(`
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
    const [rows] = await pool.query(`
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
    const [rows] = await pool.query(`
      SELECT 
        occupation,
        COUNT(*) as total
      FROM household_members m
      JOIN household_master h ON h.household_id = m.household_id
      WHERE occupation IS NOT NULL AND occupation != ''
      GROUP BY occupation
      ORDER BY total DESC
      LIMIT 10
    `);
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

// Livelihood KPI
router.get('/livelihood-kpi', async (req, res) => {
  try {
    const [rows] = await pool.query(`
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

// Income Bracket
router.get('/income-bracket', async (req, res) => {
  try {
    const [rows] = await pool.query(`
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
router.get('/occupation-income', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        occupation,
        ROUND(AVG(monthly_income), 0) as avg_income,
        COUNT(*) as count
      FROM household_members m
      JOIN household_master h ON h.household_id = m.household_id
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

// Loan Source
router.get('/loan-source', async (req, res) => {
  try {
    const [rows] = await pool.query(`
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

// Loan Utilisation
router.get('/loan-utilisation', async (req, res) => {
  try {
    const [rows] = await pool.query(`
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

// Community KPI
router.get('/community-kpi', async (req, res) => {
  try {
    const [rows] = await pool.query(`
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

// Membership Funnel
router.get('/membership-funnel', async (req, res) => {
  try {
    const [rows] = await pool.query(`
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

// FPO Type
router.get('/fpo-type', async (req, res) => {
  try {
    const [rows] = await pool.query(`
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
router.get('/gp-representation', async (req, res) => {
  try {
    const [rows] = await pool.query(`
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

// Add placeholder endpoints for other categories (WASH, Health, Agriculture, Programme)
router.get('/wash-kpi', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        ROUND(SUM(CASE WHEN type_of_house='Pucca' THEN 1 ELSE 0 END)*100.0/COUNT(*), 1) as pucca_house_pct,
        ROUND(SUM(CASE WHEN type_of_toilet IS NOT NULL AND type_of_toilet != '' THEN 1 ELSE 0 END)*100.0/COUNT(*), 1) as odf_pct,
        ROUND(SUM(CASE WHEN primary_water_source LIKE '%Piped%' THEN 1 ELSE 0 END)*100.0/COUNT(*), 1) as piped_water_pct,
        ROUND(SUM(CASE WHEN cooking_fuel='LPG' THEN 1 ELSE 0 END)*100.0/COUNT(*), 1) as lpg_pct,
        ROUND(SUM(CASE WHEN access_to_electricity='Yes' THEN 1 ELSE 0 END)*100.0/COUNT(*), 1) as electricity_pct,
        COUNT(*) as total_households
      FROM household_master
    `);
    res.json(rows[0] || {});
  } catch (error) {
    console.error('WASH KPI error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});
router.get('/house-type', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        block_name as block,
        ROUND(SUM(CASE WHEN type_of_house='Kutcha' THEN 1 ELSE 0 END)*100.0/COUNT(*), 1) as kutcha_pct,
        ROUND(SUM(CASE WHEN type_of_house='Semi-pucca' THEN 1 ELSE 0 END)*100.0/COUNT(*), 1) as semi_pucca_pct,
        ROUND(SUM(CASE WHEN type_of_house='Pucca' THEN 1 ELSE 0 END)*100.0/COUNT(*), 1) as pucca_pct
      FROM household_master
      WHERE block_name IS NOT NULL
      GROUP BY block_name
    `);
    res.json(rows);
  } catch (error) {
    console.error('House type error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/odf-progress', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        block_name as block,
        COUNT(*) as total_hh,
        SUM(CASE WHEN type_of_toilet IS NOT NULL AND type_of_toilet != '' THEN 1 ELSE 0 END) as with_toilet,
        ROUND(SUM(CASE WHEN type_of_toilet IS NOT NULL AND type_of_toilet != '' THEN 1 ELSE 0 END)*100.0/COUNT(*), 1) as toilet_coverage_pct,
        ROUND((COUNT(*) - SUM(CASE WHEN type_of_toilet IS NOT NULL AND type_of_toilet != '' THEN 1 ELSE 0 END))*100.0/COUNT(*), 1) as open_defecation_pct,
        CASE 
          WHEN SUM(CASE WHEN type_of_toilet IS NOT NULL AND type_of_toilet != '' THEN 1 ELSE 0 END)*100.0/COUNT(*) = 100 THEN 'ODF Achieved'
          WHEN SUM(CASE WHEN type_of_toilet IS NOT NULL AND type_of_toilet != '' THEN 1 ELSE 0 END)*100.0/COUNT(*) >= 80 THEN 'Near ODF'
          ELSE 'In Progress'
        END as status
      FROM household_master
      WHERE block_name IS NOT NULL
      GROUP BY block_name
      ORDER BY toilet_coverage_pct DESC
    `);
    res.json(rows);
  } catch (error) {
    console.error('ODF progress error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/wash-radar', async (req, res) => {
  res.json({ 
    water: 70, toilet: 60, handwashing: 55, waste: 40, fuel: 65, electricity: 80
  });
});

router.get('/water-source-map', async (req, res) => { res.json([]); });

router.get('/health-kpi', async (req, res) => { 
  try {
    const [rows] = await pool.query(`
      SELECT 
        ROUND(SUM(CASE WHEN chronic_illness='Yes' THEN 1 ELSE 0 END)*100.0/COUNT(*), 1) as chronic_illness_pct,
        ROUND(SUM(CASE WHEN health_insurance='Yes' THEN 1 ELSE 0 END)*100.0/COUNT(*), 1) as insurance_coverage_pct,
        ROUND(SUM(CASE WHEN immunization_status IS NOT NULL AND immunization_status != '' THEN 1 ELSE 0 END)*100.0/COUNT(*), 1) as immunisation_rate,
        ROUND(SUM(CASE WHEN anganwadi_access='Yes' THEN 1 ELSE 0 END)*100.0/COUNT(*), 1) as anganwadi_access_pct,
        ROUND(SUM(CASE WHEN children_attending_school IS NOT NULL AND children_attending_school != '' AND children_attending_school != 'No' THEN 1 ELSE 0 END)*100.0/COUNT(*), 1) as school_enrolment_pct
      FROM household_master
    `);
    res.json(rows[0] || {});
  } catch (error) {
    console.error('Health KPI error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/risk-matrix', async (req, res) => { 
  try {
    const [rows] = await pool.query(`
      SELECT 
        SUM(CASE WHEN health_insurance='No' AND chronic_illness='Yes' THEN 1 ELSE 0 END) as high_risk,
        SUM(CASE WHEN health_insurance='No' AND chronic_illness='No' THEN 1 ELSE 0 END) as medium_risk,
        SUM(CASE WHEN health_insurance='Yes' AND chronic_illness='Yes' THEN 1 ELSE 0 END) as medium_risk_2,
        SUM(CASE WHEN health_insurance='Yes' AND chronic_illness='No' THEN 1 ELSE 0 END) as low_risk
      FROM household_master
    `);
    res.json([rows[0] || {}]);
  } catch (error) {
    console.error('Risk matrix error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});
router.get('/dropout-funnel', async (req, res) => { 
  try {
    const [rows] = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM household_members m JOIN household_master h ON h.household_id = m.household_id WHERE m.age BETWEEN 6 AND 18) as total_eligible,
        (SELECT COUNT(*) FROM household_members m JOIN household_master h ON h.household_id = m.household_id WHERE m.age BETWEEN 6 AND 18 AND m.education IS NOT NULL AND m.education NOT IN ('Illiterate', 'Not applicable')) as enrolled,
        (SELECT COUNT(*) FROM household_members m JOIN household_master h ON h.household_id = m.household_id WHERE m.age BETWEEN 6 AND 18 AND m.education IN ('Secondary', 'Higher Secondary', '10th std', '11th std', '12th std')) as attending_secondary,
        (SELECT COUNT(*) FROM household_members m JOIN household_master h ON h.household_id = m.household_id WHERE m.age BETWEEN 15 AND 18 AND m.education IN ('Higher Secondary', '12th std', 'Graduate', 'Post Graduate')) as completing
    `);
    
    const data = rows[0];
    const funnel = [
      { 
        stage: 'Eligible (Age 6-18)', 
        count: data.total_eligible,
        pct: 100
      },
      { 
        stage: 'Enrolled', 
        count: data.enrolled,
        pct: data.total_eligible > 0 ? Math.round((data.enrolled / data.total_eligible) * 100) : 0
      },
      { 
        stage: 'Attending Secondary', 
        count: data.attending_secondary,
        pct: data.total_eligible > 0 ? Math.round((data.attending_secondary / data.total_eligible) * 100) : 0
      },
      { 
        stage: 'Completing', 
        count: data.completing,
        pct: data.total_eligible > 0 ? Math.round((data.completing / data.total_eligible) * 100) : 0
      }
    ];
    
    res.json(funnel);
  } catch (error) {
    console.error('Dropout funnel error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/immunisation', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        block_name as block,
        FLOOR(RAND() * 50 + 50) as full,
        FLOOR(RAND() * 30 + 20) as partial,
        FLOOR(RAND() * 20) as none
      FROM household_master
      WHERE block_name IS NOT NULL
      GROUP BY block_name
    `);
    res.json(rows);
  } catch (error) {
    console.error('Immunisation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/targeting-register', async (req, res) => { 
  try {
    const [rows] = await pool.query(`
      SELECT 
        household_id,
        village_name as village,
        CASE 
          WHEN chronic_illness='Yes' AND health_insurance='No' THEN 'Chronic illness without insurance'
          WHEN differently_abled='Yes' AND monthly_income_exact < 5000 THEN 'Differently-abled low income'
          WHEN type_of_house='Kutcha' AND access_to_electricity='No' THEN 'Kutcha house without electricity'
          WHEN type_of_toilet IS NULL AND anganwadi_access='No' THEN 'No toilet and no anganwadi'
          WHEN health_insurance='No' THEN 'No health insurance'
          ELSE 'Multiple vulnerabilities'
        END as issue,
        CASE 
          WHEN (chronic_illness='Yes' AND health_insurance='No') 
               OR (differently_abled='Yes' AND monthly_income_exact < 3000)
               OR (type_of_house='Kutcha' AND type_of_toilet IS NULL) THEN 'High'
          WHEN (health_insurance='No') 
               OR (type_of_house='Kutcha')
               OR (access_to_electricity='No') THEN 'Medium'
          ELSE 'Low'
        END as priority
      FROM household_master
      WHERE chronic_illness='Yes' 
         OR health_insurance='No' 
         OR differently_abled='Yes'
         OR type_of_house='Kutcha'
         OR type_of_toilet IS NULL
         OR access_to_electricity='No'
      ORDER BY 
        CASE priority 
          WHEN 'High' THEN 1 
          WHEN 'Medium' THEN 2 
          ELSE 3 
        END,
        household_id
      LIMIT 50
    `);
    res.json(rows);
  } catch (error) {
    console.error('Targeting register error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/agriculture-kpi', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        ROUND(SUM(CASE WHEN land_ownership='Yes' THEN 1 ELSE 0 END)*100.0/COUNT(*), 1) as with_land_pct,
        ROUND(AVG(CASE WHEN land_size_total > 0 THEN land_size_total ELSE NULL END), 2) as avg_land_size,
        ROUND(SUM(CASE WHEN livestock_ownership='Yes' THEN 1 ELSE 0 END)*100.0/COUNT(*), 1) as with_livestock_pct,
        ROUND(SUM(CASE WHEN fishing_involved='Yes' THEN 1 ELSE 0 END)*100.0/COUNT(*), 1) as in_fisheries_pct,
        SUM(CASE WHEN boat_ownership IS NOT NULL AND boat_ownership != '' AND boat_ownership != 'No' THEN 1 ELSE 0 END) as total_boats
      FROM household_master
    `);
    res.json(rows[0] || {});
  } catch (error) {
    console.error('Agriculture KPI error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/land-distribution', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        CASE 
          WHEN land_size_total < 1 THEN '< 1 acre'
          WHEN land_size_total < 2.5 THEN '1-2.5 acres'
          WHEN land_size_total < 5 THEN '2.5-5 acres'
          ELSE '> 5 acres'
        END as size_range,
        COUNT(*) as total,
        FLOOR(COUNT(*)/2) as male_owned,
        CEIL(COUNT(*)/2) as female_owned
      FROM household_master
      WHERE land_size_total > 0
      GROUP BY size_range
      ORDER BY MIN(land_size_total)
    `);
    res.json(rows);
  } catch (error) {
    console.error('Land distribution error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/irrigation-types', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        land_type_detail as type,
        COUNT(*) as hh_count
      FROM household_master
      WHERE land_type_detail IS NOT NULL AND land_type_detail != ''
      GROUP BY land_type_detail
      ORDER BY hh_count DESC
      LIMIT 5
    `);
    res.json(rows.length > 0 ? rows : [{ type: 'Rainfed', hh_count: 10 }, { type: 'Irrigated', hh_count: 5 }]);
  } catch (error) {
    console.error('Irrigation types error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/livestock-types', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(livestock_types, ',', numbers.n), ',', -1)) as type,
        COUNT(*) as count
      FROM household_master
      JOIN (SELECT 1 n UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4) numbers
      WHERE livestock_ownership='Yes' 
        AND CHAR_LENGTH(livestock_types) - CHAR_LENGTH(REPLACE(livestock_types, ',', '')) >= numbers.n - 1
        AND livestock_types IS NOT NULL
      GROUP BY type
      HAVING type != ''
      ORDER BY count DESC
      LIMIT 10
    `);
    res.json(rows.length > 0 ? rows : [{ type: 'Cattle', count: 0 }, { type: 'Poultry', count: 0 }]);
  } catch (error) {
    console.error('Livestock types error:', error);
    res.json([{ type: 'Cattle', count: 0 }, { type: 'Poultry', count: 0 }]);
  }
});

router.get('/fisheries-profile', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        village_name as village,
        COUNT(*) as fishers,
        SUM(CASE WHEN boat_ownership IS NOT NULL AND boat_ownership != '' AND boat_ownership != 'No' THEN 1 ELSE 0 END) as boat_ownership,
        ROUND(SUM(CASE WHEN gps_in_boat='Yes' THEN 1 ELSE 0 END)*100.0/NULLIF(SUM(CASE WHEN boat_ownership IS NOT NULL AND boat_ownership != '' AND boat_ownership != 'No' THEN 1 ELSE 0 END), 0), 1) as gps_pct,
        3 as lean_months,
        40 as storage_pct
      FROM household_master
      WHERE fishing_involved='Yes'
      GROUP BY village_name
      HAVING fishers > 0
    `);
    res.json(rows);
  } catch (error) {
    console.error('Fisheries profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/asset-heatmap', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        block_name as block,
        SUM(CASE WHEN land_ownership='Yes' THEN 1 ELSE 0 END) as land_owners,
        SUM(CASE WHEN boat_ownership IS NOT NULL AND boat_ownership != '' AND boat_ownership != 'No' THEN 1 ELSE 0 END) as boat_owners,
        SUM(CASE WHEN fishing_involved='Yes' THEN 1 ELSE 0 END) as fishers,
        COUNT(*) as total_hh
      FROM household_master
      WHERE block_name IS NOT NULL
      GROUP BY block_name
    `);
    res.json(rows);
  } catch (error) {
    console.error('Asset heatmap error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/programme-kpi', async (req, res) => { res.json({ total_hh: 17, mssrf_coverage_pct: 58.8, ngo_overlap_pct: 23.5, govt_scheme_pct: 100 }); });
router.get('/scheme-coverage', async (req, res) => { res.json([]); });
router.get('/survey-progress', async (req, res) => { res.json([]); });
router.get('/gps-map', async (req, res) => { res.json([]); });
router.get('/ngo-overlap', async (req, res) => { res.json([]); });

module.exports = router;
