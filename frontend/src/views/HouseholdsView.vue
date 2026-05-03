<template>
  <div>
    <div class="breadcrumb">Home › <span>Household Master</span></div>
    <div class="page-header">
      <div>
        <div class="page-title">Household Master</div>
        <div class="page-sub">Centralised unique household database with deduplication</div>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-success btn-sm" @click="exportExcel" :disabled="exportState.running">
          <span v-if="exportState.running">⏳ {{ exportState.label }}</span>
          <span v-else>⬇ Export Excel</span>
        </button>
        <RouterLink v-if="auth.can('admin','enumerator')" to="/households/new" class="btn btn-primary btn-sm">＋ Add Household</RouterLink>
      </div>
    </div>

    <div class="alert alert-info">
      ℹ️ Household IDs auto-generated as <strong>STATECODE-VILLAGEID-HH####</strong> (e.g. TN-V01-HH0001). Non-editable after creation.
    </div>

    <!-- Export progress -->
    <div v-if="exportState.running" class="export-progress-wrap">
      <div class="export-progress-bar"><div class="export-progress-fill" :style="{ width: exportState.pct + '%' }"></div></div>
      <div class="export-progress-label">{{ exportState.label }}</div>
    </div>

    <div class="card">

      <!-- ── Geo Filter Bar ────────────────────────────── -->
      <div class="geo-filter-bar">
        <div class="geo-filter-row">
          <!-- State -->
          <div class="geo-filter-group">
            <label class="geo-filter-lbl">State</label>
            <select v-model="geo.state_id" class="geo-filter-select" @change="onStateChange">
              <option value="">All States</option>
              <option v-for="s in geo.states" :key="s.state_id" :value="s.state_id">{{ s.state_name }}</option>
            </select>
          </div>

          <!-- District -->
          <div class="geo-filter-group">
            <label class="geo-filter-lbl">District</label>
            <select v-model="geo.district_id" class="geo-filter-select"
                    :disabled="!geo.state_id || geoLoad.district"
                    @change="onDistrictChange">
              <option value="">{{ geo.state_id ? (geoLoad.district ? 'Loading…' : 'All Districts') : '— Select State —' }}</option>
              <option v-for="d in geo.districts" :key="d.district_id" :value="d.district_id">{{ d.district_name }}</option>
            </select>
          </div>

          <!-- Block -->
          <div class="geo-filter-group">
            <label class="geo-filter-lbl">Block</label>
            <select v-model="geo.block_id" class="geo-filter-select"
                    :disabled="!geo.district_id || geoLoad.block"
                    @change="onBlockChange">
              <option value="">{{ geo.district_id ? (geoLoad.block ? 'Loading…' : 'All Blocks') : '— Select District —' }}</option>
              <option v-for="b in geo.blocks" :key="b.block_id" :value="b.block_id">{{ b.block_name }}</option>
            </select>
          </div>

          <!-- Village -->
          <div class="geo-filter-group">
            <label class="geo-filter-lbl">Village</label>
            <select v-model="geo.village_id" class="geo-filter-select"
                    :disabled="!geo.block_id || geoLoad.village"
                    @change="onVillageChange">
              <option value="">{{ geo.block_id ? (geoLoad.village ? 'Loading…' : 'All Villages') : '— Select Block —' }}</option>
              <option v-for="v in geo.villages" :key="v.village_id" :value="v.village_id">{{ v.village_name }}</option>
            </select>
          </div>
        </div>

        <!-- Active geo chips -->
        <div class="geo-active-chips" v-if="geo.state_id">
          <span class="geo-chip">
            {{ geo.states.find(s => s.state_id == geo.state_id)?.state_name }}
            <span v-if="geo.district_id"> › {{ geo.districts.find(d => d.district_id == geo.district_id)?.district_name }}</span>
            <span v-if="geo.block_id"> › {{ geo.blocks.find(b => b.block_id == geo.block_id)?.block_name }}</span>
            <span v-if="geo.village_id"> › {{ geo.villages.find(v => v.village_id == geo.village_id)?.village_name }}</span>
            <button class="geo-chip-clear" @click="resetGeo">✕</button>
          </span>
        </div>
      </div>

      <!-- ── Search & Keyword Filters ─────────────────── -->
      <div class="search-bar" style="margin-top:12px">
        <div class="search-wrap" style="flex:1;min-width:180px">
          <span class="search-icon">🔍</span>
          <input v-model="filters.search" class="form-input"
                 placeholder="Search by ID, name, mobile…"
                 @input="debounceLoad" />
        </div>
        <!-- Workflow status filter — admin & mis_head only -->
        <select v-if="auth.can('admin','mis_head')" v-model="filters.workflow_status"
                class="form-select" style="width:160px" @change="load">
          <option value="approved">✔ Approved</option>
          <option value="">All Stages</option>
          <option value="draft">Draft</option>
          <option value="submitted">Submitted</option>
          <option value="under_review">Under Review</option>
          <option value="returned">Returned</option>
        </select>
        <select v-model="filters.status" class="form-select" style="width:130px" @change="load">
          <option value="">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
        <button class="btn btn-primary btn-sm" @click="load">Search</button>
        <button class="btn btn-grey btn-sm" @click="resetAll">Reset</button>
      </div>

      <!-- Baseline chips -->
      <div class="filter-chips">
        <div :class="['chip', !filters.baseline && 'active']" @click="filters.baseline=''; load()">All</div>
        <div :class="['chip', filters.baseline==='yes' && 'active']" @click="filters.baseline='yes'; load()">Baseline Done</div>
      </div>

      <!-- Record count -->
      <div class="results-summary" v-if="!loading">
        <span>{{ total }} record{{ total !== 1 ? 's' : '' }} found</span>
        <span v-if="hasActiveFilters" class="filter-active-badge">Filtered</span>
      </div>

      <!-- Loading -->
      <div class="loading-center" v-if="loading"><div class="spinner"></div></div>

      <template v-else>
        <!-- Desktop table -->
        <div class="table-wrap hh-table-wrap">
          <table class="data-table hh-table">
            <thead>
              <tr>
                <th>HH ID</th>
                <th>Head of Household</th>
                <th class="col-hide-sm">Village</th>
                <th class="col-hide-md">Block</th>
                <th class="col-hide-md">Caste</th>
                <th class="col-hide-sm">Mobile</th>
                <th class="col-hide-lg">Proj.</th>
                <th class="col-hide-lg">Baseline</th>
                <th class="col-hide-lg">GPS</th>
                <th class="col-hide-sm">Status</th>
                <th>Review</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!rows.length">
                <td colspan="12">
                  <div class="empty-state"><span class="icon">🏠</span><p>No households found</p></div>
                </td>
              </tr>
              <tr v-for="h in rows" :key="h.household_id" :class="{ 'row-returned': h.workflow_status === 'returned' }">
                <td><span class="id-badge id-badge-sm">{{ h.household_id }}</span></td>
                <td>
                  <div class="hh-name-cell">
                    <span class="hh-name">{{ h.head_name }}</span>
                    <!-- Mobile only: show village & status inline -->
                    <span class="hh-meta-mobile">
                      {{ h.village_name }}
                      <span :class="['tag tag-xs', wfTag(h.workflow_status)]">{{ wfLabel(h.workflow_status) }}</span>
                    </span>
                  </div>
                </td>
                <td class="col-hide-sm">{{ h.village_name }}</td>
                <td class="col-hide-md"><span class="text-muted-sm">{{ h.block_name }}</span></td>
                <td class="col-hide-md"><span :class="['tag tag-xs', casteTag(h.social_category)]">{{ h.social_category }}</span></td>
                <td class="col-hide-sm">{{ h.mobile }}</td>
                <td class="col-hide-lg"><span class="tag tag-xs tag-blue">{{ h.project_count ?? 0 }}</span></td>
                <td class="col-hide-lg"><span :class="['tag tag-xs', h.baseline_completed ? 'tag-green' : 'tag-amber']">{{ h.baseline_completed ? '✓' : '—' }}</span></td>
                <td class="col-hide-lg"><span :class="['tag tag-xs', h.gps_latitude ? 'tag-teal' : 'tag-grey']">{{ h.gps_latitude ? '📍' : '—' }}</span></td>
                <td class="col-hide-sm"><span :class="['tag tag-xs', h.status === 'Active' ? 'tag-green' : 'tag-red']">{{ h.status }}</span></td>
                <td><span :class="['tag tag-xs', wfTag(h.workflow_status)]">{{ wfLabel(h.workflow_status) }}</span></td>
                <td class="actions-cell">
                  <div class="action-btns">
                    <button class="btn btn-outline btn-xs" @click="viewHH(h)">View</button>
                    <RouterLink v-if="canEdit(h)" :to="`/households/${h.household_id}/edit`" class="btn btn-primary btn-xs">Edit</RouterLink>
                    <button
                      v-if="auth.isEnumerator && h.created_by_user_id === auth.user?.id && ['draft','returned'].includes(h.workflow_status)"
                      class="btn btn-xs btn-wf-submit"
                      @click="submitHH(h)" :disabled="wfAction === h.household_id">
                      📤
                    </button>
                    <template v-if="auth.isMISReviewer && ['submitted','under_review'].includes(h.workflow_status)">
                      <button class="btn btn-xs btn-wf-approve" @click="approveHH(h)" title="Approve">✔</button>
                      <button class="btn btn-xs btn-wf-return"  @click="openReturnHH(h)" title="Return">↩</button>
                    </template>
                    <button v-if="auth.isAdmin" class="btn btn-danger btn-xs" @click="deleteHH(h)" title="Delete">✕</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style="display:flex;align-items:center;justify-content:space-between;padding-top:12px">
          <span style="font-size:12px;color:var(--grey-500)">Showing {{ rows.length }} of {{ total }} records</span>
          <div class="pagination">
            <div class="page-btn" @click="changePage(page-1)">«</div>
            <div v-for="p in pageRange" :key="p" :class="['page-btn', p===page && 'active']" @click="changePage(p)">{{ p }}</div>
            <div class="page-btn" @click="changePage(page+1)">»</div>
          </div>
        </div>
      </template>
    </div>

    <!-- View Modal -->
    <div class="modal-overlay" v-if="viewModal" @click.self="viewModal=null">
      <div class="modal-box">
        <div class="modal-header">
          <div class="modal-title">Household Details — <span class="id-badge">{{ viewModal.household_id }}</span></div>
          <span class="modal-close" @click="viewModal=null">✕</span>
        </div>
        <div class="modal-body">
          <div class="form-grid form-grid-3" style="gap:12px">
            <div><div class="card-sub">Head of HH</div><strong>{{ viewModal.head_name }}</strong></div>
            <div><div class="card-sub">Mobile</div><strong>{{ viewModal.mobile }}</strong></div>
            <div><div class="card-sub">State</div><strong>{{ viewModal.state_name }}</strong></div>
            <div><div class="card-sub">District</div><strong>{{ viewModal.district_name }}</strong></div>
            <div><div class="card-sub">Block</div><strong>{{ viewModal.block_name }}</strong></div>
            <div><div class="card-sub">Village</div><strong>{{ viewModal.village_name }}</strong></div>
            <div><div class="card-sub">Caste</div><strong>{{ viewModal.social_category }}</strong></div>
            <div><div class="card-sub">Education</div><strong>{{ viewModal.education }}</strong></div>
            <div><div class="card-sub">Occupation</div><strong>{{ viewModal.occupation }}</strong></div>
            <div><div class="card-sub">Income</div><strong>{{ viewModal.monthly_income }}</strong></div>
            <div><div class="card-sub">Baseline</div><strong>{{ viewModal.baseline_completed ? 'Yes' : 'No' }}</strong></div>
            <div><div class="card-sub">Status</div><span :class="['tag', viewModal.status==='Active'?'tag-green':'tag-red']">{{ viewModal.status }}</span></div>
            <div><div class="card-sub">GPS</div><strong>{{ viewModal.gps_latitude ? viewModal.gps_latitude+', '+viewModal.gps_longitude : 'Not recorded' }}</strong></div>
          </div>
          <div v-if="viewModal.links?.length" style="margin-top:16px">
            <div class="form-section">Project Participation</div>
            <table class="data-table">
              <thead><tr><th>Project</th><th>Benefit</th><th>Date</th><th>Value</th><th>Status</th></tr></thead>
              <tbody>
                <tr v-for="l in viewModal.links" :key="l.record_id">
                  <td>{{ l.project_code }}</td><td>{{ l.benefit_type }}</td>
                  <td>{{ l.enrollment_date?.slice(0,10) }}</td>
                  <td>₹{{ Number(l.monetary_value).toLocaleString('en-IN') }}</td>
                  <td><span class="tag tag-green">{{ l.status }}</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="modal-footer"><button class="btn btn-outline" @click="viewModal=null">Close</button></div>
      </div>
    </div>

    <!-- Return for Clarification Modal (from HH list) -->
    <div class="modal-overlay" v-if="wfReturnModal.show" @click.self="wfReturnModal.show=false">
      <div class="modal-box">
        <div class="modal-header">
          <div class="modal-title">↩ Return for Clarification — {{ wfReturnModal.hh?.household_id }}</div>
          <span class="modal-close" @click="wfReturnModal.show=false">✕</span>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">Comment <span class="req">*</span></label>
            <textarea v-model="wfReturnModal.comment" class="form-input" rows="4"
                      placeholder="Explain what the enumerator needs to fix…" style="resize:vertical"></textarea>
          </div>
          <div class="alert alert-danger" v-if="wfReturnModal.error" style="margin-top:8px">{{ wfReturnModal.error }}</div>
          <div class="modal-footer">
            <button class="btn btn-outline" @click="wfReturnModal.show=false">Cancel</button>
            <button class="btn btn-primary" :disabled="wfReturnModal.saving" @click="submitReturnHH">
              <span v-if="wfReturnModal.saving" class="spinner" style="width:12px;height:12px;border-width:2px"></span>
              <span v-else>↩ Return to Enumerator</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import api from '../api'

const auth     = useAuthStore()
const rows     = ref([])
const total    = ref(0)
const loading  = ref(true)
const page     = ref(1)
const limit    = 20
const viewModal = ref(null)
let   debTimer  = null

// ── Keyword / status filters ──────────────────────────────────────────────────
const filters = ref({ search: '', status: '', baseline: '', workflow_status: 'approved' })

// ── Cascading geo state ───────────────────────────────────────────────────────
const geo = ref({
  state_id: '', district_id: '', block_id: '', village_id: '',
  states: [], districts: [], blocks: [], villages: [],
})
const geoLoad = ref({ district: false, block: false, village: false })

// ── Derived ───────────────────────────────────────────────────────────────────
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / limit)))
const pageRange  = computed(() => {
  const t = totalPages.value, p = page.value
  const start = Math.max(1, Math.min(p - 2, t - 4))
  const end   = Math.min(t, start + 4)
  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
})
const hasActiveFilters = computed(() =>
  geo.value.state_id || geo.value.village_id || filters.value.search ||
  filters.value.status || filters.value.baseline ||
  (filters.value.workflow_status && filters.value.workflow_status !== 'approved')
)

const casteTag = c => ({ SC:'tag-red', ST:'tag-amber', OBC:'tag-grey', General:'tag-teal', EWS:'tag-blue' }[c] || 'tag-grey')

// ── Build filter params for API calls ─────────────────────────────────────────
function buildParams(extra = {}) {
  return {
    search:           filters.value.search,
    status:           filters.value.status,
    baseline:         filters.value.baseline,
    workflow_status:  filters.value.workflow_status,
    state_id:         geo.value.state_id,
    district_id:      geo.value.district_id,
    block_id:         geo.value.block_id,
    village_id:       geo.value.village_id,
    ...extra,
  }
}

// ── Household list ────────────────────────────────────────────────────────────
async function load() {
  loading.value = true
  try {
    const { data } = await api.get('/households', {
      params: { ...buildParams(), page: page.value, limit }
    })
    rows.value  = data.data
    total.value = data.total
  } finally { loading.value = false }
}

function debounceLoad() {
  clearTimeout(debTimer)
  debTimer = setTimeout(() => { page.value = 1; load() }, 400)
}

function changePage(p) {
  if (p < 1 || p > totalPages.value) return
  page.value = p; load()
}

// ── Geo cascade handlers ──────────────────────────────────────────────────────
async function onStateChange() {
  geo.value.district_id = ''; geo.value.block_id = ''; geo.value.village_id = ''
  geo.value.districts = []; geo.value.blocks = []; geo.value.villages = []
  page.value = 1; load()
  if (!geo.value.state_id) return
  geoLoad.value.district = true
  try {
    const { data } = await api.get('/masters/hh-districts', { params: { state_id: geo.value.state_id } })
    geo.value.districts = data
  } finally { geoLoad.value.district = false }
}

async function onDistrictChange() {
  geo.value.block_id = ''; geo.value.village_id = ''
  geo.value.blocks = []; geo.value.villages = []
  page.value = 1; load()
  if (!geo.value.district_id) return
  geoLoad.value.block = true
  try {
    const { data } = await api.get('/masters/hh-blocks', { params: { district_id: geo.value.district_id } })
    geo.value.blocks = data
  } finally { geoLoad.value.block = false }
}

async function onBlockChange() {
  geo.value.village_id = ''; geo.value.villages = []
  page.value = 1; load()
  if (!geo.value.block_id) return
  geoLoad.value.village = true
  try {
    const { data } = await api.get('/masters/hh-villages', { params: { block_id: geo.value.block_id } })
    geo.value.villages = data
  } finally { geoLoad.value.village = false }
}

function onVillageChange() {
  page.value = 1; load()
}

function resetGeo() {
  geo.value = { ...geo.value, state_id: '', district_id: '', block_id: '', village_id: '', districts: [], blocks: [], villages: [] }
  page.value = 1; load()
}

function resetAll() {
  filters.value = { search: '', status: '', baseline: '', workflow_status: 'approved' }
  resetGeo()
}

// ── View / Delete ─────────────────────────────────────────────────────────────
async function viewHH(h) {
  const { data } = await api.get(`/households/${h.household_id}`)
  viewModal.value = data
}

async function deleteHH(h) {
  if (!confirm(`Delete household ${h.household_id}? This cannot be undone.`)) return
  await api.delete(`/households/${h.household_id}`)
  load()
}

// ── Excel Export ──────────────────────────────────────────────────────────────
const exportState = ref({ running: false, pct: 0, label: '' })

async function exportExcel() {
  const XLSX = (await import('xlsx')).default || (await import('xlsx'))
  exportState.value = { running: true, pct: 5, label: 'Connecting…' }

  const BATCH = 500
  let allHouseholds = [], allMembers = [], pageNum = 1, fetchedTotal = null

  try {
    while (true) {
      exportState.value.label = fetchedTotal
        ? `Fetching records ${allHouseholds.length} / ${fetchedTotal}…`
        : 'Fetching records…'
      const { data } = await api.get('/households/export/data', {
        params: { ...buildParams(), page: pageNum, limit: BATCH }
      })
      if (fetchedTotal === null) fetchedTotal = data.total
      allHouseholds = allHouseholds.concat(data.households)
      allMembers    = allMembers.concat(data.members)
      exportState.value.pct = Math.min(75, Math.round((allHouseholds.length / fetchedTotal) * 70) + 5)
      if (allHouseholds.length >= fetchedTotal || data.households.length < BATCH) break
      pageNum++
    }

    exportState.value = { running: true, pct: 80, label: `Building Excel (${fetchedTotal} households)…` }
    const wb = XLSX.utils.book_new()

    const pick = (obj, keys) => {
      const row = {}
      keys.forEach(([src, label]) => { row[label] = obj[src] ?? '' })
      return row
    }
    const addSheet = (name, data) => {
      if (!data.length) return
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), name)
    }

    addSheet('Summary', allHouseholds.map(h => pick(h, [
      ['household_id','Household ID'],['enumerator_name','Enumerator'],['survey_date','Survey Date'],
      ['v_state_name','State'],['v_district_name','District'],['v_block_name','Block'],['v_village_name','Village'],
      ['head_name','Head Name'],['head_age','Head Age'],['mobile','Mobile'],
      ['social_category','Social Category'],['education','Education'],['occupation','Occupation'],
      ['monthly_income','Income Bracket'],['status','Status'],
    ])))
    addSheet('Geographic Details', allHouseholds.map(h => pick(h, [
      ['household_id','Household ID'],['v_state_name','State'],['v_district_name','District'],
      ['v_block_name','Block'],['v_village_name','Village'],['village_id','Village ID'],
      ['gps_latitude','GPS Latitude'],['gps_longitude','GPS Longitude'],
    ])))
    addSheet('Household Profile', allHouseholds.map(h => pick(h, [
      ['household_id','Household ID'],['head_name','Head Name'],['head_age','Head Age'],['mobile','Mobile'],
      ['social_category','Social Category'],['marital_status','Marital Status'],['education','Education'],
      ['occupation','Occupation'],['occupation_other','Occupation (Other)'],
      ['monthly_income','Income Bracket'],['monthly_income_exact','Income Exact (₹)'],
      ['differently_abled','Differently Abled'],['disability_category','Disability Category'],
      ['female_headed_household','Female Headed HH'],['migration_status','Migration'],['seasonal_migration','Seasonal Migration'],
    ])))
    addSheet('WASH & Housing', allHouseholds.map(h => pick(h, [
      ['household_id','Household ID'],['type_of_house','House Type'],['ownership_status','Ownership'],
      ['number_of_rooms','Rooms'],['type_of_roof','Roof'],['type_of_floor','Floor'],
      ['access_to_electricity','Electricity'],['source_of_lighting','Lighting'],
      ['cooking_fuel','Cooking Fuel'],['separate_kitchen','Separate Kitchen'],
      ['primary_water_source','Water Source'],['distance_to_water','Water Distance'],
      ['water_availability','Water Availability'],['type_of_toilet_facility','Toilet Facility'],
      ['type_of_toilet','Toilet Type'],['handwashing_facility','Handwashing'],
      ['use_of_soap','Soap Use'],['solid_waste_disposal','Waste Disposal'],
    ])))
    addSheet('Health & Nutrition', allHouseholds.map(h => pick(h, [
      ['household_id','Household ID'],['chronic_illness','Chronic Illness'],
      ['chronic_illness_detail','Illness Detail'],['nearest_health_facility','Health Facility'],
      ['distance_to_health','Distance to Health'],['health_insurance','Health Insurance'],
      ['health_insurance_scheme','Insurance Scheme'],['pregnant_lactating','Pregnant/Lactating'],
      ['children_under_5','Children <5'],['immunization_status','Immunization'],['anganwadi_access','Anganwadi'],
    ])))
    addSheet('Education', allHouseholds.map(h => pick(h, [
      ['household_id','Household ID'],['children_attending_school','Children in School'],
      ['type_of_school','School Type'],['dropout_cases','Dropout Cases'],['dropout_reason','Dropout Reason'],
    ])))
    addSheet('Agriculture & Livelihood', allHouseholds.map(h => pick(h, [
      ['household_id','Household ID'],['land_ownership','Land Ownership'],['land_size_total','Land Size (acres)'],
      ['irrigation_type','Irrigation'],['livestock_ownership','Livestock'],['livestock_types','Livestock Types'],
      ['fishing_involved','Fishing'],['fishing_type','Fishing Type'],['boat_ownership','Boat'],
      ['boat_type','Boat Type'],['fishing_method','Fishing Method'],['fishing_frequency','Fishing Frequency'],
      ['storage_facilities','Storage'],
    ])))
    addSheet('SHG, FPO & Credit', allHouseholds.map(h => pick(h, [
      ['household_id','Household ID'],['shg_membership','SHG'],['shg_role','SHG Role'],
      ['shg_loan','SHG Loan'],['shg_loan_savings','Savings Loan (₹)'],['shg_loan_bank','Bank Loan (₹)'],
      ['loan_reason','Loan Reason'],['fpo_membership','FPO'],['fpo_role','FPO Role'],
      ['fpo_commodity','FPO Commodity'],['fpo_market_linkage','Market Linkage'],
      ['gp_elected_member','GP Member'],['access_to_credit','Credit Access'],
      ['credit_sources','Credit Sources'],['total_credit_amount','Total Credit (₹)'],
    ])))
    addSheet('Assets & Schemes', allHouseholds.map(h => pick(h, [
      ['household_id','Household ID'],['assets_ownership','Assets'],['asset_type','Asset Type'],
      ['household_assets','Household Assets'],['govt_schemes_benefit','Govt Schemes'],
      ['scheme_benefit_details','Scheme Details'],['mssrf_support_earlier','MSSRF Support'],
      ['mssrf_support_details','MSSRF Details'],['other_ngo_support','NGO Support'],
      ['observation_remarks','Remarks'],['respondent_comments','Comments'],
    ])))
    addSheet('Members', allMembers.map(m => pick(m, [
      ['household_id','Household ID'],['member_name','Name'],['age','Age'],
      ['relationship_to_head','Relationship'],['social_category','Caste'],
      ['marital_status','Marital Status'],['education','Education'],['occupation','Occupation'],
      ['monthly_income','Income'],['mobile_number','Mobile'],['differently_abled','Diff. Abled'],
      ['shg_membership','SHG'],['fpo_membership','FPO'],['gp_elected_member','GP Member'],
      ['govt_schemes_benefit','Govt Schemes'],['mssrf_support_earlier','MSSRF Support'],
    ])))

    exportState.value = { running: true, pct: 95, label: 'Generating file…' }
    const geo_label = geo.value.village_id
      ? (geo.value.villages.find(v => v.village_id == geo.value.village_id)?.village_name || 'Village')
      : geo.value.block_id
        ? (geo.value.blocks.find(b => b.block_id == geo.value.block_id)?.block_name || 'Block')
        : geo.value.district_id
          ? (geo.value.districts.find(d => d.district_id == geo.value.district_id)?.district_name || 'District')
          : geo.value.state_id
            ? (geo.value.states.find(s => s.state_id == geo.value.state_id)?.state_name || 'State')
            : 'All'
    const date = new Date().toISOString().slice(0,10).replace(/-/g,'')
    XLSX.writeFile(wb, `MSSRF-HITS_Households_${geo_label}_${date}.xlsx`)
    exportState.value = { running: false, pct: 100, label: 'Done' }
  } catch (e) {
    console.error('Export failed:', e)
    exportState.value = { running: false, pct: 0, label: '' }
    alert('Export failed: ' + e.message)
  }
}

// ── Workflow helpers & actions ────────────────────────────────────────────────
const wfAction    = ref('')
const wfReturnModal = ref({ show: false, hh: null, comment: '', saving: false, error: '' })

const wfTag = s => ({
  draft:'tag-grey', submitted:'tag-blue', under_review:'tag-amber',
  approved:'tag-green', returned:'tag-red',
}[s] || 'tag-grey')
const wfLabel = s => ({
  draft:'Draft', submitted:'Submitted', under_review:'Under Review',
  approved:'✔ Approved', returned:'↩ Returned',
}[s] || s || '—')

function canEdit(h) {
  const r = auth.role
  if (r === 'admin') return true
  if (r === 'mis_reviewer') return true
  if (r === 'enumerator' && h.created_by_user_id === auth.user?.id &&
      ['draft','returned'].includes(h.workflow_status)) return true
  return false
}

async function submitHH(h) {
  if (!confirm(`Submit ${h.household_id} — ${h.head_name} for review?`)) return
  wfAction.value = h.household_id
  try {
    await api.post(`/workflow/${h.household_id}/submit`)
    load()
  } catch (e) {
    alert(e.response?.data?.message || 'Submit failed')
  } finally { wfAction.value = '' }
}

async function approveHH(h) {
  if (!confirm(`Approve ${h.household_id} — ${h.head_name}?`)) return
  try {
    await api.post(`/workflow/${h.household_id}/approve`)
    load()
  } catch (e) { alert(e.response?.data?.message || 'Approve failed') }
}

function openReturnHH(h) {
  wfReturnModal.value = { show: true, hh: h, comment: '', saving: false, error: '' }
}

async function submitReturnHH() {
  if (!wfReturnModal.value.comment.trim()) {
    wfReturnModal.value.error = 'Comment is required'
    return
  }
  wfReturnModal.value.saving = true
  wfReturnModal.value.error  = ''
  try {
    await api.post(`/workflow/${wfReturnModal.value.hh.household_id}/return`,
      { comment: wfReturnModal.value.comment.trim() })
    wfReturnModal.value = { show: false, hh: null, comment: '', saving: false, error: '' }
    load()
  } catch (e) {
    wfReturnModal.value.error = e.response?.data?.message || 'Return failed'
  } finally { wfReturnModal.value.saving = false }
}

// ── Mount ─────────────────────────────────────────────────────────────────────
onMounted(async () => {
  try {
    const { data } = await api.get('/masters/hh-states')
    geo.value.states = data
  } catch (e) {
    console.error('Failed to load states:', e.message)
  }
  load()
})
</script>

<style scoped>
.btn-wf-submit  { background:#e8f5e9;color:#2e7d32;border:1.5px solid #a5d6a7;border-radius:6px;padding:3px 8px;font-size:11px;font-weight:700;cursor:pointer; }
.btn-wf-submit:hover  { background:#c8e6c9; }
.btn-wf-approve { background:#e3f2fd;color:#0277bd;border:1.5px solid #90caf9;border-radius:6px;padding:3px 8px;font-size:11px;font-weight:700;cursor:pointer; }
.btn-wf-approve:hover { background:#bbdefb; }
.btn-wf-return  { background:#fff3e0;color:#e65100;border:1.5px solid #ffcc80;border-radius:6px;padding:3px 8px;font-size:11px;font-weight:700;cursor:pointer; }
.btn-wf-return:hover  { background:#ffe0b2; }

/* ── Responsive table ───────────────────────────────────────────────────── */
.hh-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; border-radius: 8px; }
.hh-table { min-width: 600px; }
.hh-table th, .hh-table td { padding: 8px 10px; white-space: nowrap; font-size: 13px; }
.tag-xs { font-size: 10px; padding: 1px 6px; border-radius: 8px; }
.id-badge-sm { font-size: 11px; padding: 2px 7px; }
.text-muted-sm { font-size: 12px; color: var(--grey-600); }
.hh-name-cell { display: flex; flex-direction: column; gap: 2px; }
.hh-name { font-weight: 600; font-size: 13px; }
.hh-meta-mobile { display: none; font-size: 11px; color: var(--grey-500); gap: 6px; align-items: center; }
.action-btns { display: flex; gap: 3px; flex-wrap: wrap; align-items: center; }
.row-returned td { background: #fff8f5; }

/* Hide columns progressively */
@media (max-width: 1100px) { .col-hide-lg { display: none; } }
@media (max-width: 860px)  { .col-hide-md { display: none; } }
@media (max-width: 640px)  {
  .col-hide-sm { display: none; }
  .hh-meta-mobile { display: flex; }
  .hh-table th, .hh-table td { padding: 6px 8px; }
}
/* ── Geo filter bar ──────────────────────────────────────────────────────────── */
.geo-filter-bar {
  background: var(--grey-50, #f9fafb);
  border: 1px solid var(--grey-200, #e5e7eb);
  border-radius: 8px;
  padding: 12px 14px 10px;
  margin-bottom: 0;
}
.geo-filter-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}
@media (max-width: 768px) {
  .geo-filter-row { grid-template-columns: 1fr 1fr; }
}
.geo-filter-group { display: flex; flex-direction: column; gap: 4px; }
.geo-filter-lbl {
  font-size: 11px;
  font-weight: 600;
  color: var(--grey-500, #6b7280);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.geo-filter-select {
  width: 100%;
  padding: 6px 10px;
  font-size: 13px;
  border: 1px solid var(--grey-300, #d1d5db);
  border-radius: 6px;
  background: #fff;
  color: var(--grey-800, #1f2937);
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;
  padding-right: 28px;
  transition: border-color 0.15s;
}
.geo-filter-select:focus { outline: none; border-color: var(--primary, #1B5E20); box-shadow: 0 0 0 3px rgba(27,94,32,.12); }
.geo-filter-select:disabled { background-color: var(--grey-100, #f3f4f6); color: var(--grey-400, #9ca3af); cursor: not-allowed; }

/* Active geo chip */
.geo-active-chips { margin-top: 8px; display: flex; gap: 6px; flex-wrap: wrap; }
.geo-chip {
  display: inline-flex; align-items: center; gap: 6px;
  background: #dcfce7; color: #166534;
  font-size: 12px; font-weight: 500;
  padding: 3px 8px 3px 10px;
  border-radius: 20px;
  border: 1px solid #bbf7d0;
}
.geo-chip-clear {
  background: none; border: none; cursor: pointer;
  color: #16a34a; font-size: 11px; padding: 0 2px;
  line-height: 1;
}
.geo-chip-clear:hover { color: #dc2626; }

/* Results summary */
.results-summary {
  display: flex; align-items: center; gap: 8px;
  font-size: 12px; color: var(--grey-500); margin: 4px 0 8px;
}
.filter-active-badge {
  background: #fef3c7; color: #92400e;
  padding: 1px 7px; border-radius: 10px;
  font-size: 11px; font-weight: 600;
}

/* Export progress */
.export-progress-wrap { margin: 8px 0 12px; display: flex; align-items: center; gap: 12px; }
.export-progress-bar { flex: 1; height: 8px; background: var(--grey-200,#e5e7eb); border-radius: 4px; overflow: hidden; }
.export-progress-fill { height: 100%; background: var(--primary,#1B5E20); border-radius: 4px; transition: width 0.3s ease; }
.export-progress-label { font-size: 12px; color: var(--grey-600,#4b5563); white-space: nowrap; min-width: 220px; }

/* Export button */
.btn-success { background: #047857; color: #fff; border: none; }
.btn-success:hover:not(:disabled) { background: #065f46; }
.btn-success:disabled { opacity: 0.6; cursor: not-allowed; }
</style>
