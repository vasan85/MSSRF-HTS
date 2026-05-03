<template>
  <div>
    <div class="breadcrumb">Home › <span>Project Dashboard</span></div>

    <!-- Project Selector -->
    <div class="proj-selector-card">
      <div class="proj-selector-label">Select Project</div>
      <select v-model="selProject" class="form-select proj-select" @change="load">
        <option value="">— choose a project —</option>
        <option v-for="p in projects" :key="p.project_id" :value="p.project_id">
          {{ p.project_code }} · {{ p.project_name }}
        </option>
      </select>
    </div>

    <div v-if="loadError" class="alert alert-danger" style="margin-bottom:16px">⚠️ {{ loadError }}</div>

    <div class="loading-center" v-if="loading"><div class="spinner spinner-lg"></div></div>

    <template v-else-if="pStats">
      <!-- Project Header -->
      <div class="proj-header-card">
        <div class="proj-header-left">
          <div class="proj-name">{{ pStats.project_name }}</div>
          <div class="proj-meta">
            <span class="tag tag-blue">{{ pStats.project_code }}</span>
            <span class="tag tag-teal">{{ pStats.project_type }}</span>
            <span class="proj-dates">{{ pStats.start_date }} → {{ pStats.end_date }}</span>
          </div>
        </div>
        <div class="proj-timeline">
          <div class="timeline-label">
            <span>Timeline Progress</span>
            <span class="timeline-pct">{{ timelinePct }}%</span>
          </div>
          <div class="timeline-track">
            <div class="timeline-fill" :style="{ width: timelinePct + '%' }"
                 :class="timelinePct >= 90 ? 'fill-red' : timelinePct >= 70 ? 'fill-amber' : 'fill-green'"></div>
          </div>
          <div class="timeline-sub">{{ duration }} total · {{ daysLeft }} days left</div>
        </div>
      </div>

      <!-- KPI Tiles -->
      <div class="stat-grid stat-grid-5">
        <div class="stat-tile blue">
          <div class="stat-icon">🏠</div>
          <div class="stat-value">{{ pStats.total_hh }}</div>
          <div class="stat-label">Total HH Enrolled</div>
        </div>
        <div class="stat-tile green">
          <div class="stat-icon">✅</div>
          <div class="stat-value">{{ pStats.active_hh }}</div>
          <div class="stat-label">Active HH</div>
          <div class="stat-trend">{{ activeRate }}% of enrolled</div>
        </div>
        <div class="stat-tile amber">
          <div class="stat-icon">⚠️</div>
          <div class="stat-value">{{ pStats.vulnerable_hh }}</div>
          <div class="stat-label">Vulnerable HH</div>
          <div class="stat-trend">Female-headed</div>
        </div>
        <div class="stat-tile purple">
          <div class="stat-icon">🏘️</div>
          <div class="stat-value">{{ villageStats.length }}</div>
          <div class="stat-label">Villages Covered</div>
        </div>
        <div class="stat-tile teal">
          <div class="stat-icon">💰</div>
          <div class="stat-value">₹{{ formatVal(pStats.total_value) }}</div>
          <div class="stat-label">Total Benefit Value</div>
        </div>
      </div>

      <!-- Middle row: Benefit chart + Status breakdown -->
      <div class="two-col-grid">
        <!-- Horizontal bar chart -->
        <div class="card">
          <div class="card-header"><div class="card-title">Benefit Type Distribution</div></div>
          <div class="hbar-list">
            <div v-if="!benefitDist.length" class="empty-state"><span class="icon">📊</span><p>No benefit data</p></div>
            <div v-for="b in benefitDist" :key="b.benefit_type" class="hbar-row">
              <div class="hbar-label">{{ b.benefit_type || '(none)' }}</div>
              <div class="hbar-track">
                <div class="hbar-fill" :style="{ width: hbarW(b) + '%', background: hbarColor(b) }"></div>
              </div>
              <div class="hbar-vals">
                <span class="hbar-count">{{ b.count }} HH</span>
                <span class="hbar-val">₹{{ formatVal(b.total_value) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Status breakdown donut -->
        <div class="card">
          <div class="card-header"><div class="card-title">Enrollment Status</div></div>
          <div class="status-wrap">
            <svg class="donut-svg" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="36" fill="none" stroke="#f1f5f9" stroke-width="18"/>
              <circle v-for="seg in donutSegs" :key="seg.label"
                cx="50" cy="50" r="36" fill="none"
                :stroke="seg.color" stroke-width="18"
                :stroke-dasharray="`${seg.dash} ${seg.gap}`"
                :stroke-dashoffset="seg.offset"
                transform="rotate(-90 50 50)"/>
            </svg>
            <div class="status-legend">
              <div v-for="s in statusRows" :key="s.label" class="status-leg-row">
                <span class="leg-dot" :style="{ background: s.color }"></span>
                <span class="leg-label">{{ s.label }}</span>
                <span class="leg-count">{{ s.count }}</span>
                <span class="leg-pct">{{ s.pct }}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Village Cards -->
      <div class="card" v-if="villageStats.length">
        <div class="card-header">
          <div class="card-title">Village Breakdown</div>
          <span style="font-size:12px;color:var(--grey-500)">{{ villageStats.length }} villages</span>
        </div>
        <div class="vill-grid">
          <div v-for="v in villageStats" :key="v.village_id" class="vill-card">
            <div class="vill-name">{{ v.village_name }}</div>
            <div class="vill-sub">{{ v.block_name }}, {{ v.district_name }}</div>
            <div class="vill-stats">
              <div class="vs-row">
                <span>Enrolled HH</span><strong>{{ v.linked_hh }}</strong>
              </div>
              <div class="vs-row">
                <span>Active</span>
                <strong style="color:var(--success-600)">{{ v.active_hh }}</strong>
              </div>
              <div class="vs-row">
                <span>Value</span>
                <strong>₹{{ formatVal(v.total_value) }}</strong>
              </div>
            </div>
            <div class="vill-bar-track">
              <div class="vill-bar-fill"
                   :style="{ width: villPct(v) + '%' }"
                   :title="`${villPct(v)}% active`"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Benefit Records Table -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">Benefit Records</div>
          <div style="display:flex;gap:8px;align-items:center">
            <select v-model="statusFilter" class="form-select" style="width:140px;font-size:12px" @change="linkPage=1">
              <option value="">All Statuses</option>
              <option>Active</option><option>Pending</option>
              <option>Partial</option><option>Closed</option>
            </select>
            <span style="font-size:12px;color:var(--grey-500)">{{ filteredLinks.length }} records</span>
          </div>
        </div>
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Record ID</th><th>Household</th><th>Village</th>
                <th>Benefit Type</th><th>Category</th>
                <th>Value (₹)</th><th>Date</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!pagedLinks.length">
                <td colspan="8"><div class="empty-state"><span class="icon">🔗</span><p>No records</p></div></td>
              </tr>
              <tr v-for="l in pagedLinks" :key="l.record_id">
                <td><span class="id-badge">{{ l.record_id }}</span></td>
                <td><span class="id-badge">{{ l.household_id }}</span></td>
                <td>{{ l.village_name }}</td>
                <td>{{ l.benefit_type || '—' }}</td>
                <td><span v-if="l.benefit_category" class="tag tag-teal">{{ l.benefit_category }}</span><span v-else>—</span></td>
                <td>{{ Number(l.monetary_value || 0).toLocaleString('en-IN') }}</td>
                <td>{{ l.enrollment_date?.slice(0,10) || '—' }}</td>
                <td>
                  <span class="tag"
                    :class="l.status==='Active'?'tag-green':l.status==='Closed'?'tag-red':l.status==='Partial'?'tag-amber':'tag-grey'">
                    {{ l.status }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div v-if="linkTotalPages > 1" class="pagination">
          <button class="page-btn" :disabled="linkPage===1" @click="linkPage=1">«</button>
          <button class="page-btn" :disabled="linkPage===1" @click="linkPage--">‹</button>
          <template v-for="p in linkPageRange" :key="p">
            <span v-if="p==='...'" class="page-ellipsis">…</span>
            <button v-else class="page-btn" :class="{ active: p===linkPage }" @click="linkPage=p">{{ p }}</button>
          </template>
          <button class="page-btn" :disabled="linkPage===linkTotalPages" @click="linkPage++">›</button>
          <button class="page-btn" :disabled="linkPage===linkTotalPages" @click="linkPage=linkTotalPages">»</button>
          <select v-model.number="linkPageSize" class="page-size-sel" @change="linkPage=1">
            <option :value="10">10</option><option :value="20">20</option><option :value="50">50</option>
          </select>
        </div>
      </div>
    </template>

    <div v-else-if="!loading" class="empty-state" style="margin-top:60px">
      <span class="icon">📋</span>
      <p>Select a project to view its dashboard</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import api from '../api'

const projects      = ref([])
const selProject    = ref('')
const pStats        = ref(null)
const benefitDist   = ref([])
const links         = ref([])
const villageStats  = ref([])
const loading       = ref(false)
const loadError     = ref('')

const statusFilter  = ref('')
const linkPage      = ref(1)
const linkPageSize  = ref(20)

// ── Timeline ─────────────────────────────────────────────────────
const timelinePct = computed(() => {
  if (!pStats.value?.start_date || !pStats.value?.end_date) return 0
  const start = new Date(pStats.value.start_date).getTime()
  const end   = new Date(pStats.value.end_date).getTime()
  const now   = Date.now()
  if (now <= start) return 0
  if (now >= end)   return 100
  return Math.round((now - start) / (end - start) * 100)
})

const duration = computed(() => {
  if (!pStats.value?.start_date || !pStats.value?.end_date) return '—'
  const ms = new Date(pStats.value.end_date) - new Date(pStats.value.start_date)
  const months = Math.round(ms / (1000*60*60*24*30))
  return months >= 12 ? `${Math.floor(months/12)} yr ${months%12} mo` : `${months} months`
})

const daysLeft = computed(() => {
  if (!pStats.value?.end_date) return '—'
  const diff = new Date(pStats.value.end_date) - Date.now()
  if (diff < 0) return 'Ended'
  return Math.ceil(diff / (1000*60*60*24))
})

const activeRate = computed(() => {
  if (!pStats.value?.total_hh) return 0
  return Math.round((pStats.value.active_hh / pStats.value.total_hh) * 100)
})

// ── Benefit chart helpers ─────────────────────────────────────────
const barColors = ['#2e7d32','#0288d1','#f59e0b','#d32f2f','#7c3aed','#0891b2','#be185d']
const hbarW = b => {
  const max = Math.max(...benefitDist.value.map(x => Number(x.count)), 1)
  return Math.round(Number(b.count) / max * 100)
}
const hbarColor = (_, i) => barColors[benefitDist.value.indexOf(_) % barColors.length]

// ── Donut chart ───────────────────────────────────────────────────
const statusCfg = [
  { key: 'active_hh',  label: 'Active',  color: '#16a34a' },
  { key: 'pending_hh', label: 'Pending', color: '#f59e0b' },
  { key: 'partial_hh', label: 'Partial', color: '#0288d1' },
  { key: 'closed_hh',  label: 'Closed',  color: '#ef4444' },
]

const statusRows = computed(() => {
  const total = villageStats.value.reduce((s, v) => s + Number(v.linked_hh), 0) || pStats.value?.total_hh || 0
  return statusCfg.map(cfg => {
    const count = villageStats.value.reduce((s, v) => s + Number(v[cfg.key] || 0), 0)
    return { ...cfg, count, pct: total ? Math.round(count / total * 100) : 0 }
  })
})

const donutSegs = computed(() => {
  const circ = 2 * Math.PI * 36
  let offset = 0
  return statusRows.value.map(s => {
    const dash = (s.pct / 100) * circ
    const seg  = { label: s.label, color: s.color, dash, gap: circ - dash, offset: circ - offset }
    offset += dash
    return seg
  })
})

// ── Village cards ─────────────────────────────────────────────────
const villPct = v => {
  if (!v.linked_hh) return 0
  return Math.round(Number(v.active_hh) / Number(v.linked_hh) * 100)
}

// ── Benefit records table ─────────────────────────────────────────
const filteredLinks = computed(() =>
  statusFilter.value ? links.value.filter(l => l.status === statusFilter.value) : links.value
)

const linkTotalPages = computed(() => Math.max(1, Math.ceil(filteredLinks.value.length / linkPageSize.value)))

const pagedLinks = computed(() => {
  const start = (linkPage.value - 1) * linkPageSize.value
  return filteredLinks.value.slice(start, start + linkPageSize.value)
})

const linkPageRange = computed(() => {
  const total = linkTotalPages.value
  const cur   = linkPage.value
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages = [1]
  if (cur > 3) pages.push('...')
  for (let i = Math.max(2, cur - 1); i <= Math.min(total - 1, cur + 1); i++) pages.push(i)
  if (cur < total - 2) pages.push('...')
  pages.push(total)
  return pages
})

watch(filteredLinks, () => { linkPage.value = 1 })

// ── Formatting ────────────────────────────────────────────────────
const formatVal = v => {
  const n = Number(v || 0)
  if (n >= 10000000) return (n / 10000000).toFixed(1) + 'Cr'
  if (n >= 100000)   return (n / 100000).toFixed(1) + 'L'
  return n.toLocaleString('en-IN')
}

// ── Data loading ──────────────────────────────────────────────────
async function load() {
  if (!selProject.value) return
  loading.value = true
  loadError.value = ''
  pStats.value = null
  try {
    const pid = selProject.value
    const [psR, bdR, lkR, vsR] = await Promise.allSettled([
      api.get('/dashboard/project-stats',         { params: { project_id: pid } }),
      api.get('/dashboard/benefit-distribution',  { params: { project_id: pid } }),
      api.get('/links',                           { params: { project_id: pid, limit: 500 } }),
      api.get('/dashboard/project-village-stats', { params: { project_id: pid } }),
    ])
    if (psR.status === 'fulfilled') pStats.value = psR.value.data[0] || null
    else { loadError.value = psR.reason?.response?.data?.message || 'Failed to load project stats'; loading.value = false; return }
    if (bdR.status === 'fulfilled') benefitDist.value = bdR.value.data
    if (lkR.status === 'fulfilled') links.value = lkR.value.data.data || []
    if (vsR.status === 'fulfilled') villageStats.value = vsR.value.data
    else villageStats.value = []
    statusFilter.value = ''
    linkPage.value     = 1
  } catch (err) {
    loadError.value = err?.response?.data?.message || err.message || 'Unexpected error'
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  const { data } = await api.get('/projects')
  projects.value = data
  if (data.length) { selProject.value = data[0].project_id; await load() }
})
</script>

<style scoped>
/* Project selector */
.proj-selector-card {
  background: var(--white);
  border: 1px solid var(--grey-200);
  border-radius: 10px;
  padding: 14px 20px;
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 16px;
}
.proj-selector-label { font-size: 13px; font-weight: 600; color: var(--grey-600); white-space: nowrap; }
.proj-select { flex: 1; max-width: 480px; }

/* Project header */
.proj-header-card {
  background: linear-gradient(135deg, #1e3a5f 0%, #0d5c8f 100%);
  border-radius: 12px;
  padding: 20px 24px;
  margin-bottom: 18px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  flex-wrap: wrap;
}
.proj-name { font-size: 20px; font-weight: 700; color: #fff; margin-bottom: 8px; }
.proj-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.proj-dates { font-size: 12px; color: rgba(255,255,255,.75); }

.proj-timeline { min-width: 260px; flex: 1; max-width: 380px; }
.timeline-label { display: flex; justify-content: space-between; font-size: 12px; color: rgba(255,255,255,.8); margin-bottom: 6px; }
.timeline-pct { font-weight: 700; color: #fff; }
.timeline-track { height: 8px; background: rgba(255,255,255,.2); border-radius: 4px; overflow: hidden; }
.timeline-fill { height: 100%; border-radius: 4px; transition: width .4s; }
.fill-green { background: #4ade80; }
.fill-amber { background: #fbbf24; }
.fill-red   { background: #f87171; }
.timeline-sub { font-size: 11px; color: rgba(255,255,255,.6); margin-top: 5px; }

/* 5-col stat grid */
.stat-grid-5 { display: grid; grid-template-columns: repeat(5, 1fr); gap: 14px; margin-bottom: 18px; }
@media (max-width: 1100px) { .stat-grid-5 { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 640px)  { .stat-grid-5 { grid-template-columns: repeat(2, 1fr); } }

/* Two-column middle section */
.two-col-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-bottom: 18px; }
@media (max-width: 900px) { .two-col-grid { grid-template-columns: 1fr; } }

/* Horizontal bar chart */
.hbar-list { display: flex; flex-direction: column; gap: 10px; padding: 4px 0; }
.hbar-row { display: flex; align-items: center; gap: 10px; }
.hbar-label { width: 110px; font-size: 12px; color: var(--grey-700); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex-shrink: 0; }
.hbar-track { flex: 1; height: 14px; background: var(--grey-100); border-radius: 7px; overflow: hidden; }
.hbar-fill  { height: 100%; border-radius: 7px; transition: width .4s; }
.hbar-vals  { display: flex; flex-direction: column; align-items: flex-end; min-width: 72px; }
.hbar-count { font-size: 11px; font-weight: 700; color: var(--grey-800); }
.hbar-val   { font-size: 10px; color: var(--grey-500); }

/* Status donut */
.status-wrap { display: flex; align-items: center; justify-content: center; gap: 24px; padding: 8px 0; flex-wrap: wrap; }
.donut-svg   { width: 130px; height: 130px; flex-shrink: 0; }
.status-legend { display: flex; flex-direction: column; gap: 10px; }
.status-leg-row { display: flex; align-items: center; gap: 8px; font-size: 13px; }
.leg-dot  { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.leg-label { flex: 1; color: var(--grey-700); }
.leg-count { font-weight: 700; color: var(--grey-900); min-width: 28px; text-align: right; }
.leg-pct   { color: var(--grey-400); min-width: 36px; text-align: right; font-size: 12px; }

/* Village cards */
.vill-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; }
.vill-card {
  background: var(--grey-50);
  border: 1px solid var(--grey-200);
  border-radius: 8px;
  padding: 12px;
}
.vill-name { font-size: 13px; font-weight: 700; color: var(--grey-900); margin-bottom: 2px; }
.vill-sub  { font-size: 11px; color: var(--grey-400); margin-bottom: 8px; }
.vill-stats { display: flex; flex-direction: column; gap: 4px; margin-bottom: 8px; }
.vs-row { display: flex; justify-content: space-between; font-size: 12px; color: var(--grey-600); }
.vill-bar-track { height: 5px; background: var(--grey-200); border-radius: 3px; overflow: hidden; }
.vill-bar-fill  { height: 100%; background: var(--success-500, #22c55e); border-radius: 3px; transition: width .4s; }

/* tag extras */
.tag-red    { background: #fee2e2; color: #b91c1c; }
.tag-amber  { background: #fef3c7; color: #92400e; }
.tag-grey   { background: var(--grey-100); color: var(--grey-600); }

/* Pagination */
.pagination { display: flex; align-items: center; gap: 4px; padding: 12px 16px; border-top: 1px solid var(--grey-200); flex-wrap: wrap; }
.page-btn { min-width: 30px; height: 30px; border: 1px solid var(--grey-200); background: var(--white); border-radius: 5px; font-size: 13px; cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0 6px; }
.page-btn:hover:not(:disabled) { background: var(--grey-100); }
.page-btn.active { background: var(--primary-600, #2563eb); color: #fff; border-color: var(--primary-600, #2563eb); font-weight: 700; }
.page-btn:disabled { opacity: .4; cursor: default; }
.page-ellipsis { padding: 0 4px; color: var(--grey-400); }
.page-size-sel { margin-left: 8px; height: 30px; border: 1px solid var(--grey-200); border-radius: 5px; font-size: 12px; padding: 0 4px; }
</style>
