const router = require('express').Router();
const pool   = require('../db/pool');
const auth   = require('../middleware/auth');
const { roles } = auth;
const cache  = require('../utils/cache');

function bustDashboardCache() { cache.invalidatePrefix('dashboard:'); }

/* ── List / Search ───────────────────────────────── */
router.get('/', auth, async (req, res) => {
  try {
    const { search, village_id, block_id, district_id, state_id, status, baseline, workflow_status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [], conditions = [];

    if (req.user.role === 'enumerator') {
      conditions.push('h.created_by_user_id = ?');
      params.push(req.user.id);
    }
    if (search) {
      conditions.push('(h.household_id LIKE ? OR h.head_name LIKE ? OR h.mobile LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (village_id)   { conditions.push('h.village_id = ?');    params.push(village_id); }
    if (block_id)     { conditions.push('v.block_id = ?');      params.push(block_id); }
    if (district_id)  { conditions.push('b.district_id = ?');   params.push(district_id); }
    if (state_id)     { conditions.push('d.state_id = ?');      params.push(parseInt(state_id, 10)); }
    if (status)       { conditions.push('h.status = ?');        params.push(status); }
    if (baseline === 'yes') { conditions.push('h.baseline_completed = 1'); }
    if (workflow_status) { conditions.push('h.workflow_status = ?'); params.push(workflow_status); }

    const where = conditions.length ? ' WHERE ' + conditions.join(' AND ') : '';
    const joins = `
      JOIN village_master v  ON h.village_id = v.village_id
      JOIN block_master b    ON v.block_id = b.block_id
      JOIN district_master d ON b.district_id = d.district_id
      JOIN state_master s    ON d.state_id = s.id`;

    const [rows]   = await pool.query(`
      SELECT h.*, v.village_name, b.block_name, d.district_name, s.state_name,
             creator.name AS created_by_name
      FROM household_master h ${joins}
      LEFT JOIN users creator ON h.created_by_user_id = creator.id
      ${where}
      ORDER BY h.household_id LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]);

    const [counts] = await pool.query(
      `SELECT COUNT(*) AS total FROM household_master h ${joins} ${where}`, params);

    res.json({ data: rows, total: counts[0].total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/* ── Export (batch-friendly, called per-page by frontend) ── */
router.get('/export/data', auth, async (req, res) => {
  try {
    const { search, village_id, block_id, district_id, state_id, status, baseline, workflow_status, page = 1 } = req.query;
    const limit  = Math.min(parseInt(req.query.limit || 500), 500); // hard cap at 500
    const offset = (parseInt(page) - 1) * limit;
    const params = [], conditions = [];

    if (req.user.role === 'enumerator') {
      conditions.push('h.created_by_user_id = ?');
      params.push(req.user.id);
    }
    if (search) {
      conditions.push('(h.household_id LIKE ? OR h.head_name LIKE ? OR h.mobile LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (village_id)  { conditions.push('h.village_id = ?');   params.push(village_id); }
    if (block_id)    { conditions.push('v.block_id = ?');     params.push(block_id); }
    if (district_id) { conditions.push('b.district_id = ?');  params.push(district_id); }
    if (state_id)    { conditions.push('d.state_id = ?');     params.push(parseInt(state_id, 10)); }
    if (status)      { conditions.push('h.status = ?');       params.push(status); }
    if (baseline === 'yes') { conditions.push('h.baseline_completed = 1'); }
    if (workflow_status) { conditions.push('h.workflow_status = ?'); params.push(workflow_status); }

    const where = conditions.length ? ' WHERE ' + conditions.join(' AND ') : '';

    const exportJoins = `
      JOIN village_master v  ON h.village_id = v.village_id
      JOIN block_master b    ON v.block_id = b.block_id
      JOIN district_master d ON b.district_id = d.district_id
      JOIN state_master s    ON d.state_id = s.id`;

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM household_master h ${exportJoins} ${where}`, params
    );

    const [households] = await pool.query(`
      SELECT h.*,
             v.village_name  AS v_village_name,
             b.block_name    AS v_block_name,
             d.district_name AS v_district_name,
             s.state_name    AS v_state_name
      FROM household_master h ${exportJoins}
      ${where}
      ORDER BY h.household_id
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), offset]);

    // Fetch members for this batch
    let members = [];
    if (households.length > 0) {
      const hhIds = households.map(h => h.household_id);
      const placeholders = hhIds.map(() => '?').join(',');
      [members] = await pool.query(
        `SELECT * FROM household_members WHERE household_id IN (${placeholders}) ORDER BY household_id, member_id`,
        hhIds
      );
    }

    // DPDPA: log every export action
    await pool.query(
      `INSERT INTO audit_log (user_id,user_name,role,module,action,record_id,detail) VALUES (?,?,?,?,?,?,?)`,
      [req.user.id, req.user.name, req.user.role, 'Privacy', 'DATA_EXPORT', null,
       `Exported batch page=${page} (${households.length} records). Filters: ${JSON.stringify({ search, village_id, block_id, district_id, state_id, workflow_status })}`]
    );

    res.json({ households, members, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('Export error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/* ── Get single ──────────────────────────────────── */
router.get('/:id', auth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT h.*, v.village_name, b.block_name, d.district_name, s.state_name
       FROM household_master h
       JOIN village_master v  ON h.village_id = v.village_id
       JOIN block_master b    ON v.block_id = b.block_id
       JOIN district_master d ON b.district_id = d.district_id
       JOIN state_master s    ON d.state_id = s.id
       WHERE h.household_id = ?`, [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Household not found' });

    // Enumerators can only view their own records
    if (req.user.role === 'enumerator' && rows[0].created_by_user_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied: this record was created by another enumerator' });
    }
    // mis_head can view but the response includes workflow info for UI purposes

    // Fetch household members
    const [members] = await pool.query(
      `SELECT member_id, member_name, age, relationship_to_head, social_category,
              marital_status, education, occupation, monthly_income, mobile_number,
              differently_abled, disability_category, shg_membership, shg_role, shg_loan,
              shg_loan_savings, shg_loan_bank, shg_loan_mfi, shg_loan_others, loan_reason,
              fpo_membership, fpo_role, fpo_investment, fpo_type, fpo_commodity, fpo_market_linkage,
              gp_elected_member, gp_membership_details, assets_ownership, asset_type, land_type_detail,
              govt_schemes_benefit, scheme_benefit_details, mssrf_support_earlier, mssrf_support_details,
              other_ngo_support, ngo_support_details
       FROM household_members WHERE household_id = ? ORDER BY member_id`,
      [req.params.id]
    );
    
    const household = rows[0];
    household.members = members;
    
    res.json(household);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/* ── Generate next household ID ──────────────────── */
router.get('/next-id/:village_id', auth, async (req, res) => {
  try {
    const { village_id } = req.params;
    const [vRows] = await pool.query(
      `SELECT v.village_id, b.block_id, d.district_id, s.id AS state_id,
              s.state_name
       FROM village_master v
       JOIN block_master b    ON v.block_id    = b.block_id
       JOIN district_master d ON b.district_id = d.district_id
       JOIN state_master s    ON d.state_id    = s.id
       WHERE v.village_id = ?`, [village_id]
    );
    if (!vRows.length)
      return res.status(404).json({ message: 'Village not found' });

    function stateAbbr(name) {
      const words = name.trim().split(/\s+/);
      return words.length >= 2
        ? (words[0][0] + words[1][0]).toUpperCase()
        : name.substring(0, 2).toUpperCase();
    }
    const stateCode = stateAbbr(vRows[0].state_name);

    const [maxRow] = await pool.query(
      'SELECT COALESCE(MAX(serial_no), 0) AS mx FROM household_master WHERE village_id = ?',
      [village_id]
    );
    const next  = maxRow[0].mx + 1;
    const hh_id = `${stateCode}-${village_id}-HH${String(next).padStart(4, '0')}`;

    let finalId = hh_id, finalSerial = next;
    const [existCheck] = await pool.query(
      'SELECT household_id FROM household_master WHERE household_id = ?', [hh_id]
    );
    if (existCheck.length) {
      const [absMax] = await pool.query(
        `SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(household_id,'-HH',-1) AS UNSIGNED)), 0) AS mx
         FROM household_master WHERE village_id = ?`, [village_id]
      );
      finalSerial = absMax[0].mx + 1;
      finalId = `${stateCode}-${village_id}-HH${String(finalSerial).padStart(4, '0')}`;
    }

    res.json({ household_id: finalId, serial_no: finalSerial });
  } catch (err) {
    console.error('next-id error:', err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/* ── Create ──────────────────────────────────────── */
router.post('/', auth, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    
    const d = req.body;
    await conn.query(
      `INSERT INTO household_master
       (household_id, village_id, serial_no, enumerator_name, survey_date, consent_obtained,
        gps_latitude, gps_longitude, state_name, district_name, block_name, village_name,
        head_name, head_age, mobile, social_category, marital_status, education, occupation,
        occupation_other, monthly_income, monthly_income_exact, differently_abled, disability_category,
        shg_membership, shg_role, shg_loan, shg_loan_savings, shg_loan_bank, shg_loan_mfi, shg_loan_others, loan_reason,
        fpo_membership, fpo_role, fpo_investment, fpo_type, fpo_commodity, fpo_market_linkage,
        gp_elected_member, gp_membership_details, assets_ownership, asset_type, land_type_detail,
        govt_schemes_benefit, scheme_benefit_details, mssrf_support_earlier, mssrf_support_details,
        other_ngo_support, ngo_support_details,
        type_of_house, ownership_status, number_of_rooms, type_of_roof, type_of_floor,
        access_to_electricity, source_of_lighting, cooking_fuel, separate_kitchen,
        primary_water_source, distance_to_water, water_availability, type_of_toilet_facility,
        type_of_toilet, handwashing_facility, use_of_soap, solid_waste_disposal,
        chronic_illness, chronic_illness_detail, nearest_health_facility, distance_to_health,
        health_insurance, health_insurance_scheme, pregnant_lactating, children_under_5,
        immunization_status, anganwadi_access, children_attending_school, type_of_school,
        dropout_cases, dropout_reason, household_assets, land_ownership, land_size_total,
        irrigation_type, residential_plot_size, land_size_other, livestock_ownership,
        livestock_types, access_to_credit, credit_sources, total_credit_amount,
        female_headed_household, migration_status, seasonal_migration, observation_remarks, respondent_comments,
        fishing_involved, fishing_type, boat_ownership, boat_type, gps_in_boat,
        fishing_method, fishing_frequency, lean_fishing_period, storage_facilities, storage_ownership,
        status, saved_step, created_by_user_id)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [d.household_id, d.village_id, d.serial_no, d.enumerator_name || null, d.survey_date || null,
       d.consent_obtained || 'Yes', d.gps_latitude || null, d.gps_longitude || null,
       d.state_name || null, d.district_name || null, d.block_name || null, d.village_name || null,
       d.head_name, d.head_age || null, d.mobile, d.social_category, d.marital_status || null,
       d.education || null, d.occupation || null, d.occupation_other || null,
       d.monthly_income || null, d.monthly_income_exact || null, d.differently_abled || 'No',
       d.disability_category || null,
       d.shg_membership || 'No', d.shg_role || null, d.shg_loan || 'No', d.shg_loan_savings || null, d.shg_loan_bank || null,
       d.shg_loan_mfi || null, d.shg_loan_others || null, d.loan_reason || null,
       d.fpo_membership || 'No', d.fpo_role || null, d.fpo_investment || null, d.fpo_type || null,
       d.fpo_commodity || null, d.fpo_market_linkage || null,
       d.gp_elected_member || 'No', d.gp_membership_details || null,
       d.assets_ownership || 'No', d.asset_type || null, d.land_type_detail || null,
       d.govt_schemes_benefit || null, d.scheme_benefit_details || null,
       d.mssrf_support_earlier || 'No', d.mssrf_support_details || null,
       d.other_ngo_support || 'No', d.ngo_support_details || null,
       d.type_of_house || null, d.ownership_status || null,
       d.number_of_rooms || null, d.type_of_roof || null, d.type_of_floor || null,
       d.access_to_electricity || 'Yes', d.source_of_lighting || null, d.cooking_fuel || null,
       d.separate_kitchen || 'Yes', d.primary_water_source || null, d.distance_to_water || null,
       d.water_availability || null, d.type_of_toilet_facility || null, d.type_of_toilet || null,
       d.handwashing_facility || 'Yes', d.use_of_soap || null, d.solid_waste_disposal || null,
       d.chronic_illness || 'No', d.chronic_illness_detail || null, d.nearest_health_facility || null,
       d.distance_to_health || null, d.health_insurance || 'No', d.health_insurance_scheme || null,
       d.pregnant_lactating || 'No', d.children_under_5 || 0, d.immunization_status || null,
       d.anganwadi_access || 'No', d.children_attending_school || null, d.type_of_school || null,
       d.dropout_cases || 'No', d.dropout_reason || null, d.household_assets || null,
       d.land_ownership || 'No', d.land_size_total || null, d.irrigation_type || null,
       d.residential_plot_size || null, d.land_size_other || null, d.livestock_ownership || 'No',
       d.livestock_types || null, d.access_to_credit || 'No', d.credit_sources || null,
       d.total_credit_amount || null, d.female_headed_household || 'No',
       d.migration_status || 'Non-migrant', d.seasonal_migration || 'No',
       d.observation_remarks || null, d.respondent_comments || null,
       d.fishing_involved || 'No', d.fishing_type || null, d.boat_ownership || null,
       d.boat_type || null, d.gps_in_boat || 'No', d.fishing_method || null,
       d.fishing_frequency || null, d.lean_fishing_period || null, d.storage_facilities || null,
       d.storage_ownership || null, d.status || 'Active', d.saved_step || 1, req.user.id]
    );
    
    // Insert household members if provided
    if (d.members && Array.isArray(d.members) && d.members.length > 0) {
      for (const member of d.members) {
        await conn.query(
          `INSERT INTO household_members 
           (household_id, member_name, age, relationship_to_head, social_category, 
            marital_status, education, occupation, monthly_income, mobile_number,
            differently_abled, disability_category, shg_membership, shg_role, shg_loan,
            shg_loan_savings, shg_loan_bank, shg_loan_mfi, shg_loan_others, loan_reason,
            fpo_membership, fpo_role, fpo_investment, fpo_type, fpo_commodity, fpo_market_linkage,
            gp_elected_member, gp_membership_details, assets_ownership, asset_type, land_type_detail,
            govt_schemes_benefit, scheme_benefit_details, mssrf_support_earlier, mssrf_support_details,
            other_ngo_support, ngo_support_details)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [d.household_id, member.member_name, member.age || null, 
           member.relationship_to_head || null, member.social_category || null,
           member.marital_status || null, member.education || null, 
           member.occupation || null, member.monthly_income || null, 
           member.mobile_number || null,
           member.differently_abled || 'No', member.disability_category || null,
           member.shg_membership || 'No', member.shg_role || null, member.shg_loan || 'No',
           member.shg_loan_savings || null, member.shg_loan_bank || null,
           member.shg_loan_mfi || null, member.shg_loan_others || null, member.loan_reason || null,
           member.fpo_membership || 'No', member.fpo_role || null, member.fpo_investment || null,
           member.fpo_type || null, member.fpo_commodity || null, member.fpo_market_linkage || null,
           member.gp_elected_member || 'No', member.gp_membership_details || null,
           member.assets_ownership || 'No', member.asset_type || null, member.land_type_detail || null,
           member.govt_schemes_benefit || null, member.scheme_benefit_details || null,
           member.mssrf_support_earlier || 'No', member.mssrf_support_details || null,
           member.other_ngo_support || 'No', member.ngo_support_details || null]
        );
      }
    }
    
    await conn.query(
      'INSERT INTO audit_log (user_id,user_name,role,module,action,record_id,detail) VALUES (?,?,?,?,?,?,?)',
      [req.user.id, req.user.name, req.user.role, 'Household', 'CREATE',
       d.household_id, `New household added: ${d.head_name}${d.members?.length ? ` with ${d.members.length} members` : ''}`]
    );

    await conn.query(
      `INSERT INTO revision_log (household_id, changed_by_user_id, changed_by_name, user_role, action)
       VALUES (?, ?, ?, ?, 'CREATED')`,
      [d.household_id, req.user.id, req.user.name, req.user.role]
    );

    // DPDPA: record consent alongside household creation
    if (d.consent_given) {
      await conn.query(
        `UPDATE household_master
         SET consent_given=1, consent_at=NOW(), consent_language=?, consent_version='v1.0'
         WHERE household_id=?`,
        [d.consent_language || 'English', d.household_id]
      );
      await conn.query(
        `INSERT INTO consent_log
           (household_id, enumerator_id, enumerator_name, consent_language, consent_version, consent_method)
         VALUES (?,?,?,?,?,?)`,
        [d.household_id, req.user.id, req.user.name,
         d.consent_language || 'English', 'v1.0', d.consent_method || 'verbal']
      );
    }

    await conn.commit();
    conn.release();
    bustDashboardCache();
    res.status(201).json({ household_id: d.household_id });
  } catch (err) {
    console.error(err);
    if (conn) {
      await conn.rollback();
      conn.release();
    }
    res.status(500).json({ message: 'Internal server error' });
  }
});

/* ── Update ──────────────────────────────────────── */
router.put('/:id', auth, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Role-based edit restrictions
    if (req.user.role === 'mis_head') {
      await conn.rollback(); conn.release();
      return res.status(403).json({ message: 'MIS Management Team cannot edit household records' });
    }

    const [check] = await conn.query(
      'SELECT created_by_user_id, workflow_status FROM household_master WHERE household_id = ?',
      [req.params.id]
    );
    if (!check.length) { await conn.rollback(); conn.release(); return res.status(404).json({ message: 'Household not found' }); }

    if (req.user.role === 'enumerator') {
      if (check[0].created_by_user_id !== req.user.id) {
        await conn.rollback(); conn.release();
        return res.status(403).json({ message: 'Access denied: you can only edit records you created' });
      }
      if (!['draft', 'returned'].includes(check[0].workflow_status)) {
        await conn.rollback(); conn.release();
        return res.status(403).json({ message: `Cannot edit a record in '${check[0].workflow_status}' status` });
      }
    }

    const d = req.body;
    await conn.query(
      `UPDATE household_master SET
       enumerator_name=?, survey_date=?, consent_obtained=?,
       gps_latitude=?, gps_longitude=?,
       head_name=?, head_age=?, mobile=?, social_category=?, marital_status=?,
       education=?, occupation=?, occupation_other=?, monthly_income=?, monthly_income_exact=?,
       differently_abled=?, disability_category=?,
       shg_membership=?, shg_role=?, shg_loan=?, shg_loan_savings=?, shg_loan_bank=?, shg_loan_mfi=?, shg_loan_others=?, loan_reason=?,
       fpo_membership=?, fpo_role=?, fpo_investment=?, fpo_type=?, fpo_commodity=?, fpo_market_linkage=?,
       gp_elected_member=?, gp_membership_details=?, assets_ownership=?, asset_type=?, land_type_detail=?,
       govt_schemes_benefit=?, scheme_benefit_details=?, mssrf_support_earlier=?, mssrf_support_details=?,
       other_ngo_support=?, ngo_support_details=?,
       type_of_house=?, ownership_status=?, number_of_rooms=?, type_of_roof=?, type_of_floor=?,
       access_to_electricity=?, source_of_lighting=?, cooking_fuel=?, separate_kitchen=?,
       primary_water_source=?, distance_to_water=?, water_availability=?,
       type_of_toilet_facility=?, type_of_toilet=?, handwashing_facility=?,
       use_of_soap=?, solid_waste_disposal=?,
       chronic_illness=?, chronic_illness_detail=?, nearest_health_facility=?, distance_to_health=?,
       health_insurance=?, health_insurance_scheme=?, pregnant_lactating=?, children_under_5=?,
       immunization_status=?, anganwadi_access=?, children_attending_school=?, type_of_school=?,
       dropout_cases=?, dropout_reason=?,
       household_assets=?, land_ownership=?, land_size_total=?, irrigation_type=?,
       residential_plot_size=?, land_size_other=?, livestock_ownership=?, livestock_types=?,
       access_to_credit=?, credit_sources=?, total_credit_amount=?,
       female_headed_household=?, migration_status=?, seasonal_migration=?,
       observation_remarks=?, respondent_comments=?,
       fishing_involved=?, fishing_type=?, boat_ownership=?, boat_type=?, gps_in_boat=?,
       fishing_method=?, fishing_frequency=?, lean_fishing_period=?, storage_facilities=?,
       storage_ownership=?, status=?, saved_step=?
       WHERE household_id=?`,
      [d.enumerator_name || null, d.survey_date || null, d.consent_obtained || 'Yes',
       d.gps_latitude || null, d.gps_longitude || null,
       d.head_name, d.head_age || null, d.mobile, d.social_category, d.marital_status || null,
       d.education || null, d.occupation || null, d.occupation_other || null,
       d.monthly_income || null, d.monthly_income_exact || null,
       d.differently_abled || 'No', d.disability_category || null,
       d.shg_membership || 'No', d.shg_role || null, d.shg_loan || 'No', d.shg_loan_savings || null, d.shg_loan_bank || null,
       d.shg_loan_mfi || null, d.shg_loan_others || null, d.loan_reason || null,
       d.fpo_membership || 'No', d.fpo_role || null, d.fpo_investment || null, d.fpo_type || null,
       d.fpo_commodity || null, d.fpo_market_linkage || null,
       d.gp_elected_member || 'No', d.gp_membership_details || null,
       d.assets_ownership || 'No', d.asset_type || null, d.land_type_detail || null,
       d.govt_schemes_benefit || null, d.scheme_benefit_details || null,
       d.mssrf_support_earlier || 'No', d.mssrf_support_details || null,
       d.other_ngo_support || 'No', d.ngo_support_details || null,
       d.type_of_house || null, d.ownership_status || null, d.number_of_rooms || null,
       d.type_of_roof || null, d.type_of_floor || null, d.access_to_electricity || 'Yes',
       d.source_of_lighting || null, d.cooking_fuel || null, d.separate_kitchen || 'Yes',
       d.primary_water_source || null, d.distance_to_water || null, d.water_availability || null,
       d.type_of_toilet_facility || null, d.type_of_toilet || null, d.handwashing_facility || 'Yes',
       d.use_of_soap || null, d.solid_waste_disposal || null,
       d.chronic_illness || 'No', d.chronic_illness_detail || null,
       d.nearest_health_facility || null, d.distance_to_health || null,
       d.health_insurance || 'No', d.health_insurance_scheme || null,
       d.pregnant_lactating || 'No', d.children_under_5 || 0,
       d.immunization_status || null, d.anganwadi_access || 'No',
       d.children_attending_school || null, d.type_of_school || null,
       d.dropout_cases || 'No', d.dropout_reason || null,
       d.household_assets || null, d.land_ownership || 'No', d.land_size_total || null,
       d.irrigation_type || null, d.residential_plot_size || null, d.land_size_other || null,
       d.livestock_ownership || 'No', d.livestock_types || null,
       d.access_to_credit || 'No', d.credit_sources || null, d.total_credit_amount || null,
       d.female_headed_household || 'No', d.migration_status || 'Non-migrant',
       d.seasonal_migration || 'No', d.observation_remarks || null,
       d.respondent_comments || null,
       d.fishing_involved || 'No', d.fishing_type || null, d.boat_ownership || null,
       d.boat_type || null, d.gps_in_boat || 'No', d.fishing_method || null,
       d.fishing_frequency || null, d.lean_fishing_period || null, d.storage_facilities || null,
       d.storage_ownership || null, d.status || 'Active', d.saved_step || 1, req.params.id]
    );
    
    // Update household members - delete existing and insert new
    if (d.members !== undefined) {
      // Delete existing members
      await conn.query('DELETE FROM household_members WHERE household_id = ?', [req.params.id]);
      
      // Insert new members if provided
      if (Array.isArray(d.members) && d.members.length > 0) {
        for (const member of d.members) {
          await conn.query(
            `INSERT INTO household_members 
             (household_id, member_name, age, relationship_to_head, social_category, 
              marital_status, education, occupation, monthly_income, mobile_number,
              differently_abled, disability_category, shg_membership, shg_role, shg_loan,
              shg_loan_savings, shg_loan_bank, shg_loan_mfi, shg_loan_others, loan_reason,
              fpo_membership, fpo_role, fpo_investment, fpo_type, fpo_commodity, fpo_market_linkage,
              gp_elected_member, gp_membership_details, assets_ownership, asset_type, land_type_detail,
              govt_schemes_benefit, scheme_benefit_details, mssrf_support_earlier, mssrf_support_details,
              other_ngo_support, ngo_support_details)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [req.params.id, member.member_name, member.age || null, 
             member.relationship_to_head || null, member.social_category || null,
             member.marital_status || null, member.education || null, 
             member.occupation || null, member.monthly_income || null, 
             member.mobile_number || null,
             member.differently_abled || 'No', member.disability_category || null,
             member.shg_membership || 'No', member.shg_role || null, member.shg_loan || 'No',
             member.shg_loan_savings || null, member.shg_loan_bank || null,
             member.shg_loan_mfi || null, member.shg_loan_others || null, member.loan_reason || null,
             member.fpo_membership || 'No', member.fpo_role || null, member.fpo_investment || null,
             member.fpo_type || null, member.fpo_commodity || null, member.fpo_market_linkage || null,
             member.gp_elected_member || 'No', member.gp_membership_details || null,
             member.assets_ownership || 'No', member.asset_type || null, member.land_type_detail || null,
             member.govt_schemes_benefit || null, member.scheme_benefit_details || null,
             member.mssrf_support_earlier || 'No', member.mssrf_support_details || null,
             member.other_ngo_support || 'No', member.ngo_support_details || null]
          );
        }
      }
    }
    
    await conn.query(
      'INSERT INTO audit_log (user_id,user_name,role,module,action,record_id,detail) VALUES (?,?,?,?,?,?,?)',
      [req.user.id, req.user.name, req.user.role, 'Household', 'UPDATE', req.params.id,
       `Household record updated${d.members !== undefined ? ` with ${d.members.length} members` : ''}`]
    );

    await conn.query(
      `INSERT INTO revision_log (household_id, changed_by_user_id, changed_by_name, user_role, action)
       VALUES (?, ?, ?, ?, 'EDITED')`,
      [req.params.id, req.user.id, req.user.name, req.user.role]
    );

    await conn.commit();
    conn.release();
    
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    if (conn) {
      await conn.rollback();
      conn.release();
    }
    res.status(500).json({ message: 'Internal server error' });
  }
});

/* ── Delete (admin only) ─────────────────────────── */
router.delete('/:id', auth, roles('admin'), async (req, res) => {
  const hh_id = req.params.id;
  const conn  = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [existing] = await conn.query(
      'SELECT household_id, head_name FROM household_master WHERE household_id = ?',
      [hh_id]
    );
    if (!existing.length) {
      await conn.rollback();
      conn.release();
      return res.status(404).json({ message: `Household ${hh_id} not found` });
    }

    const [linkDel] = await conn.query(
      'DELETE FROM project_household_link WHERE household_id = ?', [hh_id]
    );

    // Delete household members
    await conn.query(
      'DELETE FROM household_members WHERE household_id = ?', [hh_id]
    );

    await conn.query(
      'DELETE FROM household_master WHERE household_id = ?', [hh_id]
    );

    await conn.query(
      'INSERT INTO audit_log (user_id,user_name,role,module,action,record_id,detail) VALUES (?,?,?,?,?,?,?)',
      [req.user.id, req.user.name, req.user.role, 'Household', 'DELETE', hh_id,
       `Household deleted (${existing[0].head_name}); ${linkDel.affectedRows} link record(s) also removed`]
    );

    await conn.commit();
    conn.release();
    bustDashboardCache();
    res.json({
      success: true,
      message: `Household ${hh_id} and ${linkDel.affectedRows} linked benefit record(s) deleted`,
    });
  } catch (err) {
    console.error(err);
    if (conn) {
      await conn.rollback();
      conn.release();
    }
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
