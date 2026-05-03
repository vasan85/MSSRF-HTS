<template>
  <div class="vd-root">
    <div class="breadcrumb">Home › <span>Village View</span></div>

    <!-- Page header -->
    <div class="page-header" style="margin-bottom:12px">
      <div>
        <div class="page-title">Village View Dashboard</div>
        <div class="page-sub">Village-wise household coverage and benefit metrics</div>
      </div>
      <button class="btn btn-outline btn-sm" @click="clearFilters" v-if="anyFilter">✕ Clear Filters</button>
    </div>

    <!-- ── Geo filter bar ───────────────────────────────────── -->
    <div class="filter-bar">
      <div class="filter-group">
        <label>State</label>
        <select v-model="fState" class="form-select" @change="fDistrict='';fBlock='';fVillage=''">
          <option value="">All States</option>
          <option v-for="s in fStates" :key="s" :value="s">{{ s }}</option>
        </select>
      </div>
      <div class="filter-sep">›</div>
      <div class="filter-group">
        <label>District</label>
        <select v-model="fDistrict" class="form-select" :disabled="!fState" @change="fBlock='';fVillage=''">
          <option value="">All Districts</option>
          <option v-for="d in fDistricts" :key="d" :value="d">{{ d }}</option>
        </select>
      </div>
      <div class="filter-sep">›</div>
      <div class="filter-group">
        <label>Block</label>
        <select v-model="fBlock" class="form-select" :disabled="!fDistrict" @change="fVillage=''">
          <option value="">All Blocks</option>
          <option v-for="b in fBlocks" :key="b" :value="b">{{ b }}</option>
        </select>
      </div>
      <div class="filter-sep">›</div>
      <div class="filter-group">
        <label>Village</label>
        <select v-model="fVillage" class="form-select" :disabled="!fBlock">
          <option value="">All Villages</option>
          <option v-for="v in fVillages" :key="v.village_id" :value="v.village_id">{{ v.village_name }}</option>
        </select>
      </div>
      <div class="filter-search">
        <label>Search</label>
        <input v-model="search" class="form-input" placeholder="Search village..." style="min-width:160px" />
      </div>
    </div>

    <div class="loading-center" v-if="loading"><div class="spinner spinner-lg"></div></div>

    <template v-else>
      <!-- ── KPI tiles ─────────────────────────────────────── -->
      <div class="kpi-row">
        <div class="kpi-card">
          <div class="kpi-icon icon-villages">🏘</div>
          <div class="kpi-body">
            <div class="kpi-val">{{ filtered.length }}</div>
            <div class="kpi-lbl">Villages</div>
            <div class="kpi-sub">{{ allVillages.length }} total</div>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon icon-reg">🏠</div>
          <div class="kpi-body">
            <div class="kpi-val">{{ totalRegistered.toLocaleString('en-IN') }}</div>
            <div class="kpi-lbl">Registered HH</div>
            <div class="kpi-sub">of {{ totalHHInMaster.toLocaleString('en-IN') }} in master</div>
          </div>
        </div>
        <div class="kpi-card kpi-green">
          <div class="kpi-icon icon-ben">✅</div>
          <div class="kpi-body">
            <div class="kpi-val">{{ totalBenefitted.toLocaleString('en-IN') }}</div>
            <div class="kpi-lbl">Benefitted HH</div>
            <div class="kpi-sub">{{ covered }} village{{ covered!==1?'s':'' }} covered</div>
          </div>
        </div>
        <div class="kpi-card" :class="avgCov >= 50 ? 'kpi-green' : avgCov > 0 ? 'kpi-amber' : ''">
          <div class="kpi-icon icon-cov">📊</div>
          <div class="kpi-body">
            <div class="kpi-val">{{ avgCov.toFixed(1) }}%</div>
            <div class="kpi-lbl">Avg Coverage</div>
            <div class="kpi-sub">{{ lowCoverage }} below 50%</div>
          </div>
        </div>
      </div>

      <!-- ── Two-column layout: table + chart ─────────────── -->
      <div class="dash-body">

        <!-- Village grid / table card -->
        <div class="card table-card">
          <div class="card-header">
            <div class="card-title">Village Coverage</div>
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
              <span class="result-count">{{ filtered.length }} village{{ filtered.length!==1?'s':'' }}</span>

              <!-- Sort (cards mode) -->
              <select v-if="viewMode==='cards'" v-model="sortCol" class="form-select"
                      style="width:140px;font-size:12px;padding:4px 8px" @change="sortDir='desc';page=1">
                <option value="coverage_pct">Sort: Coverage</option>
                <option value="benefitted_hh">Sort: Benefitted HH</option>
                <option value="registered_hh">Sort: Registered HH</option>
                <option value="village_name">Sort: Village Name</option>
              </select>
              <button class="sort-dir-btn" v-if="viewMode==='cards'"
                      @click="sortDir=sortDir==='desc'?'asc':'desc';page=1"
                      :title="sortDir==='desc'?'Descending':'Ascending'">
                {{ sortDir==='desc' ? '↓' : '↑' }}
              </button>

              <!-- Page size -->
              <select v-model="pageSize" class="form-select"
                      style="width:90px;font-size:12px;padding:4px 8px" @change="page=1">
                <option :value="12">12 / pg</option>
                <option :value="24">24 / pg</option>
                <option :value="48">48 / pg</option>
              </select>

              <!-- View toggle -->
              <div class="view-toggle">
                <button :class="['vt-btn', viewMode==='cards'&&'vt-active']" @click="viewMode='cards'" title="Card view">⊞</button>
                <button :class="['vt-btn', viewMode==='table'&&'vt-active']" @click="viewMode='table'" title="Table view">☰</button>
              </div>
            </div>
          </div>

          <!-- ── CARD GRID ── -->
          <div v-if="viewMode==='cards'" class="village-grid">
            <div v-if="!paginated.length" class="empty-state" style="grid-column:1/-1">
              <span class="icon">🏘</span><p>No villages match</p>
            </div>
            <div v-for="v in paginated" :key="v.village_id"
                 :class="['vc', selectedVillage?.village_id===v.village_id&&'vc-selected']"
                 :style="{ borderTopColor: covColor(pct(v)) }"
                 @click="selectVillage(v)">

              <!-- Ring + pct -->
              <div class="vc-ring-wrap">
                <svg viewBox="0 0 44 44" class="vc-ring">
                  <circle cx="22" cy="22" r="17" fill="none" stroke="#f1f5f9" stroke-width="5"/>
                  <circle cx="22" cy="22" r="17" fill="none"
                    :stroke="covColor(pct(v))" stroke-width="5" stroke-linecap="round"
                    :stroke-dasharray="`${pct(v)*1.068} 106.8`"
                    stroke-dashoffset="26.7"
                    style="transition:stroke-dasharray .5s"/>
                </svg>
                <div class="vc-pct" :style="{ color: covColor(pct(v)) }">{{ pct(v).toFixed(0) }}%</div>
              </div>

              <!-- Info -->
              <div class="vc-info">
                <div class="vc-name" :title="v.village_name">{{ v.village_name }}</div>
                <div class="vc-loc">{{ v.block_name }}<span v-if="!fDistrict"> · {{ v.district_name }}</span></div>
                <div class="vc-stats">
                  <span class="vc-stat">
                    <span class="vc-stat-lbl">Reg.</span>
                    <span class="vc-stat-val">{{ Number(v.registered_hh) }}</span>
                  </span>
                  <span class="vc-divider">|</span>
                  <span class="vc-stat">
                    <span class="vc-stat-lbl">Ben.</span>
                    <span class="vc-stat-val" :style="{ color: Number(v.benefitted_hh)>0 ? '#16a34a' : '#9ca3af' }">
                      {{ Number(v.benefitted_hh) }}
                    </span>
                  </span>
                </div>
                <!-- Mini bar -->
                <div class="vc-bar-track">
                  <div class="vc-bar-fill" :style="{ width: Math.min(pct(v),100)+'%', background: covColor(pct(v)) }"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- ── TABLE ── -->
          <div v-else class="table-wrap">
            <table class="data-table vd-table">
              <thead>
                <tr>
                  <th class="sortable" @click="toggleSort('village_name')">Village {{ sortIcon('village_name') }}</th>
                  <th v-if="!fBlock">Block</th>
                  <th v-if="!fDistrict">District</th>
                  <th class="sortable num" @click="toggleSort('registered_hh')">Reg. HH {{ sortIcon('registered_hh') }}</th>
                  <th class="sortable num" @click="toggleSort('benefitted_hh')">Ben. HH {{ sortIcon('benefitted_hh') }}</th>
                  <th class="sortable" @click="toggleSort('coverage_pct')" style="min-width:160px">Coverage {{ sortIcon('coverage_pct') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="!sorted.length">
                  <td :colspan="5"><div class="empty-state"><span class="icon">🏘</span><p>No villages match</p></div></td>
                </tr>
                <tr v-for="v in paginated" :key="v.village_id"
                    :class="['vd-row', selectedVillage?.village_id===v.village_id&&'selected']"
                    @click="selectVillage(v)">
                  <td>
                    <div class="vname">{{ v.village_name }}</div>
                    <div class="vsub">{{ v.block_name }}<span v-if="!fDistrict"> · {{ v.district_name }}</span></div>
                  </td>
                  <td v-if="!fBlock" class="grey-text">{{ v.block_name }}</td>
                  <td v-if="!fDistrict" class="grey-text">{{ v.district_name }}</td>
                  <td class="num">{{ Number(v.registered_hh).toLocaleString('en-IN') }}</td>
                  <td class="num">
                    <span :class="['ben-badge', Number(v.benefitted_hh)>0?'ben-yes':'ben-no']">
                      {{ Number(v.benefitted_hh).toLocaleString('en-IN') }}
                    </span>
                  </td>
                  <td>
                    <div class="cov-cell">
                      <div class="cov-track"><div class="cov-fill" :style="{ width: Math.min(pct(v),100)+'%', background: covColor(pct(v)) }"></div></div>
                      <span class="cov-val" :style="{ color: covColor(pct(v)) }">{{ pct(v).toFixed(1) }}%</span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination -->
          <div class="vd-pagination" v-if="totalPages > 1">
            <span class="pg-info">{{ pageStart }}–{{ pageEnd }} of {{ sorted.length }}</span>
            <div class="pg-controls">
              <button class="pg-btn" :disabled="page===1" @click="page=1">«</button>
              <button class="pg-btn" :disabled="page===1" @click="page--">‹</button>
              <template v-for="p in pageRange" :key="p">
                <span v-if="p==='...'" class="pg-ellipsis">…</span>
                <button v-else :class="['pg-btn', p===page&&'pg-active']" @click="page=p">{{ p }}</button>
              </template>
              <button class="pg-btn" :disabled="page===totalPages" @click="page++">›</button>
              <button class="pg-btn" :disabled="page===totalPages" @click="page=totalPages">»</button>
            </div>
          </div>
        </div>

        <!-- Right panel: detail or chart -->
        <div class="right-panel">

          <!-- Village detail card (when a row is clicked) -->
          <div class="card detail-card" v-if="selectedVillage">
            <div class="card-header" style="gap:8px">
              <div class="card-title">{{ selectedVillage.village_name }}</div>
              <button class="btn-icon" @click="selectedVillage=null" title="Close">✕</button>
            </div>
            <div class="detail-body">
              <div class="detail-breadcrumb">
                {{ selectedVillage.state_name }} › {{ selectedVillage.district_name }} › {{ selectedVillage.block_name }}
              </div>
              <div class="detail-kpis">
                <div class="dk">
                  <div class="dk-val">{{ Number(selectedVillage.total_households).toLocaleString('en-IN') }}</div>
                  <div class="dk-lbl">Census HH</div>
                </div>
                <div class="dk">
                  <div class="dk-val">{{ Number(selectedVillage.registered_hh).toLocaleString('en-IN') }}</div>
                  <div class="dk-lbl">Registered</div>
                </div>
                <div class="dk" :style="{ color: covColor(pct(selectedVillage)) }">
                  <div class="dk-val">{{ Number(selectedVillage.benefitted_hh).toLocaleString('en-IN') }}</div>
                  <div class="dk-lbl">Benefitted</div>
                </div>
              </div>
              <!-- Mini donut-style ring -->
              <div class="cov-ring-wrap">
                <svg viewBox="0 0 64 64" class="cov-ring">
                  <circle cx="32" cy="32" r="26" fill="none" stroke="#e5e7eb" stroke-width="8"/>
                  <circle cx="32" cy="32" r="26" fill="none"
                    :stroke="covColor(pct(selectedVillage))" stroke-width="8"
                    stroke-linecap="round"
                    :stroke-dasharray="`${pct(selectedVillage) * 1.634} 163.4`"
                    stroke-dashoffset="40.85"
                    style="transition:stroke-dasharray .5s"/>
                </svg>
                <div class="ring-label">
                  <div class="ring-pct">{{ pct(selectedVillage).toFixed(1) }}%</div>
                  <div class="ring-sub">Coverage</div>
                </div>
              </div>
              <div class="detail-bar-row">
                <span>Reg. rate</span>
                <div class="mini-track">
                  <div class="mini-fill" :style="{ width: regRate(selectedVillage)+'%', background:'#3b82f6' }"></div>
                </div>
                <span>{{ regRate(selectedVillage).toFixed(1) }}%</span>
              </div>
              <div class="detail-bar-row">
                <span>Ben. rate</span>
                <div class="mini-track">
                  <div class="mini-fill" :style="{ width: pct(selectedVillage)+'%', background: covColor(pct(selectedVillage)) }"></div>
                </div>
                <span>{{ pct(selectedVillage).toFixed(1) }}%</span>
              </div>
            </div>
          </div>

          <!-- Coverage bar chart -->
          <div class="card chart-card">
            <div class="card-header">
              <div class="card-title">Coverage Comparison</div>
              <div class="legend">
                <span class="leg leg-green">≥80%</span>
                <span class="leg leg-amber">50–79%</span>
                <span class="leg leg-red">&lt;50%</span>
              </div>
            </div>
            <div class="chart-scroll">
              <div v-if="!sorted.length" class="empty-state"><span class="icon">📊</span><p>No data</p></div>
              <div v-else class="hbar-list">
                <div v-for="v in sorted" :key="v.village_id"
                     class="hbar-row"
                     :class="selectedVillage?.village_id===v.village_id&&'hbar-active'"
                     @click="selectVillage(v)">
                  <div class="hbar-lbl" :title="v.village_name">{{ v.village_name }}</div>
                  <div class="hbar-track">
                    <div class="hbar-fill"
                         :style="{ width: Math.min(pct(v),100)+'%', background: covColor(pct(v)) }"></div>
                    <div class="hbar-reg"
                         :style="{ width: Math.min(regRate(v),100)+'%' }"></div>
                  </div>
                  <div class="hbar-val" :style="{ color: covColor(pct(v)) }">{{ pct(v).toFixed(1) }}%</div>
                </div>
              </div>
            </div>
            <div class="chart-legend-bar">
              <div class="clb-item"><div class="clb-dot" style="background:#3b82f6"></div> Registered</div>
              <div class="clb-item"><div class="clb-dot" style="background:#22c55e"></div> Benefitted</div>
            </div>
          </div>

        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import api from '../api'

const allVillages    = ref([])
const loading        = ref(true)
const search         = ref('')
const selectedVillage= ref(null)
const sortCol        = ref('coverage_pct')
const sortDir        = ref('desc')
const page           = ref(1)
const pageSize       = ref(12)
const viewMode       = ref('cards')  // 'cards' | 'table'

// Geo filters
const fState    = ref('')
const fDistrict = ref('')
const fBlock    = ref('')
const fVillage  = ref('')

const anyFilter = computed(() => fState.value || fDistrict.value || fBlock.value || fVillage.value || search.value)

function clearFilters() {
  fState.value = ''; fDistrict.value = ''; fBlock.value = ''; fVillage.value = ''; search.value = ''
}

// Cascade options derived from all data
const fStates = computed(() =>
  [...new Set(allVillages.value.map(v => v.state_name).filter(Boolean))].sort()
)
const fDistricts = computed(() => {
  let src = allVillages.value
  if (fState.value) src = src.filter(v => v.state_name === fState.value)
  return [...new Set(src.map(v => v.district_name).filter(Boolean))].sort()
})
const fBlocks = computed(() => {
  let src = allVillages.value
  if (fState.value)    src = src.filter(v => v.state_name    === fState.value)
  if (fDistrict.value) src = src.filter(v => v.district_name === fDistrict.value)
  return [...new Set(src.map(v => v.block_name).filter(Boolean))].sort()
})
const fVillages = computed(() => {
  let src = allVillages.value
  if (fState.value)    src = src.filter(v => v.state_name    === fState.value)
  if (fDistrict.value) src = src.filter(v => v.district_name === fDistrict.value)
  if (fBlock.value)    src = src.filter(v => v.block_name    === fBlock.value)
  return src
})

// Filtered list
const filtered = computed(() => {
  let src = allVillages.value
  if (fState.value)    src = src.filter(v => v.state_name    === fState.value)
  if (fDistrict.value) src = src.filter(v => v.district_name === fDistrict.value)
  if (fBlock.value)    src = src.filter(v => v.block_name    === fBlock.value)
  if (fVillage.value)  src = src.filter(v => v.village_id    === fVillage.value)
  if (search.value) {
    const q = search.value.toLowerCase()
    src = src.filter(v => v.village_name.toLowerCase().includes(q) ||
                          v.block_name.toLowerCase().includes(q) ||
                          v.district_name.toLowerCase().includes(q))
  }
  return src
})

// Sorted
const sorted = computed(() => {
  const list = [...filtered.value]
  list.sort((a, b) => {
    const av = sortCol.value === 'village_name' ? a.village_name : parseFloat(a[sortCol.value]) || 0
    const bv = sortCol.value === 'village_name' ? b.village_name : parseFloat(b[sortCol.value]) || 0
    if (typeof av === 'string') return sortDir.value === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
    return sortDir.value === 'asc' ? av - bv : bv - av
  })
  return list
})

// Pagination
const totalPages = computed(() => Math.max(1, Math.ceil(sorted.value.length / pageSize.value)))
const pageStart  = computed(() => (page.value - 1) * pageSize.value + 1)
const pageEnd    = computed(() => Math.min(page.value * pageSize.value, sorted.value.length))
const paginated  = computed(() => sorted.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value))

const pageRange = computed(() => {
  const total = totalPages.value, cur = page.value
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages = []
  if (cur <= 4) {
    pages.push(1, 2, 3, 4, 5, '...', total)
  } else if (cur >= total - 3) {
    pages.push(1, '...', total-4, total-3, total-2, total-1, total)
  } else {
    pages.push(1, '...', cur-1, cur, cur+1, '...', total)
  }
  return pages
})

// Reset page when filter/sort/search changes
watch([filtered, sortCol, sortDir], () => { page.value = 1 })

function toggleSort(col) {
  if (sortCol.value === col) { sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc' }
  else { sortCol.value = col; sortDir.value = 'desc' }
  page.value = 1
}
function sortIcon(col) {
  if (sortCol.value !== col) return '↕'
  return sortDir.value === 'asc' ? '↑' : '↓'
}

// KPI aggregates over filtered set
const pct     = v  => parseFloat(v.coverage_pct) || 0
const regRate = v  => v.total_households > 0 ? Math.min(100, (Number(v.registered_hh) / Number(v.total_households)) * 100) : 0
const covColor = p => p >= 80 ? '#16a34a' : p >= 50 ? '#d97706' : p > 0 ? '#dc2626' : '#9ca3af'

const totalRegistered = computed(() => filtered.value.reduce((s, v) => s + Number(v.registered_hh), 0))
const totalBenefitted = computed(() => filtered.value.reduce((s, v) => s + Number(v.benefitted_hh), 0))
const totalHHInMaster = computed(() => filtered.value.reduce((s, v) => s + Number(v.total_households), 0))
const covered     = computed(() => filtered.value.filter(v => Number(v.benefitted_hh) > 0).length)
const lowCoverage = computed(() => filtered.value.filter(v => pct(v) < 50).length)
const avgCov      = computed(() => {
  if (!filtered.value.length) return 0
  return filtered.value.reduce((s, v) => s + pct(v), 0) / filtered.value.length
})

function selectVillage(v) {
  selectedVillage.value = selectedVillage.value?.village_id === v.village_id ? null : v
}

async function load() {
  loading.value = true
  try {
    const { data } = await api.get('/dashboard/village-coverage')
    allVillages.value = data
  } finally { loading.value = false }
}

onMounted(load)
</script>

<style scoped>
.vd-root { padding-bottom: 32px; }

/* Filter bar */
.filter-bar {
  display: flex;
  align-items: flex-end;
  gap: 0;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 12px 16px;
  margin-bottom: 16px;
  flex-wrap: wrap;
  row-gap: 10px;
}
.filter-group { display:flex; flex-direction:column; gap:4px; min-width:130px; flex:1; }
.filter-group label { font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:.05em; color:#6b7280; }
.filter-sep { padding:0 6px 6px; font-size:18px; color:#cbd5e1; align-self:flex-end; flex:0; }
.filter-search { display:flex; flex-direction:column; gap:4px; min-width:160px; flex:1.5; }
.filter-search label { font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:.05em; color:#6b7280; }

/* KPI row */
.kpi-row { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:16px; }
.kpi-card {
  background:#fff; border:1px solid #e2e8f0; border-radius:10px;
  padding:16px; display:flex; align-items:center; gap:14px;
  transition:box-shadow .15s;
}
.kpi-card:hover { box-shadow:0 4px 14px rgba(0,0,0,.08); }
.kpi-card.kpi-green { border-left:4px solid #22c55e; }
.kpi-card.kpi-amber { border-left:4px solid #f59e0b; }
.kpi-icon { font-size:28px; width:48px; height:48px; border-radius:10px;
  display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.icon-villages { background:#eff6ff; }
.icon-reg      { background:#f0fdf4; }
.icon-ben      { background:#f0fdf4; }
.icon-cov      { background:#fff7ed; }
.kpi-val { font-size:24px; font-weight:700; color:#111827; line-height:1.1; }
.kpi-lbl { font-size:13px; font-weight:600; color:#374151; margin-top:2px; }
.kpi-sub { font-size:11px; color:#9ca3af; margin-top:2px; }

/* Two-column layout */
.dash-body { display:grid; grid-template-columns:1fr 340px; gap:14px; align-items:start; }
.table-card { min-width:0; }
.right-panel { display:flex; flex-direction:column; gap:14px; }

/* Table */
.vd-table th.sortable { cursor:pointer; user-select:none; }
.vd-table th.sortable:hover { background:#f1f5f9; }
.vd-table th.num, .vd-table td.num { text-align:right; }
.vd-row { cursor:pointer; transition:background .1s; }
.vd-row:hover { background:#f8fafc; }
.vd-row.selected { background:#eff6ff !important; }
.vname { font-weight:600; font-size:13px; }
.vsub  { font-size:11px; color:#9ca3af; margin-top:1px; }
.grey-text { color:#6b7280; font-size:13px; }
.ben-badge { display:inline-block; padding:2px 8px; border-radius:999px; font-size:12px; font-weight:600; }
.ben-yes { background:#dcfce7; color:#16a34a; }
.ben-no  { background:#f3f4f6; color:#9ca3af; }
.result-count { font-size:12px; color:#9ca3af; }

/* Coverage cell */
.cov-cell { display:flex; align-items:center; gap:8px; }
.cov-track { flex:1; height:8px; background:#f3f4f6; border-radius:999px; overflow:hidden; min-width:60px; }
.cov-fill  { height:100%; border-radius:999px; transition:width .4s; }
.cov-val   { font-size:12px; font-weight:700; min-width:38px; text-align:right; }

/* Detail card */
.detail-card { overflow:visible; }
.detail-body { padding:0 16px 16px; }
.detail-breadcrumb { font-size:11px; color:#6b7280; margin-bottom:12px; }
.detail-kpis { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-bottom:14px; }
.dk { text-align:center; background:#f8fafc; border-radius:8px; padding:8px 4px; }
.dk-val { font-size:18px; font-weight:700; color:#111827; }
.dk-lbl { font-size:10px; color:#6b7280; margin-top:2px; text-transform:uppercase; letter-spacing:.04em; }

/* SVG ring */
.cov-ring-wrap { position:relative; width:100px; margin:0 auto 12px; }
.cov-ring { width:100px; height:100px; transform:rotate(-90deg); }
.ring-label { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; }
.ring-pct { font-size:18px; font-weight:700; color:#111827; }
.ring-sub { font-size:10px; color:#6b7280; text-transform:uppercase; }

.detail-bar-row { display:flex; align-items:center; gap:8px; font-size:12px; color:#374151; margin-bottom:6px; }
.detail-bar-row span:first-child { width:60px; flex-shrink:0; }
.mini-track { flex:1; height:6px; background:#f3f4f6; border-radius:999px; overflow:hidden; }
.mini-fill  { height:100%; border-radius:999px; transition:width .4s; }
.detail-bar-row span:last-child { width:40px; text-align:right; font-weight:600; }

/* Chart */
.chart-card .card-header { border-bottom:1px solid #f1f5f9; }
.chart-scroll { max-height:320px; overflow-y:auto; padding:8px 16px; }
.hbar-list { display:flex; flex-direction:column; gap:6px; }
.hbar-row { display:flex; align-items:center; gap:8px; cursor:pointer; padding:4px 6px; border-radius:6px; transition:background .1s; }
.hbar-row:hover, .hbar-row.hbar-active { background:#f1f5f9; }
.hbar-lbl { width:90px; font-size:11px; font-weight:600; color:#374151; text-align:right;
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis; flex-shrink:0; }
.hbar-track { flex:1; height:14px; background:#f3f4f6; border-radius:999px; overflow:hidden; position:relative; }
.hbar-fill { position:absolute; top:0; left:0; height:100%; border-radius:999px; transition:width .4s; }
.hbar-reg  { position:absolute; top:3px; left:0; height:8px; background:rgba(59,130,246,.3); border-radius:999px; transition:width .4s; }
.hbar-val  { width:38px; font-size:11px; font-weight:700; text-align:right; flex-shrink:0; }

.legend { display:flex; gap:8px; }
.leg { font-size:11px; font-weight:600; padding:2px 8px; border-radius:999px; }
.leg-green { background:#dcfce7; color:#16a34a; }
.leg-amber { background:#fef3c7; color:#d97706; }
.leg-red   { background:#fee2e2; color:#dc2626; }

.chart-legend-bar { display:flex; gap:16px; padding:8px 16px; border-top:1px solid #f1f5f9; }
.clb-item { display:flex; align-items:center; gap:5px; font-size:11px; color:#6b7280; }
.clb-dot  { width:10px; height:10px; border-radius:50%; }

.btn-icon { background:none; border:none; cursor:pointer; font-size:16px; color:#9ca3af; padding:2px 6px; border-radius:4px; }
.btn-icon:hover { background:#f3f4f6; color:#374151; }

/* View toggle */
.view-toggle { display:flex; border:1px solid #e2e8f0; border-radius:6px; overflow:hidden; }
.vt-btn { padding:4px 10px; border:none; background:#fff; cursor:pointer; font-size:15px; color:#6b7280; transition:all .12s; }
.vt-btn:hover  { background:#f1f5f9; }
.vt-btn.vt-active { background:#1e3a5f; color:#fff; }

.sort-dir-btn {
  width:32px; height:32px; border:1px solid #e2e8f0; background:#fff;
  border-radius:6px; cursor:pointer; font-size:16px; color:#374151;
  display:flex; align-items:center; justify-content:center;
  transition:all .12s;
}
.sort-dir-btn:hover { background:#f1f5f9; }

/* Village card grid */
.village-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(168px, 1fr));
  gap: 12px;
  padding: 14px 16px;
}

.vc {
  border: 1px solid #e2e8f0;
  border-top: 3px solid #e2e8f0;
  border-radius: 10px;
  padding: 12px 10px 10px;
  cursor: pointer;
  transition: box-shadow .15s, transform .15s;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  background: #fff;
}
.vc:hover     { box-shadow:0 4px 14px rgba(0,0,0,.1); transform:translateY(-2px); }
.vc.vc-selected { box-shadow:0 0 0 2px #2563eb; background:#eff6ff; }

.vc-ring-wrap { position:relative; width:60px; height:60px; flex-shrink:0; }
.vc-ring      { width:60px; height:60px; transform:rotate(-90deg); }
.vc-pct {
  position:absolute; inset:0; display:flex; align-items:center; justify-content:center;
  font-size:13px; font-weight:700;
}

.vc-info  { width:100%; display:flex; flex-direction:column; gap:4px; align-items:center; text-align:center; }
.vc-name  { font-size:13px; font-weight:700; color:#111827; line-height:1.2;
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:100%; }
.vc-loc   { font-size:10px; color:#9ca3af; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:100%; }

.vc-stats    { display:flex; align-items:center; gap:6px; font-size:11px; }
.vc-stat     { display:flex; flex-direction:column; align-items:center; gap:1px; }
.vc-stat-lbl { font-size:9px; text-transform:uppercase; letter-spacing:.05em; color:#9ca3af; }
.vc-stat-val { font-size:13px; font-weight:700; color:#111827; }
.vc-divider  { color:#e2e8f0; font-size:16px; }

.vc-bar-track { width:100%; height:4px; background:#f3f4f6; border-radius:999px; overflow:hidden; margin-top:2px; }
.vc-bar-fill  { height:100%; border-radius:999px; transition:width .4s; }

/* Pagination */
.vd-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border-top: 1px solid #f1f5f9;
  flex-wrap: wrap;
  gap: 8px;
}
.pg-info { font-size: 12px; color: #6b7280; }
.pg-controls { display: flex; align-items: center; gap: 4px; }
.pg-btn {
  min-width: 32px; height: 32px; padding: 0 8px;
  border: 1px solid #e2e8f0; background: #fff; border-radius: 6px;
  font-size: 13px; cursor: pointer; color: #374151; transition: all .12s;
}
.pg-btn:hover:not(:disabled) { background: #f1f5f9; border-color: #94a3b8; }
.pg-btn:disabled { opacity: .4; cursor: default; }
.pg-btn.pg-active { background: #1e3a5f; color: #fff; border-color: #1e3a5f; font-weight: 700; }
.pg-ellipsis { padding: 0 4px; color: #9ca3af; font-size: 13px; }

@media (max-width: 900px) {
  .kpi-row   { grid-template-columns: repeat(2,1fr); }
  .dash-body { grid-template-columns: 1fr; }
}
</style>
