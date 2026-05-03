<template>
  <div>
    <div class="breadcrumb">Home › <span>Ready for Review</span></div>
    <div class="page-header">
      <div>
        <div class="page-title">Ready for Review</div>
        <div class="page-sub">Household records submitted by enumerators awaiting your review</div>
      </div>
      <div class="count-chip">{{ total }} pending</div>
    </div>

    <div class="alert alert-success" v-if="successMsg">✅ {{ successMsg }}</div>
    <div class="alert alert-danger"  v-if="errorMsg">❌ {{ errorMsg }}</div>

    <div class="card">
      <div class="loading-center" v-if="loading"><div class="spinner"></div></div>

      <div class="table-wrap" v-else>
        <table class="data-table">
          <thead>
            <tr>
              <th>Household ID</th>
              <th>Head of HH</th>
              <th>Village / Block</th>
              <th>Submitted By</th>
              <th>Submitted At</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!rows.length">
              <td colspan="7">
                <div class="empty-state">
                  <span class="icon">✅</span>
                  <p>No records pending review</p>
                </div>
              </td>
            </tr>
            <tr v-for="h in rows" :key="h.household_id">
              <td><span class="id-badge">{{ h.household_id }}</span></td>
              <td><strong>{{ h.head_name }}</strong></td>
              <td>
                <div>{{ h.village_name }}</div>
                <div style="font-size:11px;color:var(--grey-500)">{{ h.block_name }}, {{ h.district_name }}</div>
              </td>
              <td>{{ h.submitted_by_name || '—' }}</td>
              <td style="font-size:12px;color:var(--grey-500)">
                {{ h.submitted_at ? new Date(h.submitted_at).toLocaleString('en-IN', { dateStyle:'medium', timeStyle:'short' }) : '—' }}
              </td>
              <td>
                <span :class="['tag', statusTag(h.workflow_status)]">{{ statusLabel(h.workflow_status) }}</span>
              </td>
              <td style="white-space:nowrap">
                <RouterLink :to="`/households/${h.household_id}/edit`" class="btn btn-outline btn-xs">View</RouterLink>
                <button class="btn btn-xs btn-approve" style="margin-left:4px" @click="approve(h)">✔ Approve</button>
                <button class="btn btn-xs btn-return"  style="margin-left:4px" @click="openReturn(h)">↩ Return</button>
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
    </div>

    <!-- Return for Clarification Modal -->
    <div class="modal-backdrop" v-if="returnModal.show" @click.self="closeReturnModal">
      <div class="modal" style="max-width:500px">
        <div class="modal-header">
          <div class="modal-title">↩ Return for Clarification</div>
          <button class="modal-close" @click="closeReturnModal">✕</button>
        </div>
        <div class="modal-body">
          <div class="alert alert-warning" style="margin-bottom:14px">
            Returning <strong>{{ returnModal.household?.household_id }}</strong> —
            {{ returnModal.household?.head_name }} to the enumerator.
          </div>
          <div class="form-group">
            <label class="form-label">Comment <span class="req">*</span></label>
            <textarea v-model="returnModal.comment" class="form-input"
                      rows="4" placeholder="Explain what needs to be corrected or clarified…"
                      style="resize:vertical"></textarea>
          </div>
          <div v-if="returnModal.error" class="alert alert-danger" style="margin-top:8px">{{ returnModal.error }}</div>
          <div class="modal-footer">
            <button class="btn btn-outline" @click="closeReturnModal">Cancel</button>
            <button class="btn btn-return" :disabled="returnModal.saving" @click="submitReturn">
              <span v-if="returnModal.saving" class="spinner" style="width:12px;height:12px;border-width:2px"></span>
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
import api from '../api'

const rows       = ref([])
const total      = ref(0)
const loading    = ref(true)
const page       = ref(1)
const limit      = 20
const successMsg = ref('')
const errorMsg   = ref('')

const returnModal = ref({ show: false, household: null, comment: '', saving: false, error: '' })

const pageRange = computed(() => {
  const pages = Math.ceil(total.value / limit)
  const p = page.value
  const r = []
  for (let i = Math.max(1, p - 2); i <= Math.min(pages, p + 2); i++) r.push(i)
  return r
})

function statusTag(s) {
  return { submitted:'tag-blue', under_review:'tag-amber', approved:'tag-green', returned:'tag-red', draft:'tag-grey' }[s] || 'tag-grey'
}
function statusLabel(s) {
  return { submitted:'Submitted', under_review:'Under Review', approved:'Approved', returned:'Returned', draft:'Draft' }[s] || s
}

function flash(msg, isError = false) {
  if (isError) { errorMsg.value = msg; successMsg.value = '' }
  else         { successMsg.value = msg; errorMsg.value = '' }
  setTimeout(() => { successMsg.value = ''; errorMsg.value = '' }, 4000)
}

async function load() {
  loading.value = true
  try {
    const { data } = await api.get('/workflow/review-queue', { params: { page: page.value, limit } })
    rows.value  = data.data
    total.value = data.total
  } catch (e) {
    flash(e.response?.data?.message || 'Failed to load queue', true)
  } finally {
    loading.value = false
  }
}

function changePage(p) {
  const pages = Math.ceil(total.value / limit)
  if (p < 1 || p > pages) return
  page.value = p
  load()
}

async function approve(h) {
  if (!confirm(`Approve household ${h.household_id} — ${h.head_name}?`)) return
  try {
    await api.post(`/workflow/${h.household_id}/approve`)
    flash(`Household ${h.household_id} approved successfully`)
    load()
  } catch (e) {
    flash(e.response?.data?.message || 'Approve failed', true)
  }
}

function openReturn(h) {
  returnModal.value = { show: true, household: h, comment: '', saving: false, error: '' }
}

function closeReturnModal() {
  returnModal.value = { show: false, household: null, comment: '', saving: false, error: '' }
}

async function submitReturn() {
  if (!returnModal.value.comment.trim()) {
    returnModal.value.error = 'Please enter a comment explaining what needs to be corrected.'
    return
  }
  returnModal.value.saving = true
  returnModal.value.error  = ''
  try {
    await api.post(`/workflow/${returnModal.value.household.household_id}/return`, {
      comment: returnModal.value.comment.trim(),
    })
    flash(`Household ${returnModal.value.household.household_id} returned to enumerator`)
    closeReturnModal()
    load()
  } catch (e) {
    returnModal.value.error = e.response?.data?.message || 'Return failed'
  } finally {
    returnModal.value.saving = false
  }
}

onMounted(load)
</script>

<style scoped>
.count-chip { background:#e3f2fd;color:#0288d1;border-radius:20px;padding:4px 14px;font-size:13px;font-weight:700; }
.btn-approve { background:#e8f5e9;color:#2e7d32;border:1.5px solid #a5d6a7;border-radius:6px;padding:4px 10px;font-size:12px;font-weight:700;cursor:pointer; }
.btn-approve:hover { background:#c8e6c9; }
.btn-return  { background:#fff3e0;color:#e65100;border:1.5px solid #ffcc80;border-radius:6px;padding:4px 10px;font-size:12px;font-weight:700;cursor:pointer; }
.btn-return:hover { background:#ffe0b2; }
.modal-backdrop { position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:1000;display:flex;align-items:center;justify-content:center; }
.modal { background:white;border-radius:12px;width:90%;max-width:480px;box-shadow:0 8px 32px rgba(0,0,0,.2); }
.modal-header { display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid #eee; }
.modal-title  { font-size:16px;font-weight:700; }
.modal-close  { background:none;border:none;font-size:18px;cursor:pointer;color:var(--grey-500); }
.modal-body   { padding:20px; }
.modal-footer { display:flex;justify-content:flex-end;gap:8px;margin-top:16px; }
</style>
