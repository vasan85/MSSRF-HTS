<template>
  <div>
    <div class="breadcrumb">Home › <span>Enumerator Submissions</span></div>
    <div class="page-header">
      <div>
        <div class="page-title">Enumerator-wise Submissions</div>
        <div class="page-sub">Track submission activity and workflow status per field enumerator</div>
      </div>
    </div>

    <!-- ── Period Filter ── -->
    <div class="card period-card">
      <div class="period-row">
        <div class="period-chips">
          <button v-for="p in periods" :key="p.value"
                  :class="['period-chip', { active: filters.period === p.value }]"
                  @click="setPeriod(p.value)">
            {{ p.label }}
          </button>
        </div>
        <!-- Custom date range -->
        <div class="custom-range" v-if="filters.period === 'custom'">
          <input type="date" v-model="filters.date_from" class="form-input date-input" @change="load" />
          <span class="range-sep">→</span>
          <input type="date" v-model="filters.date_to"   class="form-input date-input" @change="load" />
        </div>
      </div>
    </div>

    <!-- ── Summary Strip ── -->
    <div class="summary-strip" v-if="summary">
      <div class="ss-card">
        <div class="ss-val">{{ summary.total_enumerators }}</div>
        <div class="ss-lbl">Enumerators</div>
      </div>
      <div class="ss-card">
        <div class="ss-val">{{ summary.total }}</div>
        <div class="ss-lbl">Total Records</div>
      </div>
      <div class="ss-card ss-approved">
        <div class="ss-val">{{ summary.approved }}</div>
        <div class="ss-lbl">Approved</div>
      </div>
      <div class="ss-card ss-submitted">
        <div class="ss-val">{{ summary.submitted + summary.under_review }}</div>
        <div class="ss-lbl">Pending Review</div>
      </div>
      <div class="ss-card ss-returned">
        <div class="ss-val">{{ summary.returned }}</div>
        <div class="ss-lbl">Returned</div>
      </div>
      <div class="ss-card ss-draft">
        <div class="ss-val">{{ summary.draft }}</div>
        <div class="ss-lbl">Draft</div>
      </div>
    </div>

    <!-- ── Table ── -->
    <div class="card">
      <div class="card-header">
        <div class="card-title">📋 Submission Breakdown</div>
        <div class="search-wrap" style="width:220px">
          <span class="search-icon">🔍</span>
          <input v-model="search" class="form-input" placeholder="Search enumerator…" @input="filterRows" />
        </div>
      </div>

      <div class="loading-center" v-if="loading"><div class="spinner"></div></div>

      <div class="table-wrap" v-else>
        <table class="data-table es-table">
          <thead>
            <tr>
              <th @click="sortBy('enumerator_name')" class="sortable">
                Enumerator {{ sortIcon('enumerator_name') }}
              </th>
              <th @click="sortBy('total')" class="sortable">Total {{ sortIcon('total') }}</th>
              <th @click="sortBy('approved')" class="sortable">
                <span class="tag tag-green tag-xs">Approved</span> {{ sortIcon('approved') }}
              </th>
              <th @click="sortBy('submitted')" class="sortable">
                <span class="tag tag-blue tag-xs">Submitted</span> {{ sortIcon('submitted') }}
              </th>
              <th @click="sortBy('under_review')" class="sortable">
                <span class="tag tag-amber tag-xs">Under Review</span> {{ sortIcon('under_review') }}
              </th>
              <th @click="sortBy('returned')" class="sortable">
                <span class="tag tag-red tag-xs">Returned</span> {{ sortIcon('returned') }}
              </th>
              <th @click="sortBy('draft')" class="sortable">
                <span class="tag tag-grey tag-xs">Draft</span> {{ sortIcon('draft') }}
              </th>
              <th>Approval %</th>
              <th>Last Activity</th>
              <th v-if="auth.isAdmin">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!filtered.length">
              <td :colspan="auth.isAdmin ? 10 : 9">
                <div class="empty-state"><span class="icon">📋</span><p>No data found</p></div>
              </td>
            </tr>
            <tr v-for="r in sorted" :key="r.enumerator_id"
                :class="{ 'row-blocked': r.is_blocked }">
              <td>
                <div class="enum-cell">
                  <div class="enum-av" :style="{ background: avatarColor(r.enumerator_name) }">
                    {{ r.enumerator_name?.charAt(0).toUpperCase() }}
                  </div>
                  <div>
                    <div class="enum-name">{{ r.enumerator_name }}</div>
                    <div class="enum-email">{{ r.enumerator_email }}</div>
                  </div>
                </div>
              </td>
              <td><strong>{{ r.total }}</strong></td>
              <td><span class="tag tag-green tag-xs">{{ r.approved }}</span></td>
              <td><span class="tag tag-blue tag-xs">{{ r.submitted }}</span></td>
              <td><span class="tag tag-amber tag-xs">{{ r.under_review }}</span></td>
              <td><span class="tag tag-red tag-xs">{{ r.returned }}</span></td>
              <td><span class="tag tag-grey tag-xs">{{ r.draft }}</span></td>
              <td>
                <div class="approval-bar-wrap">
                  <div class="approval-bar">
                    <div class="approval-fill" :style="{ width: approvalPct(r) + '%' }"></div>
                  </div>
                  <span class="approval-pct">{{ approvalPct(r) }}%</span>
                </div>
              </td>
              <td class="text-muted-sm">{{ r.last_activity ? fmtDate(r.last_activity) : '—' }}</td>
              <td v-if="auth.isAdmin">
                <span v-if="r.is_blocked" class="tag tag-red tag-xs">🔒 Blocked</span>
                <span v-else class="tag tag-green tag-xs">Active</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="table-footnote" v-if="!loading && filters.period !== 'all_time'">
        Showing records created during: <strong>{{ periodLabel }}</strong>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import api from '../api'

const auth = useAuthStore()

const periods = [
  { value: 'today',        label: 'Today' },
  { value: 'this_week',    label: 'This Week' },
  { value: 'this_month',   label: 'This Month' },
  { value: 'last_month',   label: 'Last Month' },
  { value: 'this_quarter', label: 'This Quarter' },
  { value: 'this_year',    label: 'This Year' },
  { value: '',             label: 'All Time' },
  { value: 'custom',       label: 'Custom' },
]

const filters  = ref({ period: 'this_month', date_from: '', date_to: '' })
const loading  = ref(true)
const rows     = ref([])
const summary  = ref(null)
const search   = ref('')
const sortCol  = ref('total')
const sortDir  = ref('desc')

const periodLabel = computed(() => periods.find(p => p.value === filters.value.period)?.label || 'All Time')

const filtered = computed(() => {
  if (!search.value) return rows.value
  const q = search.value.toLowerCase()
  return rows.value.filter(r =>
    r.enumerator_name?.toLowerCase().includes(q) ||
    r.enumerator_email?.toLowerCase().includes(q)
  )
})

const sorted = computed(() => {
  const col = sortCol.value
  return [...filtered.value].sort((a, b) => {
    const av = typeof a[col] === 'string' ? a[col].toLowerCase() : Number(a[col] || 0)
    const bv = typeof b[col] === 'string' ? b[col].toLowerCase() : Number(b[col] || 0)
    if (av < bv) return sortDir.value === 'asc' ? -1 : 1
    if (av > bv) return sortDir.value === 'asc' ? 1 : -1
    return 0
  })
})

function sortBy(col) {
  if (sortCol.value === col) sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  else { sortCol.value = col; sortDir.value = 'desc' }
}
function sortIcon(col) {
  if (sortCol.value !== col) return ''
  return sortDir.value === 'asc' ? '↑' : '↓'
}

function filterRows() {} // reactive via computed

function setPeriod(p) {
  filters.value.period = p
  if (p !== 'custom') load()
}

async function load() {
  if (filters.value.period === 'custom' && !filters.value.date_from && !filters.value.date_to) return
  loading.value = true
  try {
    const params = { period: filters.value.period || undefined }
    if (filters.value.period === 'custom') {
      params.date_from = filters.value.date_from
      params.date_to   = filters.value.date_to
    }
    const { data } = await api.get('/workflow/enumerator-stats', { params })
    rows.value    = data.data
    summary.value = data.summary
  } catch (e) {
    console.error(e)
  } finally { loading.value = false }
}

function approvalPct(r) {
  if (!r.total) return 0
  return Math.round((Number(r.approved) / Number(r.total)) * 100)
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })
}

const COLORS = ['#2e7d32','#0277bd','#7b1fa2','#00695c','#e65100','#1565c0','#4527a0']
function avatarColor(name) {
  if (!name) return '#9e9e9e'
  let h = 0; for (const c of name) h = (h + c.charCodeAt(0)) % COLORS.length
  return COLORS[h]
}

onMounted(load)
</script>

<style scoped>
/* Period filter */
.period-card { padding: 14px 18px; }
.period-row  { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
.period-chips { display: flex; gap: 6px; flex-wrap: wrap; }
.period-chip {
  padding: 5px 14px; border-radius: 20px; font-size: 12px; font-weight: 700;
  border: 1.5px solid #e5e7eb; background: #f9fafb; color: #6b7280;
  cursor: pointer; transition: all .15s;
}
.period-chip:hover { border-color: #a7f3d0; background: #f0fdf4; color: #1b5e20; }
.period-chip.active { background: #1b5e20; color: white; border-color: #1b5e20; }
.custom-range { display: flex; align-items: center; gap: 8px; }
.date-input { width: 140px; padding: 5px 10px; font-size: 13px; }
.range-sep { color: #9ca3af; font-weight: 700; }

/* Summary strip */
.summary-strip { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; margin-bottom: 16px; }
.ss-card { background: white; border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px 16px; text-align: center; }
.ss-val  { font-size: 28px; font-weight: 900; color: #1b5e20; line-height: 1; }
.ss-lbl  { font-size: 11px; color: #9ca3af; font-weight: 600; margin-top: 4px; text-transform: uppercase; letter-spacing: .5px; }
.ss-approved  { border-top: 3px solid #4ade80; } .ss-approved  .ss-val { color: #16a34a; }
.ss-submitted { border-top: 3px solid #60a5fa; } .ss-submitted .ss-val { color: #2563eb; }
.ss-returned  { border-top: 3px solid #f87171; } .ss-returned  .ss-val { color: #dc2626; }
.ss-draft     { border-top: 3px solid #d1d5db; } .ss-draft     .ss-val { color: #6b7280; }
@media (max-width: 900px) { .summary-strip { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 480px) { .summary-strip { grid-template-columns: repeat(2, 1fr); } }

/* Table */
.es-table { min-width: 800px; }
.es-table th { white-space: nowrap; }
.sortable { cursor: pointer; user-select: none; }
.sortable:hover { background: #f0fdf4; }
.enum-cell  { display: flex; align-items: center; gap: 10px; }
.enum-av    { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 800; color: white; flex-shrink: 0; }
.enum-name  { font-weight: 600; font-size: 13px; }
.enum-email { font-size: 11px; color: #9ca3af; }
.text-muted-sm { font-size: 12px; color: #9ca3af; }
.row-blocked td { background: #fff5f5; opacity: .75; }

/* Approval bar */
.approval-bar-wrap { display: flex; align-items: center; gap: 6px; min-width: 90px; }
.approval-bar { flex: 1; height: 6px; background: #e5e7eb; border-radius: 3px; overflow: hidden; }
.approval-fill { height: 100%; background: #22c55e; border-radius: 3px; transition: width .4s ease; }
.approval-pct { font-size: 12px; font-weight: 700; color: #374151; white-space: nowrap; }

.tag-xs { font-size: 10px; padding: 1px 7px; border-radius: 8px; }
.table-footnote { padding: 10px 0 4px; font-size: 12px; color: #9ca3af; }

.card-header { display: flex; justify-content: space-between; align-items: center; }
.search-wrap { position: relative; }
.search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); font-size: 13px; pointer-events: none; }
.search-wrap .form-input { padding-left: 30px; }
</style>
