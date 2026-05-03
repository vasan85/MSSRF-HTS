<template>
  <div class="dash">

    <!-- ── Header ─────────────────────────────────────────────── -->
    <div class="dash-header">
      <div>
        <div class="page-title">Executive Dashboard</div>
        <div class="page-sub">MSSRF · Household Impact Tracking System · Real-time overview</div>
      </div>
      <div style="display:flex;align-items:center;gap:10px">
        <span class="last-updated" v-if="lastUpdated">Last updated {{ lastUpdated }}</span>
        <button class="btn btn-outline btn-sm" @click="load" :disabled="loading">
          <span v-if="loading" class="spinner-xs"></span>
          <span v-else>↺</span> Refresh
        </button>
      </div>
    </div>

    <!-- ── Full-page spinner ───────────────────────────────────── -->
    <div class="loading-center" v-if="loading && !kpi.registered_hh">
      <div class="spinner spinner-lg"></div>
    </div>

    <template v-if="kpi.registered_hh !== undefined">

      <!-- ══════════════════════════════════════════════════════════
           ROW 1 · TOP KPI STRIP
      ══════════════════════════════════════════════════════════ -->
      <div class="kpi-strip">
        <div class="kpi-card kpi-green">
          <div class="kpi-icon">📋</div>
          <div class="kpi-body">
            <div class="kpi-value">{{ kpi.total_projects }}</div>
            <div class="kpi-label">Active Projects</div>
          </div>
        </div>
        <div class="kpi-card kpi-blue">
          <div class="kpi-icon">🏠</div>
          <div class="kpi-body">
            <div class="kpi-value">{{ fmt(kpi.registered_hh) }}</div>
            <div class="kpi-label">Registered Households</div>
          </div>
        </div>
        <div class="kpi-card kpi-teal">
          <div class="kpi-icon">✅</div>
          <div class="kpi-body">
            <div class="kpi-value">{{ fmt(kpi.unique_benefitted) }}</div>
            <div class="kpi-label">Unique Benefitted HH</div>
          </div>
        </div>
        <div class="kpi-card kpi-amber">
          <div class="kpi-icon">📊</div>
          <div class="kpi-body">
            <div class="kpi-value">{{ kpi.coverage_pct }}%</div>
            <div class="kpi-label">Programme Coverage</div>
          </div>
        </div>
        <div class="kpi-card kpi-purple">
          <div class="kpi-icon">🔀</div>
          <div class="kpi-body">
            <div class="kpi-value">{{ fmt(kpi.multi_intervention) }}</div>
            <div class="kpi-label">Multi-intervention HH</div>
          </div>
        </div>
        <div class="kpi-card kpi-grey">
          <div class="kpi-icon">🏘</div>
          <div class="kpi-body">
            <div class="kpi-value">{{ kpi.total_villages }}</div>
            <div class="kpi-label">Active Villages</div>
          </div>
        </div>
      </div>

      <!-- ══════════════════════════════════════════════════════════
           ROW 2 · HOUSEHOLD PROFILE
      ══════════════════════════════════════════════════════════ -->
      <div class="section-card">
        <div class="section-head">
          <span class="section-icon">👤</span>
          <span>Household Demographics</span>
          <span class="section-badge">{{ fmt(formKpis.wash?.total) }} HH surveyed</span>
        </div>
        <div class="demo-grid">

          <!-- Social category stacked bar -->
          <div class="demo-col-wide">
            <div class="metric-label" style="margin-bottom:10px">Social Category Distribution</div>
            <div class="stacked-bar-wrap">
              <div class="stacked-bar">
                <div v-for="cat in formKpis.social_category" :key="cat.social_category"
                     class="stacked-seg"
                     :style="{ width: pct(cat.count, formKpis.wash?.total) + '%', background: catColor(cat.social_category) }"
                     :title="`${cat.social_category}: ${cat.count} (${pct(cat.count, formKpis.wash?.total)}%)`">
                </div>
              </div>
              <div class="stacked-legend">
                <div class="stacked-legend-item" v-for="cat in formKpis.social_category" :key="cat.social_category">
                  <span class="legend-dot" :style="{ background: catColor(cat.social_category) }"></span>
                  <span class="legend-text">{{ cat.social_category }}</span>
                  <span class="legend-count">{{ cat.count }}</span>
                  <span class="legend-pct">{{ pct(cat.count, formKpis.wash?.total) }}%</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Quick profile metrics -->
          <div class="demo-col-narrow">
            <div class="profile-metric">
              <div class="pm-icon female">♀</div>
              <div>
                <div class="pm-value">{{ formKpis.livelihood?.female_hh_pct || 0 }}%</div>
                <div class="pm-label">Female-headed HH</div>
                <div class="pm-sub">{{ formKpis.livelihood?.female_hh_count }} households</div>
              </div>
            </div>
            <div class="profile-metric">
              <div class="pm-icon abled">♿</div>
              <div>
                <div class="pm-value">{{ formKpis.livelihood?.diff_abled_pct || 0 }}%</div>
                <div class="pm-label">Differently Abled</div>
                <div class="pm-sub">head of household</div>
              </div>
            </div>
            <div class="profile-metric">
              <div class="pm-icon migrant">✈</div>
              <div>
                <div class="pm-value">{{ formKpis.livelihood?.migrant_pct || 0 }}%</div>
                <div class="pm-label">Migrant Households</div>
                <div class="pm-sub">seasonal or permanent</div>
              </div>
            </div>
            <div class="profile-metric">
              <div class="pm-icon members">👥</div>
              <div>
                <div class="pm-value">{{ formKpis.members?.total_members || 0 }}</div>
                <div class="pm-label">Total Members</div>
                <div class="pm-sub">avg age {{ formKpis.members?.avg_age || '—' }} yrs</div>
              </div>
            </div>
          </div>

        </div>
      </div>

      <!-- ══════════════════════════════════════════════════════════
           ROW 3 · WASH & HEALTH (side by side)
      ══════════════════════════════════════════════════════════ -->
      <div class="twin-row">

        <!-- WASH & Housing -->
        <div class="section-card">
          <div class="section-head">
            <span class="section-icon">🚰</span>
            <span>WASH & Housing</span>
          </div>
          <div class="progress-list">
            <div class="progress-item">
              <div class="progress-meta">
                <span class="progress-label">ODF Access</span>
                <span class="progress-val" :class="valClass(formKpis.wash?.odf_pct)">{{ formKpis.wash?.odf_pct || 0 }}%</span>
              </div>
              <div class="progress-track"><div class="progress-fill" :style="{ width: (formKpis.wash?.odf_pct||0)+'%', background: fillColor(formKpis.wash?.odf_pct) }"></div></div>
            </div>
            <div class="progress-item">
              <div class="progress-meta">
                <span class="progress-label">Piped Water Access</span>
                <span class="progress-val" :class="valClass(formKpis.wash?.piped_pct)">{{ formKpis.wash?.piped_pct || 0 }}%</span>
              </div>
              <div class="progress-track"><div class="progress-fill" :style="{ width: (formKpis.wash?.piped_pct||0)+'%', background: fillColor(formKpis.wash?.piped_pct) }"></div></div>
            </div>
            <div class="progress-item">
              <div class="progress-meta">
                <span class="progress-label">Electricity Access</span>
                <span class="progress-val" :class="valClass(formKpis.wash?.electricity_pct)">{{ formKpis.wash?.electricity_pct || 0 }}%</span>
              </div>
              <div class="progress-track"><div class="progress-fill" :style="{ width: (formKpis.wash?.electricity_pct||0)+'%', background: fillColor(formKpis.wash?.electricity_pct) }"></div></div>
            </div>
            <div class="progress-item">
              <div class="progress-meta">
                <span class="progress-label">LPG / Clean Fuel</span>
                <span class="progress-val" :class="valClass(formKpis.wash?.lpg_pct)">{{ formKpis.wash?.lpg_pct || 0 }}%</span>
              </div>
              <div class="progress-track"><div class="progress-fill" :style="{ width: (formKpis.wash?.lpg_pct||0)+'%', background: fillColor(formKpis.wash?.lpg_pct) }"></div></div>
            </div>
            <div class="progress-item">
              <div class="progress-meta">
                <span class="progress-label">Pucca Housing</span>
                <span class="progress-val" :class="valClass(formKpis.wash?.pucca_pct)">{{ formKpis.wash?.pucca_pct || 0 }}%</span>
              </div>
              <div class="progress-track"><div class="progress-fill" :style="{ width: (formKpis.wash?.pucca_pct||0)+'%', background: fillColor(formKpis.wash?.pucca_pct) }"></div></div>
            </div>
            <div class="progress-item">
              <div class="progress-meta">
                <span class="progress-label">GPS Tagged HH</span>
                <span class="progress-val" :class="valClass(formKpis.wash?.gps_pct)">{{ formKpis.wash?.gps_pct || 0 }}%</span>
              </div>
              <div class="progress-track"><div class="progress-fill" :style="{ width: (formKpis.wash?.gps_pct||0)+'%', background: fillColor(formKpis.wash?.gps_pct) }"></div></div>
            </div>
            <!-- House type mini bar -->
            <div class="house-type-row" v-if="formKpis.wash">
              <span class="metric-label">House Type</span>
              <div class="house-type-bars">
                <div class="house-type-seg" :style="{ flex: formKpis.wash.pucca_count }" title="Pucca">
                  <span>Pucca {{ formKpis.wash.pucca_count }}</span>
                </div>
                <div class="house-type-seg semi" :style="{ flex: formKpis.wash.semipucca_count }" title="Semi-pucca">
                  <span>S-Pucca {{ formKpis.wash.semipucca_count }}</span>
                </div>
                <div class="house-type-seg kutcha" :style="{ flex: formKpis.wash.kutcha_count }" title="Kutcha">
                  <span>Kutcha {{ formKpis.wash.kutcha_count }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Health & Education -->
        <div class="section-card">
          <div class="section-head">
            <span class="section-icon">🏥</span>
            <span>Health & Education</span>
          </div>
          <div class="progress-list">
            <div class="progress-item">
              <div class="progress-meta">
                <span class="progress-label">Chronic Illness in HH</span>
                <span class="progress-val warn">{{ formKpis.health?.chronic_pct || 0 }}%</span>
              </div>
              <div class="progress-track"><div class="progress-fill" :style="{ width: (formKpis.health?.chronic_pct||0)+'%', background:'#dc2626' }"></div></div>
            </div>
            <div class="progress-item">
              <div class="progress-meta">
                <span class="progress-label">Health Insurance Coverage</span>
                <span class="progress-val" :class="valClass(formKpis.health?.insurance_pct)">{{ formKpis.health?.insurance_pct || 0 }}%</span>
              </div>
              <div class="progress-track"><div class="progress-fill" :style="{ width: (formKpis.health?.insurance_pct||0)+'%', background: fillColor(formKpis.health?.insurance_pct) }"></div></div>
            </div>
            <div class="progress-item">
              <div class="progress-meta">
                <span class="progress-label">Anganwadi Access</span>
                <span class="progress-val" :class="valClass(formKpis.health?.anganwadi_pct)">{{ formKpis.health?.anganwadi_pct || 0 }}%</span>
              </div>
              <div class="progress-track"><div class="progress-fill" :style="{ width: (formKpis.health?.anganwadi_pct||0)+'%', background: fillColor(formKpis.health?.anganwadi_pct) }"></div></div>
            </div>
            <div class="progress-item">
              <div class="progress-meta">
                <span class="progress-label">Pregnant / Lactating Women</span>
                <span class="progress-val">{{ formKpis.health?.pregnant_pct || 0 }}%</span>
              </div>
              <div class="progress-track"><div class="progress-fill" :style="{ width: (formKpis.health?.pregnant_pct||0)+'%', background:'#7c3aed' }"></div></div>
            </div>
            <div class="progress-item">
              <div class="progress-meta">
                <span class="progress-label">Children Attending School</span>
                <span class="progress-val" :class="valClass(formKpis.education?.school_pct)">{{ formKpis.education?.school_pct || 0 }}%</span>
              </div>
              <div class="progress-track"><div class="progress-fill" :style="{ width: (formKpis.education?.school_pct||0)+'%', background: fillColor(formKpis.education?.school_pct) }"></div></div>
            </div>
            <div class="progress-item">
              <div class="progress-meta">
                <span class="progress-label">Dropout Cases in HH</span>
                <span class="progress-val warn">{{ formKpis.education?.dropout_pct || 0 }}%</span>
              </div>
              <div class="progress-track"><div class="progress-fill" :style="{ width: (formKpis.education?.dropout_pct||0)+'%', background:'#f59e0b' }"></div></div>
            </div>
            <!-- Children under 5 badge -->
            <div class="health-badge-row" v-if="formKpis.health">
              <div class="health-badge"><span class="badge-num">{{ formKpis.health.children_u5 }}</span><span class="badge-lbl">Children Under 5</span></div>
              <div class="health-badge"><span class="badge-num">{{ formKpis.members?.diff_abled_count || 0 }}</span><span class="badge-lbl">Diff. Abled Members</span></div>
            </div>
          </div>
        </div>

      </div>

      <!-- ══════════════════════════════════════════════════════════
           ROW 4 · LIVELIHOOD
      ══════════════════════════════════════════════════════════ -->
      <div class="section-card">
        <div class="section-head">
          <span class="section-icon">🌾</span>
          <span>Livelihood & Economic Inclusion</span>
        </div>
        <div class="livelihood-grid">
          <div class="live-card live-green">
            <div class="live-ring">
              <svg viewBox="0 0 36 36" class="ring-svg">
                <circle cx="18" cy="18" r="15.915" fill="none" stroke="#dcfce7" stroke-width="4"/>
                <circle cx="18" cy="18" r="15.915" fill="none" stroke="#16a34a" stroke-width="4"
                        stroke-dasharray="100 100"
                        :stroke-dasharray="`${formKpis.livelihood?.shg_pct||0} 100`"
                        stroke-dashoffset="25" stroke-linecap="round"/>
                <text x="18" y="21" text-anchor="middle" font-size="7" font-weight="bold" fill="#16a34a">{{ formKpis.livelihood?.shg_pct||0 }}%</text>
              </svg>
            </div>
            <div class="live-body">
              <div class="live-label">SHG Membership</div>
              <div class="live-count">{{ formKpis.livelihood?.shg_count || 0 }} households</div>
              <div class="live-sub">{{ formKpis.members?.shg_members || 0 }} individual members</div>
            </div>
          </div>
          <div class="live-card live-blue">
            <div class="live-ring">
              <svg viewBox="0 0 36 36" class="ring-svg">
                <circle cx="18" cy="18" r="15.915" fill="none" stroke="#dbeafe" stroke-width="4"/>
                <circle cx="18" cy="18" r="15.915" fill="none" stroke="#2563eb" stroke-width="4"
                        :stroke-dasharray="`${formKpis.livelihood?.fpo_pct||0} 100`"
                        stroke-dashoffset="25" stroke-linecap="round"/>
                <text x="18" y="21" text-anchor="middle" font-size="7" font-weight="bold" fill="#2563eb">{{ formKpis.livelihood?.fpo_pct||0 }}%</text>
              </svg>
            </div>
            <div class="live-body">
              <div class="live-label">FPO Membership</div>
              <div class="live-count">{{ formKpis.livelihood?.fpo_count || 0 }} households</div>
              <div class="live-sub">{{ formKpis.members?.fpo_members || 0 }} individual members</div>
            </div>
          </div>
          <div class="live-card live-amber">
            <div class="live-ring">
              <svg viewBox="0 0 36 36" class="ring-svg">
                <circle cx="18" cy="18" r="15.915" fill="none" stroke="#fef3c7" stroke-width="4"/>
                <circle cx="18" cy="18" r="15.915" fill="none" stroke="#d97706" stroke-width="4"
                        :stroke-dasharray="`${formKpis.livelihood?.land_pct||0} 100`"
                        stroke-dashoffset="25" stroke-linecap="round"/>
                <text x="18" y="21" text-anchor="middle" font-size="7" font-weight="bold" fill="#d97706">{{ formKpis.livelihood?.land_pct||0 }}%</text>
              </svg>
            </div>
            <div class="live-body">
              <div class="live-label">Land Ownership</div>
              <div class="live-count">Agricultural / Residential</div>
              <div class="live-sub">own land or plot</div>
            </div>
          </div>
          <div class="live-card live-teal">
            <div class="live-ring">
              <svg viewBox="0 0 36 36" class="ring-svg">
                <circle cx="18" cy="18" r="15.915" fill="none" stroke="#ccfbf1" stroke-width="4"/>
                <circle cx="18" cy="18" r="15.915" fill="none" stroke="#0d9488" stroke-width="4"
                        :stroke-dasharray="`${formKpis.livelihood?.livestock_pct||0} 100`"
                        stroke-dashoffset="25" stroke-linecap="round"/>
                <text x="18" y="21" text-anchor="middle" font-size="7" font-weight="bold" fill="#0d9488">{{ formKpis.livelihood?.livestock_pct||0 }}%</text>
              </svg>
            </div>
            <div class="live-body">
              <div class="live-label">Livestock Ownership</div>
              <div class="live-count">Animal husbandry</div>
              <div class="live-sub">{{ formKpis.livelihood?.credit_pct||0 }}% have credit access</div>
            </div>
          </div>
        </div>
      </div>

      <!-- ══════════════════════════════════════════════════════════
           ROW 5 · VILLAGE COVERAGE
      ══════════════════════════════════════════════════════════ -->
      <div class="section-card">
        <div class="section-head">
          <span class="section-icon">📍</span>
          <span>Village-wise Coverage</span>
          <RouterLink to="/gis" class="section-link">Open GIS Map →</RouterLink>
        </div>
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Village</th><th>Block</th><th>District</th>
                <th>Total HH</th><th>Registered</th><th>Benefitted</th>
                <th style="min-width:160px">Coverage</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="v in villageCoverage" :key="v.village_id">
                <td><strong>{{ v.village_name }}</strong></td>
                <td>{{ v.block_name }}</td>
                <td>{{ v.district_name }}</td>
                <td>{{ v.total_households }}</td>
                <td><span class="tag tag-blue">{{ v.registered_hh }}</span></td>
                <td><span class="tag tag-green">{{ v.benefitted_hh }}</span></td>
                <td>
                  <div class="cov-bar-wrap">
                    <div class="cov-bar">
                      <div class="cov-fill" :style="{ width: Math.min(v.coverage_pct||0, 100)+'%', background: fillColor(v.coverage_pct) }"></div>
                    </div>
                    <span class="cov-pct" :class="valClass(v.coverage_pct)">{{ v.coverage_pct || 0 }}%</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ══════════════════════════════════════════════════════════
           ROW 6 · PROJECT SUMMARY
      ══════════════════════════════════════════════════════════ -->
      <div class="section-card">
        <div class="section-head">
          <span class="section-icon">📁</span>
          <span>Project Summary</span>
          <RouterLink to="/projects" class="section-link">View All →</RouterLink>
        </div>
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Code</th><th>Project</th><th>Type</th>
                <th>Total HH</th><th>Active HH</th><th>Vulnerable HH</th>
                <th>Benefit Value</th><th>Duration</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!projectStats.length">
                <td colspan="8"><div class="empty-state"><span>📋</span><p>No projects found</p></div></td>
              </tr>
              <tr v-for="p in projectStats" :key="p.project_id">
                <td><span class="id-badge">{{ p.project_code }}</span></td>
                <td><strong>{{ p.project_name }}</strong></td>
                <td><span class="tag tag-green">{{ p.project_type }}</span></td>
                <td>{{ p.total_hh }}</td>
                <td><span class="tag tag-teal">{{ p.active_hh }}</span></td>
                <td><span class="tag tag-amber">{{ p.vulnerable_hh }}</span></td>
                <td><strong>₹{{ Number(p.total_value).toLocaleString('en-IN') }}</strong></td>
                <td>
                  <span v-if="p.start_date" style="font-size:12px;color:var(--grey-500)">
                    {{ p.start_date }} → {{ p.end_date || 'Ongoing' }}
                  </span>
                  <span v-else class="tag tag-grey">No dates</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </template>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { RouterLink } from 'vue-router'
import api from '../api'

const loading         = ref(true)
const kpi             = ref({})
const formKpis        = ref({ wash: null, health: null, education: null, livelihood: null, social_category: [], income_distribution: [], members: null })
const villageCoverage = ref([])
const projectStats    = ref([])
const lastUpdated     = ref('')

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = v => (v ?? 0).toLocaleString()
const pct = (count, total) => total ? Math.round((count / total) * 100) : 0

const fillColor = p => {
  if (!p) return '#e5e7eb'
  if (p >= 70) return '#16a34a'
  if (p >= 40) return '#f59e0b'
  return '#dc2626'
}
const valClass = p => {
  if (!p) return ''
  if (p >= 70) return 'val-good'
  if (p >= 40) return 'val-warn'
  return 'val-bad'
}

const catColors = { SC:'#dc2626', ST:'#f59e0b', OBC:'#2563eb', MBC:'#7c3aed', General:'#16a34a', EWS:'#0d9488', Others:'#6b7280' }
const catColor  = c => catColors[c] || '#6b7280'

// ── Data load ─────────────────────────────────────────────────────────────────
async function load() {
  loading.value = true
  try {
    const [k, vc, ps, fk] = await Promise.all([
      api.get('/dashboard/executive'),
      api.get('/dashboard/village-coverage'),
      api.get('/dashboard/project-stats'),
      api.get('/dashboard/form-kpis'),
    ])
    kpi.value             = k.data
    villageCoverage.value = vc.data
    projectStats.value    = ps.data
    formKpis.value        = fk.data
    lastUpdated.value     = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.dash { display: flex; flex-direction: column; gap: 18px; }

/* ── Header ─────────────────────────────────────── */
.dash-header { display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:10px; }
.last-updated { font-size:12px; color:var(--grey-400); }
.spinner-xs { display:inline-block; width:12px; height:12px; border:2px solid var(--grey-300); border-top-color:var(--primary); border-radius:50%; animation:spin .6s linear infinite; vertical-align:middle; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ── KPI Strip ──────────────────────────────────── */
.kpi-strip { display:grid; grid-template-columns:repeat(6,1fr); gap:12px; }
@media(max-width:900px) { .kpi-strip { grid-template-columns:repeat(3,1fr); } }
@media(max-width:600px) { .kpi-strip { grid-template-columns:repeat(2,1fr); } }

.kpi-card {
  background:#fff; border-radius:10px; padding:14px 16px;
  display:flex; align-items:center; gap:12px;
  box-shadow:0 1px 4px rgba(0,0,0,.07);
  border-left:4px solid transparent;
  transition:transform .15s, box-shadow .15s;
}
.kpi-card:hover { transform:translateY(-2px); box-shadow:0 4px 12px rgba(0,0,0,.1); }
.kpi-green  { border-left-color:#16a34a; }
.kpi-blue   { border-left-color:#2563eb; }
.kpi-teal   { border-left-color:#0d9488; }
.kpi-amber  { border-left-color:#d97706; }
.kpi-purple { border-left-color:#7c3aed; }
.kpi-grey   { border-left-color:#6b7280; }
.kpi-icon   { font-size:22px; flex:0 0 auto; }
.kpi-value  { font-size:22px; font-weight:800; color:var(--grey-900,#111827); line-height:1; }
.kpi-label  { font-size:11px; color:var(--grey-500); margin-top:3px; font-weight:500; }

/* ── Section Card ───────────────────────────────── */
.section-card {
  background:#fff; border-radius:10px; padding:20px;
  box-shadow:0 1px 4px rgba(0,0,0,.07);
}
.section-head {
  display:flex; align-items:center; gap:8px;
  font-size:14px; font-weight:700; color:var(--grey-800,#1f2937);
  margin-bottom:16px; padding-bottom:12px;
  border-bottom:1px solid var(--grey-100,#f3f4f6);
}
.section-icon { font-size:16px; }
.section-badge {
  margin-left:auto; background:#f0fdf4; color:#166534;
  font-size:11px; padding:2px 8px; border-radius:10px; font-weight:600;
}
.section-link { margin-left:auto; font-size:12px; color:var(--primary); text-decoration:none; font-weight:600; }
.section-link:hover { text-decoration:underline; }

/* ── Demographics ───────────────────────────────── */
.demo-grid { display:grid; grid-template-columns:1fr 220px; gap:20px; }
@media(max-width:768px) { .demo-grid { grid-template-columns:1fr; } }
.demo-col-wide {}
.demo-col-narrow { display:flex; flex-direction:column; gap:10px; border-left:1px solid var(--grey-100,#f3f4f6); padding-left:20px; }
.metric-label { font-size:12px; color:var(--grey-500); font-weight:600; text-transform:uppercase; letter-spacing:.03em; }

.stacked-bar-wrap { display:flex; flex-direction:column; gap:12px; }
.stacked-bar {
  display:flex; height:28px; border-radius:6px; overflow:hidden; gap:1px;
  background:var(--grey-100,#f3f4f6);
}
.stacked-seg { transition:opacity .2s; cursor:pointer; }
.stacked-seg:hover { opacity:.8; }
.stacked-legend { display:flex; flex-wrap:wrap; gap:8px 16px; }
.stacked-legend-item { display:flex; align-items:center; gap:5px; font-size:12px; color:var(--grey-700); }
.legend-dot { width:10px; height:10px; border-radius:3px; flex:0 0 10px; }
.legend-text { font-weight:600; }
.legend-count { background:var(--grey-100,#f3f4f6); padding:1px 5px; border-radius:4px; font-weight:700; font-size:11px; }
.legend-pct { color:var(--grey-400); font-size:11px; }

.profile-metric { display:flex; align-items:center; gap:10px; }
.pm-icon { width:32px; height:32px; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:16px; font-weight:700; flex:0 0 32px; }
.pm-icon.female  { background:#fce7f3; color:#9d174d; }
.pm-icon.abled   { background:#ede9fe; color:#6d28d9; }
.pm-icon.migrant { background:#e0f2fe; color:#0369a1; }
.pm-icon.members { background:#f0fdf4; color:#15803d; }
.pm-value { font-size:18px; font-weight:800; color:var(--grey-800); line-height:1; }
.pm-label { font-size:12px; font-weight:600; color:var(--grey-700); }
.pm-sub   { font-size:11px; color:var(--grey-400); }

/* ── Twin Row ───────────────────────────────────── */
.twin-row { display:grid; grid-template-columns:1fr 1fr; gap:18px; }
@media(max-width:768px) { .twin-row { grid-template-columns:1fr; } }

/* ── Progress List ──────────────────────────────── */
.progress-list { display:flex; flex-direction:column; gap:10px; }
.progress-item {}
.progress-meta { display:flex; justify-content:space-between; align-items:center; margin-bottom:4px; }
.progress-label { font-size:12px; color:var(--grey-600,#4b5563); font-weight:500; }
.progress-val { font-size:13px; font-weight:700; }
.val-good { color:#16a34a; }
.val-warn { color:#d97706; }
.val-bad  { color:#dc2626; }
.warn     { color:#dc2626; }
.progress-track { height:8px; background:var(--grey-100,#f3f4f6); border-radius:4px; overflow:hidden; }
.progress-fill  { height:100%; border-radius:4px; transition:width .5s ease; }

.house-type-row { margin-top:6px; }
.house-type-bars { display:flex; height:20px; border-radius:4px; overflow:hidden; gap:1px; margin-top:5px; }
.house-type-seg { background:#16a34a; display:flex; align-items:center; justify-content:center; }
.house-type-seg span { font-size:10px; color:#fff; font-weight:600; white-space:nowrap; overflow:hidden; padding:0 3px; }
.house-type-seg.semi  { background:#d97706; }
.house-type-seg.kutcha { background:#dc2626; }

.health-badge-row { display:flex; gap:10px; margin-top:8px; }
.health-badge { background:var(--grey-50,#f9fafb); border:1px solid var(--grey-200,#e5e7eb); border-radius:8px; padding:8px 12px; text-align:center; flex:1; }
.badge-num { display:block; font-size:20px; font-weight:800; color:var(--grey-800); }
.badge-lbl { font-size:11px; color:var(--grey-500); font-weight:500; }

/* ── Livelihood Grid ────────────────────────────── */
.livelihood-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; }
@media(max-width:900px) { .livelihood-grid { grid-template-columns:repeat(2,1fr); } }
.live-card {
  border-radius:10px; padding:16px;
  display:flex; align-items:center; gap:14px;
  border:1px solid transparent;
}
.live-green  { background:#f0fdf4; border-color:#bbf7d0; }
.live-blue   { background:#eff6ff; border-color:#bfdbfe; }
.live-amber  { background:#fffbeb; border-color:#fde68a; }
.live-teal   { background:#f0fdfa; border-color:#99f6e4; }
.live-ring { flex:0 0 64px; }
.ring-svg  { width:64px; height:64px; transform:rotate(-90deg); }
.live-body {}
.live-label { font-size:13px; font-weight:700; color:var(--grey-800); }
.live-count { font-size:11px; color:var(--grey-600); margin-top:3px; }
.live-sub   { font-size:11px; color:var(--grey-400); margin-top:2px; }

/* ── Village Coverage ───────────────────────────── */
.cov-bar-wrap { display:flex; align-items:center; gap:8px; }
.cov-bar { flex:1; height:8px; background:var(--grey-100,#f3f4f6); border-radius:4px; overflow:hidden; }
.cov-fill { height:100%; border-radius:4px; transition:width .5s; }
.cov-pct { font-size:12px; font-weight:700; min-width:36px; text-align:right; }
</style>
