<template>
  <div>
    <div class="breadcrumb">Home › <span>My Submissions</span></div>
    <div class="page-header">
      <div>
        <div class="page-title">My Submissions</div>
        <div class="page-sub">Track the review status of your submitted household records</div>
      </div>
    </div>

    <!-- ── Period Filter ── -->
    <div class="card period-card">
      <div class="period-row">
        <div class="period-chips">
          <button v-for="p in periods" :key="p.value"
                  :class="['period-chip', { active: period === p.value }]"
                  @click="setPeriod(p.value)">
            {{ p.label }}
          </button>
        </div>
        <div class="custom-range" v-if="period === 'custom'">
          <input type="date" v-model="dateFrom" class="form-input date-input" @change="loadAll" />
          <span class="range-sep">→</span>
          <input type="date" v-model="dateTo"   class="form-input date-input" @change="loadAll" />
        </div>
      </div>
    </div>

    <!-- ── Stats strip from my-stats endpoint ── -->
    <div class="status-strip" v-if="stats">
      <div class="strip-chip chip-grey">
        <span class="strip-num">{{ stats.total }}</span>
        <span class="strip-label">Total</span>
      </div>
      <div class="strip-chip chip-grey">
        <span class="strip-num">{{ stats.draft }}</span>
        <span class="strip-label">Draft</span>
      </div>
      <div class="strip-chip chip-blue">
        <span class="strip-num">{{ Number(stats.submitted) + Number(stats.under_review) }}</span>
        <span class="strip-label">Pending Review</span>
      </div>
      <div class="strip-chip chip-green">
        <span class="strip-num">{{ stats.approved }}</span>
        <span class="strip-label">Approved</span>
      </div>
      <div class="strip-chip chip-red">
        <span class="strip-num">{{ stats.returned }}</span>
        <span class="strip-label">Returned</span>
      </div>
    </div>

    <div class="alert alert-success" v-if="successMsg">✅ {{ successMsg }}</div>
    <div class="alert alert-danger"  v-if="errorMsg">❌ {{ errorMsg }}</div>

    <div class="card">
      <!-- Status filter chips -->
      <div class="filter-chips">
        <div :class="['chip', filter==='' && 'active']"           @click="setFilter('')">All</div>
        <div :class="['chip', filter==='draft' && 'active']"      @click="setFilter('draft')">Draft</div>
        <div :class="['chip', filter==='returned' && 'active']"   @click="setFilter('returned')">Returned ↩</div>
        <div :class="['chip', filter==='submitted' && 'active']"  @click="setFilter('submitted')">Submitted</div>
        <div :class="['chip', filter==='approved' && 'active']"   @click="setFilter('approved')">Approved ✔</div>
      </div>

      <div class="loading-center" v-if="loading"><div class="spinner"></div></div>

      <div class="table-wrap" v-else>
        <table class="data-table">
          <thead>
            <tr>
              <th>Household ID</th>
              <th>Head of HH</th>
              <th>Village / Block</th>
              <th>Workflow Status</th>
              <th>Submitted At</th>
              <th>Reviewer Note</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!rows.length">
              <td colspan="7">
                <div class="empty-state">
                  <span class="icon">📋</span>
                  <p>No records found</p>
                </div>
              </td>
            </tr>
            <tr v-for="h in rows" :key="h.household_id"
                :class="{ 'row-returned': h.workflow_status === 'returned' }">
              <td><span class="id-badge">{{ h.household_id }}</span></td>
              <td><strong>{{ h.head_name }}</strong></td>
              <td>
                <div>{{ h.village_name }}</div>
                <div style="font-size:11px;color:var(--grey-500)">{{ h.block_name }}</div>
              </td>
              <td>
                <span :class="['tag', statusTag(h.workflow_status)]">{{ statusLabel(h.workflow_status) }}</span>
              </td>
              <td style="font-size:12px;color:var(--grey-500)">
                {{ h.submitted_at ? fmtDate(h.submitted_at) : '—' }}
              </td>
              <td>
                <div v-if="h.review_comment" class="comment-cell">
                  <span class="comment-icon">↩</span> {{ h.review_comment }}
                </div>
                <span v-else style="color:var(--grey-400);font-size:12px">—</span>
              </td>
              <td style="white-space:nowrap">
                <RouterLink :to="`/households/${h.household_id}/edit`" class="btn btn-outline btn-xs">
                  {{ h.workflow_status === 'returned' ? '✏️ Edit' : 'View' }}
                </RouterLink>
                <button
                  v-if="h.workflow_status === 'draft' || h.workflow_status === 'returned'"
                  class="btn btn-submit btn-xs"
                  style="margin-left:4px"
                  @click="submitHH(h)"
                  :disabled="submitting === h.household_id">
                  <span v-if="submitting === h.household_id" class="spinner" style="width:10px;height:10px;border-width:2px"></span>
                  <span v-else>📤 Submit</span>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style="display:flex;align-items:center;justify-content:space-between;padding-top:12px" v-if="!loading">
        <span style="font-size:12px;color:var(--grey-500)">Showing {{ rows.length }} of {{ total }}</span>
        <div class="pagination">
          <div class="page-btn" @click="changePage(page-1)">«</div>
          <div v-for="p in pageRange" :key="p" :class="['page-btn', p===page && 'active']" @click="changePage(p)">{{ p }}</div>
          <div class="page-btn" @click="changePage(page+1)">»</div>
        </div>
      </div>

      <div class="table-footnote" v-if="!loading && period !== ''">
        Showing records for: <strong>{{ periodLabel }}</strong>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import api from '../api'

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

const rows       = ref([])
const total      = ref(0)
const loading    = ref(true)
const page       = ref(1)
const limit      = 20
const filter     = ref('')
const period     = ref('this_month')
const dateFrom   = ref('')
const dateTo     = ref('')
const stats      = ref(null)
const submitting = ref('')
const successMsg = ref('')
const errorMsg   = ref('')

const periodLabel = computed(() => periods.find(p => p.value === period.value)?.label || 'All Time')

const pageRange = computed(() => {
  const pages = Math.ceil(total.value / limit)
  const p = page.value
  const r = []
  for (let i = Math.max(1, p - 2); i <= Math.min(pages, p + 2); i++) r.push(i)
  return r
})

function buildParams(extra = {}) {
  const p = { page: page.value, limit, ...extra }
  if (period.value) p.period = period.value
  if (period.value === 'custom') { p.date_from = dateFrom.value; p.date_to = dateTo.value }
  if (filter.value) p.workflow_status = filter.value
  return p
}

function statusTag(s) {
  return { submitted:'tag-blue', under_review:'tag-amber', approved:'tag-green', returned:'tag-red', draft:'tag-grey' }[s] || 'tag-grey'
}
function statusLabel(s) {
  return { submitted:'Submitted', under_review:'Under Review', approved:'✔ Approved', returned:'↩ Returned', draft:'Draft' }[s] || s
}
function fmtDate(d) {
  return new Date(d).toLocaleString('en-IN', { dateStyle:'medium', timeStyle:'short' })
}

function flash(msg, isError = false) {
  if (isError) { errorMsg.value = msg; successMsg.value = '' }
  else         { successMsg.value = msg; errorMsg.value = '' }
  setTimeout(() => { successMsg.value = ''; errorMsg.value = '' }, 4000)
}

async function loadStats() {
  try {
    const p = {}
    if (period.value) p.period = period.value
    if (period.value === 'custom') { p.date_from = dateFrom.value; p.date_to = dateTo.value }
    const { data } = await api.get('/workflow/my-stats', { params: p })
    stats.value = data.stats
  } catch (e) {
    console.error('my-stats error', e)
  }
}

async function loadQueue() {
  loading.value = true
  try {
    const { data } = await api.get('/workflow/my-queue', { params: buildParams() })
    rows.value  = data.data
    total.value = data.total
  } catch (e) {
    flash(e.response?.data?.message || 'Failed to load submissions', true)
  } finally {
    loading.value = false
  }
}

async function loadAll() {
  if (period.value === 'custom' && !dateFrom.value && !dateTo.value) return
  page.value = 1
  await Promise.all([loadQueue(), loadStats()])
}

function setPeriod(p) {
  period.value = p
  if (p !== 'custom') loadAll()
}

function setFilter(f) {
  filter.value = f
  page.value = 1
  loadQueue()
}

function changePage(p) {
  const pages = Math.ceil(total.value / limit)
  if (p < 1 || p > pages) return
  page.value = p
  loadQueue()
}

async function submitHH(h) {
  if (!confirm(`Submit ${h.household_id} — ${h.head_name} for review?`)) return
  submitting.value = h.household_id
  try {
    await api.post(`/workflow/${h.household_id}/submit`)
    flash(`${h.household_id} submitted for review successfully`)
    loadAll()
  } catch (e) {
    flash(e.response?.data?.message || 'Submit failed', true)
  } finally {
    submitting.value = ''
  }
}

onMounted(loadAll)
</script>

<style scoped>
/* Period filter */
.period-card  { padding: 14px 18px; }
.period-row   { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
.period-chips { display: flex; gap: 6px; flex-wrap: wrap; }
.period-chip  {
  padding: 5px 14px; border-radius: 20px; font-size: 12px; font-weight: 700;
  border: 1.5px solid #e5e7eb; background: #f9fafb; color: #6b7280;
  cursor: pointer; transition: all .15s;
}
.period-chip:hover  { border-color: #a7f3d0; background: #f0fdf4; color: #1b5e20; }
.period-chip.active { background: #1b5e20; color: white; border-color: #1b5e20; }
.custom-range { display: flex; align-items: center; gap: 8px; }
.date-input   { width: 140px; padding: 5px 10px; font-size: 13px; }
.range-sep    { color: #9ca3af; font-weight: 700; }

/* Stats strip */
.status-strip { display: flex; gap: 12px; margin-bottom: 18px; flex-wrap: wrap; }
.strip-chip   { display: flex; align-items: center; gap: 8px; padding: 10px 18px; border-radius: 10px; font-size: 13px; border: 1px solid rgba(0,0,0,.08); }
.strip-num    { font-size: 22px; font-weight: 800; }
.strip-label  { font-weight: 600; }
.chip-grey    { background: #f5f5f5; color: #616161; }
.chip-blue    { background: #e3f2fd; color: #0277bd; }
.chip-green   { background: #e8f5e9; color: #2e7d32; }
.chip-red     { background: #fce4ec; color: #c62828; }

/* Table */
.row-returned { background: #fff8f0 !important; }
.row-returned:hover { background: #ffefd5 !important; }
.comment-cell { font-size: 12px; color: #e65100; background: #fff3e0; border-radius: 6px; padding: 4px 8px; max-width: 240px; white-space: normal; }
.comment-icon { font-weight: 700; }
.btn-submit   { background: #e8f5e9; color: #2e7d32; border: 1.5px solid #a5d6a7; border-radius: 6px; padding: 4px 10px; font-size: 12px; font-weight: 700; cursor: pointer; }
.btn-submit:hover    { background: #c8e6c9; }
.btn-submit:disabled { opacity: .5; cursor: not-allowed; }
.table-footnote { padding: 10px 0 4px; font-size: 12px; color: #9ca3af; }
</style>
