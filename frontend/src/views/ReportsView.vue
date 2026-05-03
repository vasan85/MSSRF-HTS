<template>
  <div>
    <div class="breadcrumb">Home › <span>Reports & Analytics</span></div>
    <div class="page-header">
      <div><div class="page-title">Reports & Analytics</div><div class="page-sub">Project-wise and organisation-level impact reports</div></div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-primary btn-sm" @click="exportCurrentTab">⬇️ Export Excel</button>
      </div>
    </div>

    <!-- Geography filters -->
    <div class="geo-filter-bar">
      <div class="geo-filter-inner">
        <div class="geo-filter-label">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
          Filter by
        </div>
        <div class="geo-filter-divider"></div>
        <div class="geo-filter-fields">
          <div class="geo-filter-group">
            <label class="geo-filter-lbl">State</label>
            <select v-model="selectedState" @change="onStateChange" class="geo-filter-select">
              <option value="">All States</option>
              <option v-for="s in stateOptions" :key="s" :value="s">{{ s }}</option>
            </select>
          </div>
          <div class="geo-filter-group">
            <label class="geo-filter-lbl">District</label>
            <select v-model="selectedDistrict" @change="onDistrictChange" class="geo-filter-select">
              <option value="">All Districts</option>
              <option v-for="d in districtOptions" :key="d" :value="d">{{ d }}</option>
            </select>
          </div>
          <div class="geo-filter-group">
            <label class="geo-filter-lbl">Block</label>
            <select v-model="selectedBlock" @change="onBlockChange" class="geo-filter-select">
              <option value="">All Blocks</option>
              <option v-for="b in blockOptions" :key="b" :value="b">{{ b }}</option>
            </select>
          </div>
          <div class="geo-filter-group">
            <label class="geo-filter-lbl">Village</label>
            <select v-model="selectedVillage" class="geo-filter-select">
              <option value="">All Villages</option>
              <option v-for="v in villageOptions" :key="v" :value="v">{{ v }}</option>
            </select>
          </div>
        </div>
        <div class="geo-filter-actions">
          <button @click="applyGeoFilters" class="geo-btn-apply">Apply</button>
          <button @click="resetGeoFilters" class="geo-btn-reset">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            Reset
          </button>
        </div>
      </div>
      <!-- Active filter chips -->
      <div v-if="selectedState||selectedDistrict||selectedBlock||selectedVillage" class="geo-filter-chips">
        <span class="geo-chip-label">Active:</span>
        <span v-if="selectedState" class="geo-chip">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
          {{ selectedState }}
        </span>
        <span v-if="selectedDistrict" class="geo-chip">{{ selectedDistrict }}</span>
        <span v-if="selectedBlock" class="geo-chip">{{ selectedBlock }}</span>
        <span v-if="selectedVillage" class="geo-chip">{{ selectedVillage }}</span>
      </div>
    </div>

    <!-- Tab selector -->
    <div style="display:flex;gap:8px;margin-bottom:18px;flex-wrap:wrap">
      <button v-for="t in tabs" :key="t.key" :class="['btn btn-sm', activeTab===t.key?'btn-primary':'btn-outline']" @click="activeTab=t.key">{{ t.label }}</button>
    </div>

    <div class="loading-center" v-if="loading"><div class="spinner spinner-lg"></div></div>

    <template v-else>
      <!-- ═══════════════ 1. DEMOGRAPHIC & SOCIAL ═══════════════ -->
      <div v-if="activeTab==='demographic'">
        <!-- KPI Cards -->
        <div class="stat-grid stat-grid-5" style="margin-bottom:20px">
          <div class="stat-tile"><div class="stat-value">{{ demographicKPI.total_hh || 0 }}</div><div class="stat-label">Total Households</div></div>
          <div class="stat-tile blue"><div class="stat-value">{{ demographicKPI.female_headed_pct || 0 }}%</div><div class="stat-label">Female-Headed HH</div></div>
          <div class="stat-tile amber"><div class="stat-value">{{ demographicKPI.differently_abled_pct || 0 }}%</div><div class="stat-label">Differently-Abled</div></div>
          <div class="stat-tile purple"><div class="stat-value">{{ demographicKPI.zero_income_pct || 0 }}%</div><div class="stat-label">Zero Income HH</div></div>
          <div class="stat-tile teal"><div class="stat-value">{{ demographicKPI.total_members || 0 }}</div><div class="stat-label">Total Members</div></div>
        </div>

        <div style="display:grid;grid-template-columns:1.2fr 1fr;gap:18px;margin-bottom:18px">
          <!-- Population Pyramid -->
          <div class="card">
            <div class="card-header"><div class="card-title">👥 Population Pyramid (Age-Sex Distribution)</div></div>
            <div style="height:350px;padding:16px"><Bar :data="pyramidChartConfig" :options="pyramidOptions" /></div>
          </div>

          <!-- Social Category Pie -->
          <div class="card">
            <div class="card-header"><div class="card-title">📊 Social Category Distribution</div></div>
            <div style="height:350px;padding:16px"><Pie :data="socialCategoryPieConfig" :options="chartOptions" /></div>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:18px">
          <!-- Marital Status Doughnut -->
          <div class="card">
            <div class="card-header"><div class="card-title">💍 Marital Status Breakdown</div></div>
            <div style="height:300px;padding:16px"><Doughnut :data="maritalStatusDoughnutConfig" :options="chartOptions" /></div>
          </div>

          <!-- Vulnerability Heatmap -->
          <div class="card">
            <div class="card-header"><div class="card-title">🔥 Vulnerability Heat Map (Block-Level)</div></div>
            <div class="table-wrap">
              <table class="data-table">
                <thead><tr><th>Block</th><th>Female-Headed</th><th>Differently-Abled</th><th>Migrant</th><th>Risk Score</th></tr></thead>
                <tbody>
                  <tr v-for="v in vulnerabilityHeatmap" :key="v.block">
                    <td><strong>{{ v.block }}</strong></td>
                    <td><span :class="['tag', heatColor(v.female_headed)]">{{ v.female_headed }}</span></td>
                    <td><span :class="['tag', heatColor(v.differently_abled)]">{{ v.differently_abled }}</span></td>
                    <td><span :class="['tag', heatColor(v.migrant)]">{{ v.migrant }}</span></td>
                    <td><span :class="['tag', heatColor(v.risk_score)]" style="font-weight:700">{{ v.risk_score }}</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Cross-tab Tables -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px">
          <div class="card">
            <div class="card-header"><div class="card-title">📚 Social Category × Education Level</div></div>
            <div class="table-wrap">
              <table class="data-table crosstab-table">
                <thead><tr><th>Category</th><th>Illiterate</th><th>Primary</th><th>Secondary</th><th>Graduate+</th></tr></thead>
                <tbody>
                  <tr v-for="row in socialEducationCrossTab" :key="row.category">
                    <td><strong>{{ row.category }}</strong></td>
                    <td>{{ row.illiterate }}</td>
                    <td>{{ row.pri_edu }}</td>
                    <td>{{ row.sec_edu }}</td>
                    <td>{{ row.graduate }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="card">
            <div class="card-header"><div class="card-title">👔 Gender × Occupation</div></div>
            <div class="table-wrap">
              <table class="data-table crosstab-table">
                <thead><tr><th>Occupation</th><th>Male</th><th>Female</th><th>Total</th></tr></thead>
                <tbody>
                  <tr v-for="row in genderOccupationCrossTab" :key="row.occupation">
                    <td><strong>{{ row.occupation }}</strong></td>
                    <td>{{ row.male }}</td>
                    <td>{{ row.female }}</td>
                    <td><strong>{{ row.total }}</strong></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- ═══════════════ 2. LIVELIHOODS & INCOME ═══════════════ -->
      <div v-if="activeTab==='livelihood'">
        <!-- KPI Cards -->
        <div class="stat-grid stat-grid-5" style="margin-bottom:20px">
          <div class="stat-tile"><div class="stat-value">₹{{ livelihoodKPI.avg_monthly_income || 0 }}</div><div class="stat-label">Avg Monthly Income</div></div>
          <div class="stat-tile blue"><div class="stat-value">{{ livelihoodKPI.shg_loan_pct || 0 }}%</div><div class="stat-label">With SHG Loan</div></div>
          <div class="stat-tile amber"><div class="stat-value">{{ livelihoodKPI.self_employed_pct || 0 }}%</div><div class="stat-label">Self-Employed</div></div>
          <div class="stat-tile purple"><div class="stat-value">{{ livelihoodKPI.loan_to_income_ratio || 0 }}</div><div class="stat-label">Loan-to-Income Ratio</div></div>
          <div class="stat-tile teal"><div class="stat-value">₹{{ livelihoodKPI.total_loans || 0 }}</div><div class="stat-label">Total Loans (Lakh)</div></div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:18px">
          <!-- Income Bracket Stacked Bar -->
          <div class="card">
            <div class="card-header"><div class="card-title">💰 Income Distribution (SHG vs Non-SHG)</div></div>
            <div style="height:320px;padding:16px"><Bar :data="incomeStackedBarConfig" :options="stackedOptions" /></div>
          </div>

          <!-- Loan Source Ranked Bar -->
          <div class="card">
            <div class="card-header"><div class="card-title">🏦 Loan Amount by Source</div></div>
            <div style="height:320px;padding:16px"><Bar :data="loanSourceBarConfig" :options="horizontalOptions" /></div>
          </div>
        </div>

        <!-- Loan Utilisation Table -->
        <div class="card">
          <div class="card-header"><div class="card-title">📊 Block-wise Loan Source Breakdown</div></div>
          <div class="table-wrap">
            <table class="data-table">
              <thead><tr><th>Block</th><th>SHG Savings</th><th>Bank</th><th>MFI</th><th>Others</th><th>Total Amount</th></tr></thead>
              <tbody>
                <tr v-for="row in loanUtilisationData" :key="row.block">
                  <td><strong>{{ row.block }}</strong></td>
                  <td>₹{{ row.shg_savings }}</td>
                  <td>₹{{ row.bank }}</td>
                  <td>₹{{ row.mfi }}</td>
                  <td>₹{{ row.others }}</td>
                  <td><strong>₹{{ row.total }}</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ═══════════════ 3. COMMUNITY INSTITUTIONS ═══════════════ -->
      <div v-if="activeTab==='community'">
        <!-- KPI Cards -->
        <div class="stat-grid stat-grid-5" style="margin-bottom:20px">
          <div class="stat-tile"><div class="stat-value">{{ communityKPI.shg_pct || 0 }}%</div><div class="stat-label">HH in SHG</div></div>
          <div class="stat-tile blue"><div class="stat-value">{{ communityKPI.fpo_pct || 0 }}%</div><div class="stat-label">HH in FPO</div></div>
          <div class="stat-tile amber"><div class="stat-value">{{ communityKPI.gp_members_pct || 0 }}%</div><div class="stat-label">GP Members</div></div>
          <div class="stat-tile purple"><div class="stat-value">₹{{ communityKPI.avg_shg_loan || 0 }}</div><div class="stat-label">Avg SHG Loan</div></div>
          <div class="stat-tile teal"><div class="stat-value">{{ communityKPI.total_cbos || 0 }}</div><div class="stat-label">Total CBOs</div></div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:18px">
          <!-- Membership Funnel -->
          <div class="card">
            <div class="card-header"><div class="card-title">🔻 Membership Funnel (SHG Progression)</div></div>
            <div class="funnel-container">
              <div v-for="(step, i) in membershipFunnel" :key="step.stage" class="funnel-step"
                   :style="{ width: (100 - i * 15) + '%', background: colors[i] }">
                <strong>{{ step.stage }}</strong>
                <span>{{ step.count }} ({{ step.pct }}%)</span>
              </div>
            </div>
          </div>

          <!-- GP Representation Table -->
          <div class="card">
            <div class="card-header"><div class="card-title">🏛️ GP Elected Members</div></div>
            <div class="table-wrap">
              <table class="data-table">
                <thead><tr><th>Block</th><th>Total HH</th><th>GP Members</th><th>Coverage %</th></tr></thead>
                <tbody>
                  <tr v-for="gp in gpRepresentation" :key="gp.block">
                    <td><strong>{{ gp.block }}</strong></td>
                    <td>{{ gp.total_households }}</td>
                    <td>{{ gp.gp_members }}</td>
                    <td><strong>{{ gp.pct }}%</strong></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- ═══════════════ 4. WASH & HOUSING ═══════════════ -->
      <div v-if="activeTab==='wash'">
        <!-- KPI Cards -->
        <div class="stat-grid stat-grid-5" style="margin-bottom:20px">
          <div class="stat-tile"><div class="stat-value">{{ washKPI.odf_pct || 0 }}%</div><div class="stat-label">ODF Coverage</div></div>
          <div class="stat-tile blue"><div class="stat-value">{{ washKPI.piped_water_pct || 0 }}%</div><div class="stat-label">Piped Water Access</div></div>
          <div class="stat-tile amber"><div class="stat-value">{{ washKPI.lpg_pct || 0 }}%</div><div class="stat-label">LPG Users</div></div>
          <div class="stat-tile purple"><div class="stat-value">{{ washKPI.electricity_pct || 0 }}%</div><div class="stat-label">With Electricity</div></div>
          <div class="stat-tile teal"><div class="stat-value">{{ washKPI.pucca_house_pct || 0 }}%</div><div class="stat-label">Pucca Houses</div></div>
        </div>

        <div style="display:grid;grid-template-columns:1.2fr 1fr;gap:18px;margin-bottom:18px">
          <!-- House Type Stacked Bar -->
          <div class="card">
            <div class="card-header"><div class="card-title">🏠 House Type Distribution by Block</div></div>
            <div style="height:320px;padding:16px"><Bar :data="houseTypeStackedConfig" :options="stackedOptions" /></div>
          </div>

          <!-- WASH Radar Chart -->
          <div class="card">
            <div class="card-header"><div class="card-title">📊 WASH Composite Score</div></div>
            <div style="height:320px;padding:16px"><Radar :data="washRadarConfig" :options="chartOptions" /></div>
          </div>
        </div>

        <!-- ODF Progress Tracker -->
        <div class="card">
          <div class="card-header"><div class="card-title">🚽 ODF Progress Tracker (Block-Level)</div></div>
          <div class="table-wrap">
            <table class="data-table">
              <thead><tr><th>Block</th><th>Total HH</th><th>With Toilet</th><th>Toilet Coverage %</th><th>Open Defecation %</th><th>Status</th></tr></thead>
              <tbody>
                <tr v-for="odf in odfProgress" :key="odf.block">
                  <td><strong>{{ odf.block }}</strong></td>
                  <td>{{ odf.total_hh }}</td>
                  <td>{{ odf.with_toilet }}</td>
                  <td>
                    <div class="progress-bar" style="width:100px">
                      <div class="progress-fill" :style="{ width: odf.toilet_pct+'%', background: odf.toilet_pct>=90?'#2e7d32':'#f59e0b' }"></div>
                    </div>
                    {{ odf.toilet_pct }}%
                  </td>
                  <td><span :class="['tag', odf.odf_pct<5?'tag-green':'tag-red']">{{ odf.odf_pct }}%</span></td>
                  <td><span :class="['tag', odf.toilet_pct>=90?'tag-green':'tag-amber']">{{ odf.toilet_pct>=90 ? 'ODF' : 'In Progress' }}</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ═══════════════ 5. HEALTH & EDUCATION ═══════════════ -->
      <div v-if="activeTab==='health'">
        <!-- KPI Cards -->
        <div class="stat-grid stat-grid-5" style="margin-bottom:20px">
          <div class="stat-tile"><div class="stat-value">{{ healthKPI.chronic_illness_pct || 0 }}%</div><div class="stat-label">Chronic Illness</div></div>
          <div class="stat-tile blue"><div class="stat-value">{{ healthKPI.insurance_coverage_pct || 0 }}%</div><div class="stat-label">Insurance Coverage</div></div>
          <div class="stat-tile amber"><div class="stat-value">{{ healthKPI.immunisation_rate || 0 }}%</div><div class="stat-label">Immunisation Rate</div></div>
          <div class="stat-tile purple"><div class="stat-value">{{ healthKPI.anganwadi_access_pct || 0 }}%</div><div class="stat-label">Anganwadi Access</div></div>
          <div class="stat-tile teal"><div class="stat-value">{{ healthKPI.school_enrolment_pct || 0 }}%</div><div class="stat-label">School Enrolment</div></div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:18px">
          <!-- Immunisation Stacked Bar -->
          <div class="card">
            <div class="card-header"><div class="card-title">💉 Immunisation Status by Block</div></div>
            <div style="height:320px;padding:16px"><Bar :data="immunisationStackedConfig" :options="stackedOptions" /></div>
          </div>

          <!-- 2x2 Risk Matrix -->
          <div class="card">
            <div class="card-header"><div class="card-title">⚠️ Health Risk Matrix (Uninsured + Chronic Illness)</div></div>
            <div class="risk-matrix">
              <div class="risk-quad risk-high"><div class="risk-label">High Risk</div><div class="risk-count">{{ riskMatrix[0]?.high_risk || 0 }} HH</div></div>
              <div class="risk-quad risk-medium"><div class="risk-label">Medium Risk</div><div class="risk-count">{{ riskMatrix[0]?.medium_risk || 0 }} HH</div></div>
              <div class="risk-quad risk-medium"><div class="risk-label">Medium Risk</div><div class="risk-count">{{ riskMatrix[0]?.medium_risk_2 || 0 }} HH</div></div>
              <div class="risk-quad risk-low"><div class="risk-label">Low Risk</div><div class="risk-count">{{ riskMatrix[0]?.low_risk || 0 }} HH</div></div>
            </div>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px">
          <!-- Dropout Funnel -->
          <div class="card">
            <div class="card-header"><div class="card-title">🎓 Education Dropout Funnel</div></div>
            <div class="funnel-container">
              <div v-for="(step, i) in dropoutFunnel" :key="step.stage" class="funnel-step"
                   :style="{ width: (100 - i * 18) + '%', background: colors[i] }">
                <strong>{{ step.stage }}</strong>
                <span>{{ step.count }} ({{ step.pct }}%)</span>
              </div>
            </div>
          </div>

          <!-- Targeting Register (Preview) -->
          <div class="card">
            <div class="card-header">
              <div class="card-title">📋 Targeting Register (Priority HH)</div>
              <button class="btn btn-sm btn-outline" @click="exportCurrentTab">⬇️ Export Full List</button>
            </div>
            <div class="table-wrap" style="max-height:300px">
              <table class="data-table dense-table">
                <thead><tr><th>HH ID</th><th>Village</th><th>Issue</th><th>Priority</th></tr></thead>
                <tbody>
                  <tr v-for="t in targetingRegister.slice(0,10)" :key="t.household_id">
                    <td><span class="id-badge">{{ t.household_id }}</span></td>
                    <td>{{ t.village }}</td>
                    <td>{{ t.issue }}</td>
                    <td><span :class="['tag', t.priority==='High'?'tag-red':'tag-amber']">{{ t.priority }}</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div style="padding:8px;text-align:center;font-size:12px;color:var(--grey-500)">Showing 10 of {{ targetingRegister.length }} households</div>
          </div>
        </div>
      </div>

      <!-- ═══════════════ 6. AGRICULTURE & FISHERIES ═══════════════ -->
      <div v-if="activeTab==='agriculture'">
        <!-- KPI Cards -->
        <div class="stat-grid stat-grid-5" style="margin-bottom:20px">
          <div class="stat-tile"><div class="stat-value">{{ agricultureKPI.with_land_pct || 0 }}%</div><div class="stat-label">With Agriculture Land</div></div>
          <div class="stat-tile blue"><div class="stat-value">{{ agricultureKPI.avg_land_size || 0 }}</div><div class="stat-label">Avg Land Size (acres)</div></div>
          <div class="stat-tile amber"><div class="stat-value">{{ agricultureKPI.with_livestock_pct || 0 }}%</div><div class="stat-label">With Livestock</div></div>
          <div class="stat-tile purple"><div class="stat-value">{{ agricultureKPI.in_fisheries_pct || 0 }}%</div><div class="stat-label">In Fisheries</div></div>
          <div class="stat-tile teal"><div class="stat-value">{{ agricultureKPI.total_boats || 0 }}</div><div class="stat-label">Total Boats</div></div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:18px">
          <!-- Land Distribution Histogram -->
          <div class="card">
            <div class="card-header"><div class="card-title">🌾 Landholding Size Distribution</div></div>
            <div class="table-wrap">
              <table class="data-table">
                <thead><tr><th>Size Range (acres)</th><th>Male-Owned</th><th>Female-Owned</th><th>Total HH</th></tr></thead>
                <tbody>
                  <tr v-for="land in landDistribution" :key="land.size_range">
                    <td><strong>{{ land.size_range }}</strong></td>
                    <td>{{ land.male_owned }}</td>
                    <td>{{ land.female_owned }}</td>
                    <td><strong>{{ land.total }}</strong></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Irrigation & Livestock Frequency -->
          <div class="card">
            <div class="card-header"><div class="card-title">💧 Irrigation Types (Multi-Select Frequency)</div></div>
            <div class="bar-chart-wrap">
              <div class="bar-chart" style="height:200px">
                <div v-for="(irr, i) in irrigationTypes" :key="irr.type" class="bar-col">
                  <div class="bar-val">{{ irr.hh_count }}</div>
                  <div class="bar" :style="{ height: (irr.hh_count / irrigationTypes[0]?.hh_count * 100) + '%', background: colors[i] }"></div>
                  <div class="bar-label">{{ irr.type }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Fisheries Profile Cards -->
        <div class="card">
          <div class="card-header"><div class="card-title">🐟 Fisheries Profile by Coastal Village</div></div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:16px;padding:16px">
            <div v-for="fish in fisheriesProfile" :key="fish.village" class="profile-card">
              <h4>{{ fish.village }}</h4>
              <div class="profile-row"><span>Boat Ownership:</span><strong>{{ fish.boat_ownership || '—' }}</strong></div>
              <div class="profile-row"><span>GPS in Boat:</span><strong>{{ fish.gps_pct != null ? fish.gps_pct + '%' : '—' }}</strong></div>
              <div class="profile-row"><span>Lean Season:</span><strong>{{ fish.lean_months || '—' }}</strong></div>
              <div class="profile-row"><span>Storage Access:</span><strong>{{ fish.storage_pct != null ? fish.storage_pct + '%' : '—' }}</strong></div>
            </div>
          </div>
        </div>
      </div>

      <!-- ═══════════════ 7. PROGRAMME TRACKING ═══════════════ -->
      <div v-if="activeTab==='programme'">
        <!-- KPI Cards -->
        <div class="stat-grid stat-grid-5" style="margin-bottom:20px">
          <div class="stat-tile"><div class="stat-value">{{ programmeKPI.total_surveyed || 0 }}</div><div class="stat-label">Total HH Surveyed</div></div>
          <div class="stat-tile blue"><div class="stat-value">{{ programmeKPI.mssrf_beneficiaries_pct || 0 }}%</div><div class="stat-label">MSSRF Beneficiaries</div></div>
          <div class="stat-tile amber"><div class="stat-value">{{ programmeKPI.top_scheme || '-' }}</div><div class="stat-label">Top Scheme</div></div>
          <div class="stat-tile purple"><div class="stat-value">{{ programmeKPI.consent_refusal_pct || 0 }}%</div><div class="stat-label">Consent Refusal Rate</div></div>
          <div class="stat-tile teal"><div class="stat-value">{{ programmeKPI.completion_rate || 0 }}%</div><div class="stat-label">Survey Completion</div></div>
        </div>

        <!-- Scheme Coverage Matrix -->
        <div class="card" style="margin-bottom:18px">
          <div class="card-header"><div class="card-title">📊 Scheme Coverage Matrix (by Block)</div></div>
          <div class="table-wrap">
            <table class="data-table coverage-matrix">
              <thead>
                <tr>
                  <th>Scheme</th>
                  <th v-for="block in schemeCoverage[0]?.blocks || []" :key="block.name">{{ block.name }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="scheme in schemeCoverage" :key="scheme.scheme_name">
                  <td><strong>{{ scheme.scheme_name }}</strong></td>
                  <td v-for="block in scheme.blocks" :key="block.name" :style="{ background: getCoverageColor(block.coverage_pct) }">
                    {{ block.coverage_pct }}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:18px">
          <!-- Survey Progress -->
          <div class="card">
            <div class="card-header"><div class="card-title">📈 Survey Progress (Block-wise)</div></div>
            <div style="padding:16px">
              <div v-for="prog in surveyProgress" :key="prog.block" style="margin-bottom:12px">
                <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                  <strong>{{ prog.block }}</strong>
                  <span>{{ prog.completed }} / {{ prog.target }} ({{ prog.completion_pct }}%)</span>
                </div>
                <div class="progress-bar" style="height:24px">
                  <div class="progress-fill" :style="{ width: prog.completion_pct+'%', background: prog.completion_pct>=100?'#2e7d32':prog.completion_pct>=80?'#0288d1':'#f59e0b' }"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- NGO Overlap -->
          <div class="card">
            <div class="card-header"><div class="card-title">🤝 NGO Programme Overlap</div></div>
            <div class="table-wrap">
              <table class="data-table">
                <thead><tr><th>NGO Programme</th><th>HH Count</th><th>MSSRF Overlap %</th></tr></thead>
                <tbody>
                  <tr v-for="ngo in ngoOverlap" :key="ngo.programme">
                    <td><strong>{{ ngo.programme }}</strong></td>
                    <td>{{ ngo.hh_count }}</td>
                    <td>
                      <div class="progress-bar" style="width:100px">
                        <div class="progress-fill" :style="{ width: ngo.overlap_pct+'%', background: '#7c3aed' }"></div>
                      </div>
                      {{ ngo.overlap_pct }}%
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- Project Reports -->
      <div v-if="activeTab==='project'">
        <div class="card">
          <div class="card-header">
            <div class="card-title">Project-wise Report</div>
            <select v-model="selProject" class="form-select" style="width:230px" @change="loadProjectStats">
              <option v-for="p in projects" :key="p.project_id" :value="p.project_id">{{ p.project_code }} · {{ p.project_name }}</option>
            </select>
          </div>
          <div class="stat-grid stat-grid-4" v-if="pStats" style="margin-bottom:0">
            <div class="stat-tile"><div class="stat-value">{{ pStats.total_hh }}</div><div class="stat-label">Total Households</div></div>
            <div class="stat-tile blue"><div class="stat-value">{{ pStats.active_hh }}</div><div class="stat-label">Active Households</div></div>
            <div class="stat-tile amber"><div class="stat-value">{{ pStats.vulnerable_hh }}</div><div class="stat-label">Vulnerable HH</div></div>
            <div class="stat-tile purple"><div class="stat-value">₹{{ Number(pStats.total_value||0).toLocaleString('en-IN') }}</div><div class="stat-label">Total Benefit Value</div></div>
          </div>
        </div>

        <div class="card">
          <div class="card-header"><div class="card-title">Benefit Type Distribution</div></div>
          <div class="bar-chart-wrap">
            <div class="bar-chart">
              <div v-for="(b,i) in benefitDist" :key="b.benefit_type" class="bar-col">
                <div class="bar-val">{{ b.count }}</div>
                <div class="bar" :style="{ height: barH(b)+'%', background: colors[i] }"></div>
                <div class="bar-label">{{ b.benefit_type }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Org-wide Report -->
      <div v-if="activeTab==='org'">
        <div class="card">
          <div class="card-header">
            <div class="card-title">Organisation-Level Report</div>
            <span style="font-size:12px;color:var(--grey-500)">All counts use <strong>DISTINCT Household ID</strong></span>
          </div>
          <div class="table-wrap">
            <table class="data-table">
              <thead><tr><th>Metric</th><th>Value</th><th>Notes</th></tr></thead>
              <tbody>
                <tr><td>Total Registered Households</td><td><strong>{{ orgR.registered_hh }}</strong></td><td>Raw count across all villages</td></tr>
                <tr><td>Total Unique Benefitted HH</td><td><strong>{{ orgR.unique_benefitted }}</strong></td><td>DISTINCT Household ID count</td></tr>
                <tr><td>HH with Multiple Interventions</td><td><strong>{{ orgR.multi_intervention }}</strong></td><td>2 or more projects</td></tr>
                <tr><td>Avg. Interventions per HH</td><td><strong>{{ orgR.avg_interventions }}</strong></td><td>Across benefitted HH</td></tr>
                <tr><td>Village Coverage Ratio</td><td><strong>{{ orgR.village_coverage_ratio }}%</strong></td><td>Villages with &gt;50% HH coverage</td></tr>
                <tr><td>Overlap Analysis (3+ projects)</td><td><strong>{{ orgR.overlap_3plus }}</strong></td><td>HH in 3 or more projects</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Village coverage table -->
        <div class="card">
          <div class="card-header"><div class="card-title">Village-wise Coverage</div></div>
          <div class="table-wrap">
            <table class="data-table">
              <thead><tr><th>Village</th><th>Block</th><th>Total HH</th><th>Registered</th><th>Benefitted</th><th>Coverage %</th></tr></thead>
              <tbody>
                <tr v-for="v in villageCov" :key="v.village_id">
                  <td><strong>{{ v.village_name }}</strong></td>
                  <td>{{ v.block_name }}</td>
                  <td>{{ v.total_households }}</td>
                  <td>{{ v.registered_hh }}</td>
                  <td>{{ v.benefitted_hh }}</td>
                  <td>
                    <div style="display:flex;align-items:center;gap:8px">
                      <div class="progress-bar" style="width:80px">
                        <div class="progress-fill" :style="{ width: v.coverage_pct+'%', background: covColor(v.coverage_pct) }"></div>
                      </div>
                      <span :style="{ fontWeight:700, color: covColor(v.coverage_pct) }">{{ v.coverage_pct }}%</span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- GIS Report -->
      <div v-if="activeTab==='gis'">
        <div class="card">
          <div class="card-header"><div class="card-title">🗺️ Geospatial Coverage Report</div></div>
          <div class="table-wrap">
            <table class="data-table">
              <thead><tr><th>Village</th><th>District</th><th>Total HH</th><th>Benefitted HH</th><th>Coverage %</th><th>Geotagged HH</th><th>GPS Coverage</th></tr></thead>
              <tbody>
                <tr v-for="v in gisV" :key="v.village_id">
                  <td><strong>{{ v.village_name }}</strong></td>
                  <td>{{ v.district_name }}</td>
                  <td>{{ v.total_households }}</td>
                  <td>{{ v.benefitted_hh }}</td>
                  <td><span :class="['tag', v.coverage_pct>=80?'tag-green':v.coverage_pct>=50?'tag-amber':'tag-red']">{{ v.coverage_pct }}%</span></td>
                  <td>{{ v.geotagged_hh }}</td>
                  <td>
                    <div class="progress-bar" style="width:80px">
                      <div class="progress-fill" :style="{ width: gpsPct(v)+'%', background:'var(--teal)' }"></div>
                    </div>
                    {{ gpsPct(v) }}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import api from '../api'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement,
  ArcElement, RadialLinearScale, Title, Tooltip, Legend, Filler
} from 'chart.js'
import { Bar, Pie, Doughnut, Radar, Line, Bubble } from 'vue-chartjs'

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement,
  ArcElement, RadialLinearScale, Title, Tooltip, Legend, Filler)

const loading    = ref(true)
const activeTab  = ref('demographic')
const loadedTabs = ref(new Set(['demographic'])) // Track which tabs have been loaded
const tabs = [
  { key:'demographic', label:'👥 Demographic & Social' },
  { key:'livelihood', label:'💼 Livelihoods & Income' },
  { key:'community', label:'🤝 Community Institutions' },
  { key:'wash', label:'🚰 WASH & Housing' },
  { key:'health', label:'🏥 Health & Education' },
  { key:'agriculture', label:'🌾 Agriculture & Fisheries' },
  { key:'programme', label:'📋 Programme Tracking' },
  { key:'project', label:'📊 Project Reports' },
  { key:'org',     label:'🌐 Org-wide Reports' },
  { key:'gis',     label:'🗺️ GIS Reports' },
]
const projects   = ref([])
const selProject = ref('')
const pStats     = ref(null)
const benefitDist= ref([])
const orgR       = ref({})
const villageCov = ref([])
const gisV       = ref([])

const selectedState = ref('')
const selectedDistrict = ref('')
const selectedBlock = ref('')
const selectedVillage = ref('')

const stateOptions = ref([])
const districtOptions = ref([])
const blockOptions = ref([])
const villageOptions = ref([])

const reportQueryParams = computed(() => {
  const params = {}
  if (selectedState.value) params.state = selectedState.value
  if (selectedDistrict.value) params.district = selectedDistrict.value
  if (selectedBlock.value) params.block = selectedBlock.value
  if (selectedVillage.value) params.village = selectedVillage.value
  return params
})

function reportGet(url) {
  return api.get(url, { params: reportQueryParams.value })
}

// 1. Demographic & Social data
const demographicKPI = ref({})
const populationPyramid = ref({ males: [], females: [], ageGroups: [] })
const socialCategory = ref([])
const maritalStatus = ref([])
const vulnerabilityHeatmap = ref([])
const socialEducationCrossTab = ref([])
const genderOccupationCrossTab = ref([])

// 2. Livelihoods & Income data
const livelihoodKPI = ref({})
const incomeBracketData = ref({ shgMembers: [], nonMembers: [], brackets: [] })
const occupationIncomeData = ref([])
const loanSourceData = ref([])
const loanUtilisationData = ref([])

// 3. Community Institutions data
const communityKPI = ref({})
const membershipFunnel = ref([])
const fpoTypeData = ref([])
const gpRepresentation = ref([])

// 4. WASH & Housing data
const washKPI = ref({})
const houseTypeData = ref([])
const odfProgress = ref([])
const washRadarData = ref({})
const waterSourceMap = ref([])

// 5. Health & Education data
const healthKPI = ref({})
const riskMatrix = ref([])
const dropoutFunnel = ref([])
const immunisationData = ref([])
const targetingRegister = ref([])

// 6. Agriculture & Fisheries data
const agricultureKPI = ref({})
const landDistribution = ref([])
const irrigationTypes = ref([])
const livestockTypes = ref([])
const fisheriesProfile = ref([])
const assetHeatmap = ref([])

// 7. Programme Tracking data
const programmeKPI = ref({})
const schemeCoverage = ref([])
const surveyProgress = ref([])
const gpsMapData = ref([])
const ngoOverlap = ref([])

const colors = ['#2e7d32','#0288d1','#f59e0b','#d32f2f','#7c3aed','#00897b','#e91e63','#5e35b1']

// Chart configurations
const pyramidChartConfig = computed(() => ({
  labels: populationPyramid.value.ageGroups,
  datasets: [
    { label: 'Male', data: populationPyramid.value.males.map(v => -v), backgroundColor: '#0288d1', barThickness: 20 },
    { label: 'Female', data: populationPyramid.value.females, backgroundColor: '#e91e63', barThickness: 20 }
  ]
}))

const socialCategoryPieConfig = computed(() => {
  const data = Array.isArray(socialCategory.value) ? socialCategory.value : [];
  return {
    labels: data.map(s => s.category),
    datasets: [{ data: data.map(s => s.count), backgroundColor: colors }]
  };
})

const maritalStatusDoughnutConfig = computed(() => {
  const data = Array.isArray(maritalStatus.value) ? maritalStatus.value : [];
  return {
    labels: data.map(m => m.status),
    datasets: [{ data: data.map(m => m.count), backgroundColor: colors }]
  };
})

const incomeStackedBarConfig = computed(() => {
  const brackets = Array.isArray(incomeBracketData.value.brackets) ? incomeBracketData.value.brackets : [];
  const shgMembers = Array.isArray(incomeBracketData.value.shgMembers) ? incomeBracketData.value.shgMembers : [];
  const nonMembers = Array.isArray(incomeBracketData.value.nonMembers) ? incomeBracketData.value.nonMembers : [];
  return {
    labels: brackets,
    datasets: [
      { label: 'SHG Members', data: shgMembers, backgroundColor: '#2e7d32' },
      { label: 'Non-Members', data: nonMembers, backgroundColor: '#0288d1' }
    ]
  };
})

const loanSourceBarConfig = computed(() => {
  const data = Array.isArray(loanSourceData.value) ? loanSourceData.value : [];
  return {
    labels: data.map(l => l.source),
    datasets: [{ label: 'Loan Amount (₹)', data: data.map(l => l.avg_loan || 0), backgroundColor: colors }]
  };
})

const houseTypeStackedConfig = computed(() => {
  const data = Array.isArray(houseTypeData.value) ? houseTypeData.value : [];
  return {
    labels: data.map(h => h.block),
    datasets: [
      { label: 'Kutcha', data: data.map(h => h.kutcha_pct || 0), backgroundColor: '#d32f2f' },
      { label: 'Semi-Pucca', data: data.map(h => h.semi_pucca_pct || 0), backgroundColor: '#f59e0b' },
      { label: 'Pucca', data: data.map(h => h.pucca_pct || 0), backgroundColor: '#2e7d32' }
    ]
  };
})

const washRadarConfig = computed(() => ({
  labels: ['Water', 'Toilet', 'Handwashing', 'Waste', 'Fuel', 'Electricity'],
  datasets: [{
    label: 'WASH Score',
    data: [washRadarData.value.water||0, washRadarData.value.toilet||0, washRadarData.value.handwashing||0,
           washRadarData.value.waste||0, washRadarData.value.fuel||0, washRadarData.value.electricity||0],
    backgroundColor: 'rgba(46,125,50,0.2)',
    borderColor: '#2e7d32',
    pointBackgroundColor: '#2e7d32'
  }]
}))

const immunisationStackedConfig = computed(() => {
  const data = Array.isArray(immunisationData.value) ? immunisationData.value : [];
  return {
    labels: data.map(i => i.block),
    datasets: [
      { label: 'Full', data: data.map(i => i.full || 0), backgroundColor: '#2e7d32' },
      { label: 'Partial', data: data.map(i => i.partial || 0), backgroundColor: '#f59e0b' },
      { label: 'None', data: data.map(i => i.none || 0), backgroundColor: '#d32f2f' }
    ]
  };
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: 'bottom' } }
}

const stackedOptions = {
  ...chartOptions,
  scales: { x: { stacked: true }, y: { stacked: true } }
}

const horizontalOptions = {
  ...chartOptions,
  indexAxis: 'y'
}

const pyramidOptions = {
  ...chartOptions,
  indexAxis: 'y',
  scales: { x: { ticks: { callback: (value) => Math.abs(value) } } }
}

const barH = b => {
  const max = Math.max(...benefitDist.value.map(x=>x.count),1)
  return Math.round(b.count/max*100)
}
const covColor = pct => pct>=80?'#2e7d32':pct>=50?'#f59e0b':'#d32f2f'
const gpsPct   = v   => v.registered_hh ? Math.round(v.geotagged_hh/v.registered_hh*100) : 0

// Helper functions for new reports
const heatColor = (score) => {
  if (score >= 75) return 'tag-red'
  if (score >= 50) return 'tag-amber'
  if (score >= 25) return 'tag-amber'
  return 'tag-green'
}

const getCoverageColor = (pct) => {
  if (pct >= 80) return '#c8e6c9' // light green
  if (pct >= 60) return '#fff9c4' // light yellow
  if (pct >= 40) return '#ffe0b2' // light orange
  if (pct >= 20) return '#ffccbc' // light red
  return '#f5f5f5' // gray
}

async function loadProjectStats() {
  const [{ data: ps }, { data: bd }] = await Promise.all([
    api.get('/dashboard/project-stats', { params:{ project_id: selProject.value } }),
    api.get('/dashboard/benefit-distribution', { params:{ project_id: selProject.value } }),
  ])
  pStats.value     = ps[0] || null
  benefitDist.value= bd
}

function exportCurrentTab() {
  import('xlsx').then(({ utils, writeFile }) => {
    const wb = utils.book_new()
    const geo = [
      selectedState.value || 'All States',
      selectedDistrict.value || 'All Districts',
      selectedBlock.value || 'All Blocks',
      selectedVillage.value || 'All Villages'
    ].filter(v => !v.startsWith('All')).join(' > ') || 'All India'

    const tab = activeTab.value
    const tabLabel = tabs.find(t => t.key === tab)?.label?.replace(/^[^ ]+ /, '') || tab
    const timestamp = new Date().toLocaleString('en-IN')

    function addSheet(name, rows) {
      const ws = utils.aoa_to_sheet(rows)
      utils.book_append_sheet(wb, ws, name.substring(0, 31))
    }

    if (tab === 'demographic') {
      addSheet('KPIs', [
        ['MSSRF MIS-HITS — Demographic & Social Report'],
        ['Geography Filter:', geo],
        ['Generated:', timestamp],
        [],
        ['Metric', 'Value'],
        ['Total Households', demographicKPI.value.total_hh || 0],
        ['Female Headed HH (%)', demographicKPI.value.female_headed_pct || 0],
        ['SC/ST (%)', demographicKPI.value.sc_st_pct || 0],
        ['Below Poverty Line (%)', demographicKPI.value.bpl_pct || 0],
        ['Differently Abled (%)', demographicKPI.value.differently_abled_pct || 0],
      ])
      if (socialCategory.value.length) {
        addSheet('Social Category', [
          ['Category', 'Count'],
          ...socialCategory.value.map(r => [r.category, r.count])
        ])
      }

    } else if (tab === 'livelihood') {
      addSheet('KPIs', [
        ['MSSRF MIS-HITS — Livelihoods & Income Report'],
        ['Geography Filter:', geo],
        ['Generated:', timestamp],
        [],
        ['Metric', 'Value'],
        ['Avg Monthly Income (₹)', livelihoodKPI.value.avg_income || 0],
        ['SHG Members (%)', livelihoodKPI.value.shg_member_pct || 0],
        ['With Credit Access (%)', livelihoodKPI.value.credit_access_pct || 0],
        ['Migrant HH (%)', livelihoodKPI.value.migrant_pct || 0],
      ])
      if (occupationIncomeData.value.length) {
        addSheet('Occupation Income', [
          ['Occupation', 'Avg Income'],
          ...occupationIncomeData.value.map(r => [r.occupation, r.avg_income])
        ])
      }
      if (loanSourceData.value.length) {
        addSheet('Loan Sources', [
          ['Source', 'Avg Loan (₹)'],
          ...loanSourceData.value.map(r => [r.source, r.avg_loan])
        ])
      }

    } else if (tab === 'community') {
      addSheet('KPIs', [
        ['MSSRF MIS-HITS — Community Institutions Report'],
        ['Geography Filter:', geo],
        ['Generated:', timestamp],
        [],
        ['Metric', 'Value'],
        ['SHG Membership (%)', communityKPI.value.shg_member_pct || 0],
        ['FPO Membership (%)', communityKPI.value.fpo_member_pct || 0],
        ['GP Representation (%)', communityKPI.value.gp_representation_pct || 0],
        ['Active Members (%)', communityKPI.value.active_member_pct || 0],
      ])
      if (gpRepresentation.value.length) {
        addSheet('GP Representation', [
          ['Block', 'With Rep', 'Without Rep'],
          ...gpRepresentation.value.map(r => [r.block, r.with_rep, r.without_rep])
        ])
      }

    } else if (tab === 'wash') {
      addSheet('KPIs', [
        ['MSSRF MIS-HITS — WASH & Housing Report'],
        ['Geography Filter:', geo],
        ['Generated:', timestamp],
        [],
        ['Metric', 'Value (%)'],
        ['ODF Coverage', washKPI.value.odf_pct || 0],
        ['Piped Water Access', washKPI.value.piped_water_pct || 0],
        ['LPG Users', washKPI.value.lpg_pct || 0],
        ['With Electricity', washKPI.value.electricity_pct || 0],
        ['Pucca Houses', washKPI.value.pucca_house_pct || 0],
      ])
      if (houseTypeData.value.length) {
        addSheet('House Type by Block', [
          ['Block', 'Kutcha (%)', 'Semi-Pucca (%)', 'Pucca (%)'],
          ...houseTypeData.value.map(r => [r.block, r.kutcha_pct, r.semi_pucca_pct, r.pucca_pct])
        ])
      }
      if (odfProgress.value.length) {
        addSheet('ODF Progress', [
          ['Block', 'Total HH', 'With Toilet', 'Toilet Coverage (%)', 'Open Defecation (%)'],
          ...odfProgress.value.map(r => [r.block, r.total_hh, r.with_toilet, r.toilet_pct, r.odf_pct])
        ])
      }
      addSheet('WASH Radar Scores', [
        ['Dimension', 'Score (%)'],
        ['Safe Water', washRadarData.value.water || 0],
        ['Toilet Access', washRadarData.value.toilet || 0],
        ['Handwashing', washRadarData.value.handwashing || 0],
        ['Waste Disposal', washRadarData.value.waste || 0],
        ['Clean Fuel', washRadarData.value.fuel || 0],
        ['Electricity', washRadarData.value.electricity || 0],
      ])

    } else if (tab === 'health') {
      addSheet('KPIs', [
        ['MSSRF MIS-HITS — Health & Education Report'],
        ['Geography Filter:', geo],
        ['Generated:', timestamp],
        [],
        ['Metric', 'Value (%)'],
        ['Chronic Illness', healthKPI.value.chronic_illness_pct || 0],
        ['Insurance Coverage', healthKPI.value.insurance_coverage_pct || 0],
        ['Immunisation Rate', healthKPI.value.immunisation_rate || 0],
        ['Anganwadi Access', healthKPI.value.anganwadi_access_pct || 0],
        ['School Enrolment', healthKPI.value.school_enrolment_pct || 0],
      ])
      if (riskMatrix.value.length) {
        const r = riskMatrix.value[0] || {}
        addSheet('Health Risk Matrix', [
          ['Risk Category', 'Households'],
          ['High Risk (Uninsured + Chronic)', r.high_risk || 0],
          ['Medium Risk (Uninsured, No Chronic)', r.medium_risk || 0],
          ['Medium Risk (Insured + Chronic)', r.medium_risk_2 || 0],
          ['Low Risk (Insured, No Chronic)', r.low_risk || 0],
        ])
      }
      if (immunisationData.value.length) {
        addSheet('Immunisation by Block', [
          ['Block', 'Fully Immunised', 'Partially Immunised', 'Not Immunised'],
          ...immunisationData.value.map(r => [r.block, r.full, r.partial, r.none])
        ])
      }
      if (dropoutFunnel.value.length) {
        addSheet('Education Funnel', [
          ['Stage', 'Count', '%'],
          ...dropoutFunnel.value.map(r => [r.stage, r.count, r.pct])
        ])
      }
      if (targetingRegister.value.length) {
        addSheet('Targeting Register', [
          ['HH ID', 'Village', 'Issue', 'Priority'],
          ...targetingRegister.value.map(r => [r.household_id, r.village, r.issue, r.priority])
        ])
      }

    } else if (tab === 'agriculture') {
      addSheet('KPIs', [
        ['MSSRF MIS-HITS — Agriculture & Fisheries Report'],
        ['Geography Filter:', geo],
        ['Generated:', timestamp],
        [],
        ['Metric', 'Value'],
        ['With Agriculture Land (%)', agricultureKPI.value.with_land_pct || 0],
        ['Avg Land Size (acres)', agricultureKPI.value.avg_land_size || 0],
        ['With Livestock (%)', agricultureKPI.value.with_livestock_pct || 0],
        ['In Fisheries (%)', agricultureKPI.value.in_fisheries_pct || 0],
        ['Total Boats', agricultureKPI.value.total_boats || 0],
      ])
      if (landDistribution.value.length) {
        addSheet('Land Distribution', [
          ['Size Range', 'Total HH'],
          ...landDistribution.value.map(r => [r.size_range, r.total])
        ])
      }
      if (irrigationTypes.value.length) {
        addSheet('Irrigation Types', [
          ['Type', 'HH Count'],
          ...irrigationTypes.value.map(r => [r.type, r.hh_count])
        ])
      }
      if (livestockTypes.value.length) {
        addSheet('Livestock Types', [
          ['Type', 'HH Count'],
          ...livestockTypes.value.map(r => [r.type, r.hh_count])
        ])
      }
      if (fisheriesProfile.value.length) {
        addSheet('Fisheries Profile', [
          ['Village', 'Boat Ownership', 'GPS in Boat (%)', 'Lean Season', 'Storage Access (%)', 'Fisher Count'],
          ...fisheriesProfile.value.map(r => [r.village, r.boat_ownership, r.gps_pct, r.lean_months, r.storage_pct, r.fisher_count])
        ])
      }

    } else if (tab === 'programme') {
      addSheet('KPIs', [
        ['MSSRF MIS-HITS — Programme Tracking Report'],
        ['Geography Filter:', geo],
        ['Generated:', timestamp],
        [],
        ['Metric', 'Value'],
        ['Total HH', programmeKPI.value.total_hh || 0],
        ['MSSRF Coverage (%)', programmeKPI.value.mssrf_coverage_pct || 0],
        ['NGO Overlap (%)', programmeKPI.value.ngo_overlap_pct || 0],
        ['Govt Scheme Access (%)', programmeKPI.value.govt_scheme_pct || 0],
      ])
      if (schemeCoverage.value.length) {
        addSheet('Scheme Coverage', [
          ['Block', 'MSSRF', 'Govt', 'NGO', 'Total'],
          ...schemeCoverage.value.map(r => [r.block, r.mssrf, r.govt, r.ngo, r.total])
        ])
      }
      if (surveyProgress.value.length) {
        addSheet('Survey Progress', [
          ['Month', 'Surveys Done'],
          ...surveyProgress.value.map(r => [r.month, r.count])
        ])
      }

    } else if (tab === 'org') {
      addSheet('Org-wide Summary', [
        ['MSSRF MIS-HITS — Organisation-wide Report'],
        ['Geography Filter:', geo],
        ['Generated:', timestamp],
        [],
        ['Metric', 'Value'],
        ['Registered HH', orgR.value.registered_hh || 0],
        ['Unique Benefitted', orgR.value.unique_benefitted || 0],
        ['Multi-intervention HH', orgR.value.multi_intervention || 0],
      ])
      if (villageCov.value.length) {
        addSheet('Village Coverage', [
          ['Village', 'District', 'Total HH', 'Benefitted HH', 'Coverage %', 'Geotagged HH', 'GPS Coverage'],
          ...villageCov.value.map(r => [r.village_name, r.district_name, r.total_hh, r.benefitted_hh, r.coverage_pct, r.geotagged_hh, r.gps_coverage_pct])
        ])
      }

    } else if (tab === 'project') {
      addSheet('Project Summary', [
        ['MSSRF MIS-HITS — Project Report'],
        ['Geography Filter:', geo],
        ['Generated:', timestamp],
        [],
        ['Metric', 'Value'],
        ['Total HH', pStats.value?.total_hh || 0],
        ['Benefitted HH', pStats.value?.benefitted_hh || 0],
        ['Villages Covered', pStats.value?.villages_covered || 0],
        ['Avg Income (₹)', pStats.value?.avg_income || 0],
      ])
    } else {
      addSheet('Summary', [
        ['MSSRF MIS-HITS Report'],
        ['Tab:', tabLabel],
        ['Geography:', geo],
        ['Generated:', timestamp],
        [],
        ['No structured data available for this tab.']
      ])
    }

    const filterStr = [selectedState.value, selectedDistrict.value, selectedBlock.value, selectedVillage.value]
      .filter(Boolean).join('_') || 'All'
    writeFile(wb, `MSSRF-HITS_${tabLabel.replace(/[^a-zA-Z0-9]/g,'_')}_${filterStr}_${new Date().toISOString().slice(0,10)}.xlsx`)
  })
}

async function fetchGeoOptions() {
  try {
    const { data } = await api.get('/reports/geo-options', {
      params: {
        state: selectedState.value || undefined,
        district: selectedDistrict.value || undefined,
        block: selectedBlock.value || undefined
      }
    })
    stateOptions.value = data.states || []
    districtOptions.value = data.districts || []
    blockOptions.value = data.blocks || []
    villageOptions.value = data.villages || []
  } catch (error) {
    console.error('Geo options load error:', error)
  }
}

function onStateChange() {
  selectedDistrict.value = ''
  selectedBlock.value = ''
  selectedVillage.value = ''
  fetchGeoOptions()
}

function onDistrictChange() {
  selectedBlock.value = ''
  selectedVillage.value = ''
  fetchGeoOptions()
}

function onBlockChange() {
  selectedVillage.value = ''
  fetchGeoOptions()
}

async function loadTabData(tabKey) {
  switch(tabKey) {
    case 'demographic':
      await loadDemographicData()
      break
    case 'livelihood':
      await loadLivelihoodData()
      break
    case 'community':
      await loadCommunityData()
      break
    case 'wash':
      await loadWASHData()
      break
    case 'health':
      await loadHealthData()
      break
    case 'agriculture':
      await loadAgricultureData()
      break
    case 'programme':
      await loadProgrammeData()
      break
    default:
      break
  }
}

async function applyGeoFilters() {
  loading.value = true
  try {
    loadedTabs.value = new Set()
    await fetchGeoOptions()
    await loadTabData(activeTab.value)
    loadedTabs.value.add(activeTab.value)
  } catch (error) {
    console.error('Apply geo filters error:', error)
  } finally {
    loading.value = false
  }
}

async function resetGeoFilters() {
  selectedState.value = ''
  selectedDistrict.value = ''
  selectedBlock.value = ''
  selectedVillage.value = ''
  await applyGeoFilters()
}

onMounted(async () => {
  try {
    // Load public geo options and main tab data first (no auth required)
    await fetchGeoOptions()
    await loadDemographicData()
    loadedTabs.value.add('demographic')

    // Load auth-protected project/org data separately so failures don't block the page
    Promise.allSettled([
      api.get('/projects'),
      api.get('/dashboard/org-report'),
      api.get('/dashboard/village-coverage'),
      api.get('/dashboard/gis-villages'),
    ]).then(([ps, or, vc, gv]) => {
      if (ps.status === 'fulfilled') {
        projects.value = ps.value.data
        if (ps.value.data.length) { selProject.value = ps.value.data[0].project_id; loadProjectStats() }
      }
      if (or.status === 'fulfilled') orgR.value = or.value.data
      if (vc.status === 'fulfilled') villageCov.value = vc.value.data
      if (gv.status === 'fulfilled') gisV.value = gv.value.data
    })
  } catch (error) {
    console.error('Error loading reports:', error)
  } finally {
    loading.value = false
  }
})

watch(activeTab, async (newTab) => {
  if (loadedTabs.value.has(newTab)) {
    return
  }

  loading.value = true
  try {
    await loadTabData(newTab)
    loadedTabs.value.add(newTab)
  } catch (error) {
    console.error(`Error loading ${newTab} data:`, error)
  } finally {
    loading.value = false
  }
})

// Data loading functions for new reports
async function loadDemographicData() {
  try {
    const [kpi, pyramid, social, marital, heatmap, eduCross, occCross] = await Promise.all([
      reportGet('/reports/demographic-kpi'),
      reportGet('/reports/population-pyramid'),
      reportGet('/reports/social-category'),
      reportGet('/reports/marital-status'),
      reportGet('/reports/vulnerability-heatmap'),
      reportGet('/reports/education-crosstab'),
      reportGet('/reports/occupation-crosstab')
    ])
    demographicKPI.value = kpi.data || {}
    populationPyramid.value = pyramid.data || { ageGroups: [], males: [], females: [] }
    socialCategory.value = social.data || []
    maritalStatus.value = marital.data || []
    vulnerabilityHeatmap.value = heatmap.data || []
    socialEducationCrossTab.value = eduCross.data || []
    genderOccupationCrossTab.value = occCross.data || []
    console.log('Demographic data loaded:', { kpi: kpi.data, pyramid: pyramid.data })
  } catch (e) { 
    console.error('Demographic data error:', e) 
    console.error('Error details:', e.response?.data, e.response?.status)
  }
}

async function loadLivelihoodData() {
  try {
    const [kpi, income, occupation, loan, util] = await Promise.all([
      reportGet('/reports/livelihood-kpi'),
      reportGet('/reports/income-bracket'),
      reportGet('/reports/occupation-income'),
      reportGet('/reports/loan-source'),
      reportGet('/reports/loan-utilisation')
    ])
    livelihoodKPI.value = kpi.data || {}
    incomeBracketData.value = income.data || {}
    occupationIncomeData.value = occupation.data || []
    loanSourceData.value = loan.data || []
    loanUtilisationData.value = util.data || []
    console.log('Livelihood data loaded:', kpi.data)
  } catch (e) { 
    console.error('Livelihood data error:', e)
    console.error('Error response:', e.response?.data, e.response?.status)
  }
}

async function loadCommunityData() {
  try {
    const [kpi, funnel, fpo, gp] = await Promise.all([
      reportGet('/reports/community-kpi'),
      reportGet('/reports/membership-funnel'),
      reportGet('/reports/fpo-type'),
      reportGet('/reports/gp-representation')
    ])
    communityKPI.value = kpi.data || {}
    const rawFunnel = Array.isArray(funnel.data) ? funnel.data : []
    const baseCount = Number(rawFunnel[0]?.value || 0)
    membershipFunnel.value = rawFunnel.map((step) => {
      const count = Number(step.value || 0)
      return {
        stage: step.stage,
        count,
        pct: baseCount > 0 ? Math.round((count * 100) / baseCount) : 0
      }
    })
    fpoTypeData.value = fpo.data || []
    gpRepresentation.value = Array.isArray(gp.data) ? gp.data : []
    console.log('Community data loaded:', kpi.data)
  } catch (e) { 
    console.error('Community data error:', e)
    console.error('Error response:', e.response?.data, e.response?.status)
  }
}

async function loadWASHData() {
  try {
    const [kpi, house, odf, radar, water] = await Promise.all([
      reportGet('/reports/wash-kpi'),
      reportGet('/reports/house-type'),
      reportGet('/reports/odf-progress'),
      reportGet('/reports/wash-radar'),
      reportGet('/reports/water-source-map')
    ])
    washKPI.value = kpi.data
    houseTypeData.value = house.data
    odfProgress.value = odf.data
    washRadarData.value = radar.data
    waterSourceMap.value = water.data
  } catch (e) { console.error('WASH data error:', e) }
}

async function loadHealthData() {
  try {
    const [kpi, risk, dropout, immun, target] = await Promise.all([
      reportGet('/reports/health-kpi'),
      reportGet('/reports/risk-matrix'),
      reportGet('/reports/dropout-funnel'),
      reportGet('/reports/immunisation'),
      reportGet('/reports/targeting-register')
    ])
    healthKPI.value = kpi.data
    riskMatrix.value = risk.data
    dropoutFunnel.value = dropout.data
    immunisationData.value = immun.data
    targetingRegister.value = target.data
  } catch (e) { console.error('Health data error:', e) }
}

async function loadAgricultureData() {
  try {
    const [kpi, land, irrigation, livestock, fish, asset] = await Promise.all([
      reportGet('/reports/agriculture-kpi'),
      reportGet('/reports/land-distribution'),
      reportGet('/reports/irrigation-types'),
      reportGet('/reports/livestock-types'),
      reportGet('/reports/fisheries-profile'),
      reportGet('/reports/asset-heatmap')
    ])
    agricultureKPI.value = kpi.data
    landDistribution.value = land.data
    irrigationTypes.value = irrigation.data
    livestockTypes.value = livestock.data
    fisheriesProfile.value = fish.data
    assetHeatmap.value = asset.data
  } catch (e) { console.error('Agriculture data error:', e) }
}

async function loadProgrammeData() {
  try {
    const [kpi, scheme, progress, gps, ngo] = await Promise.all([
      reportGet('/reports/programme-kpi'),
      reportGet('/reports/scheme-coverage'),
      reportGet('/reports/survey-progress'),
      reportGet('/reports/gps-map'),
      reportGet('/reports/ngo-overlap')
    ])
    programmeKPI.value = kpi.data
    schemeCoverage.value = scheme.data
    surveyProgress.value = progress.data
    gpsMapData.value = gps.data
    ngoOverlap.value = ngo.data
  } catch (e) { console.error('Programme data error:', e) }
}
</script>

<style scoped>
.bar-chart-wrap { overflow-x:auto; }
.bar-chart { display:flex;align-items:flex-end;gap:14px;height:140px;padding:0 8px;min-width:200px; }
.bar-col   { flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;min-width:60px; }
.bar       { width:100%;border-radius:4px 4px 0 0; }
.bar-label { font-size:11px;color:var(--grey-500);text-align:center; }
.bar-val   { font-size:11px;color:var(--grey-700);font-weight:700; }

/* Funnel charts */
.funnel-container { padding:20px;display:flex;flex-direction:column;align-items:center;gap:8px; }
.funnel-step { 
  padding:14px 20px;border-radius:6px;color:white;display:flex;justify-content:space-between;
  align-items:center;box-shadow:0 2px 4px rgba(0,0,0,0.1);transition:all .2s;
}
.funnel-step:hover { transform:translateX(4px);box-shadow:0 4px 8px rgba(0,0,0,0.15); }
.funnel-step strong { font-size:14px; }
.funnel-step span { font-size:13px;opacity:0.95; }

/* Risk matrix */
.risk-matrix { 
  display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:20px;height:280px;
}
.risk-quad { 
  border-radius:8px;padding:20px;display:flex;flex-direction:column;justify-content:center;
  align-items:center;text-align:center;border:2px solid;
}
.risk-high { background:#ffebee;border-color:#d32f2f;color:#c62828; }
.risk-medium { background:#fff3e0;border-color:#f59e0b;color:#ef6c00; }
.risk-low { background:#e8f5e9;border-color:#2e7d32;color:#1b5e20; }
.risk-label { font-size:12px;font-weight:600;text-transform:uppercase;margin-bottom:8px;opacity:0.8; }
.risk-count { font-size:28px;font-weight:700; }

/* Profile cards */
.profile-card { 
  background:var(--grey-50);border-radius:8px;padding:16px;border-left:4px solid var(--green);
}
.profile-card h4 { font-size:15px;font-weight:600;margin:0 0 12px 0;color:var(--green-dark); }
.profile-row { display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--grey-200); }
.profile-row span { font-size:13px;color:var(--grey-500); }
.profile-row strong { font-size:13px;color:var(--grey-900); }
.profile-row:last-child { border-bottom:none; }

/* Coverage matrix */
.coverage-matrix { font-size:12px; }
.coverage-matrix td { text-align:center;font-weight:600;padding:10px 12px; }
.coverage-matrix tbody tr:hover { background:transparent; }

/* Crosstab table */
.crosstab-table { font-size:13px; }
.crosstab-table td { text-align:center; }
.crosstab-table td:first-child { text-align:left;font-weight:600; }

/* Dense table */
.dense-table { font-size:12px; }
.dense-table td, .dense-table th { padding:8px 12px; }

/* Additional stat tile colors */
.stat-tile.teal { border-left-color:#00897b; }
.stat-tile.teal .stat-label { color:#00897b; }

/* Tab scrolling for mobile */
@media (max-width: 768px) {
  .tabs-container { overflow-x:auto;white-space:nowrap; }
  .stat-grid-5 { grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); }
  .funnel-step { font-size:12px;padding:10px 14px; }
  .risk-matrix { grid-template-columns:1fr;height:auto; }
}

/* ── Geo Filter Bar ─────────────────────────────── */
.geo-filter-bar {
  background: #fff;
  border: 1px solid var(--grey-200, #e5e7eb);
  border-radius: 10px;
  margin-bottom: 16px;
  overflow: hidden;
}
.geo-filter-inner {
  display: flex;
  align-items: center;
  gap: 0;
  padding: 0 16px;
  flex-wrap: wrap;
  min-height: 52px;
}
.geo-filter-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
  color: var(--grey-500, #6b7280);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  white-space: nowrap;
  padding: 14px 0;
}
.geo-filter-divider {
  width: 1px;
  height: 28px;
  background: var(--grey-200, #e5e7eb);
  margin: 0 16px;
  flex-shrink: 0;
}
.geo-filter-fields {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  flex: 1;
  padding: 10px 0;
}
.geo-filter-group {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.geo-filter-lbl {
  font-size: 10px;
  font-weight: 600;
  color: var(--grey-400, #9ca3af);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.geo-filter-select {
  font-size: 13px;
  padding: 6px 28px 6px 10px;
  border: 1px solid var(--grey-200, #e5e7eb);
  border-radius: 6px;
  background: var(--grey-50, #f9fafb);
  color: var(--grey-800, #1f2937);
  height: 34px;
  min-width: 130px;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2.5' stroke-linecap='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.geo-filter-select:focus {
  outline: none;
  border-color: var(--primary, #2e7d32);
  box-shadow: 0 0 0 3px rgba(46,125,50,0.1);
}
.geo-filter-select:hover {
  border-color: var(--grey-400, #9ca3af);
}
.geo-filter-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: 8px;
  padding: 10px 0;
}
.geo-btn-apply {
  font-size: 13px;
  font-weight: 600;
  padding: 0 16px;
  height: 34px;
  background: var(--primary, #2e7d32);
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s, transform 0.1s;
  white-space: nowrap;
}
.geo-btn-apply:hover { background: #1b5e20; }
.geo-btn-apply:active { transform: scale(0.97); }
.geo-btn-reset {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 500;
  padding: 0 12px;
  height: 34px;
  background: transparent;
  color: var(--grey-500, #6b7280);
  border: 1px solid var(--grey-200, #e5e7eb);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}
.geo-btn-reset:hover {
  background: var(--grey-50, #f9fafb);
  border-color: var(--grey-300, #d1d5db);
  color: var(--grey-700, #374151);
}
/* Active chips row */
.geo-filter-chips {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  padding: 8px 16px;
  border-top: 1px solid var(--grey-100, #f3f4f6);
  background: var(--grey-50, #f9fafb);
}
.geo-chip-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--grey-400, #9ca3af);
}
.geo-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 500;
  background: #e8f5e9;
  color: #1b5e20;
  padding: 3px 10px;
  border-radius: 20px;
  border: 1px solid #c8e6c9;
}
</style>
