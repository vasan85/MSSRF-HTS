<template>
  <div>
    <div class="breadcrumb">Home › <span>User Roles &amp; Access</span></div>
    <div class="page-header">
      <div><div class="page-title">User Roles &amp; Access</div><div class="page-sub">Manage system users, roles, and permissions</div></div>
      <button class="btn btn-primary btn-sm" @click="openAddModal">＋ Add User</button>
    </div>

    <!-- Alerts -->
    <div class="alert alert-success" v-if="successMsg">✅ {{ successMsg }}</div>
    <div class="alert alert-danger"  v-if="errorMsg">❌ {{ errorMsg }}</div>

    <!-- ── USER TABLE ─────────────────────────────────────── -->
    <div class="card">
      <div class="card-header">
        <div><div class="card-title">👥 System Users</div><div class="card-sub">{{ users.length }} registered users</div></div>
      </div>

      <div class="loading-center" v-if="loading"><div class="spinner"></div></div>

      <div class="table-wrap" v-else>
        <table class="data-table">
          <thead>
            <tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th><th>Created</th><th>Actions</th></tr>
          </thead>
          <tbody>
            <tr v-if="!users.length">
              <td colspan="6"><div class="empty-state"><span class="icon">👤</span><p>No users found</p></div></td>
            </tr>
            <tr v-for="u in users" :key="u.id" :class="{ 'row-blocked': u.is_blocked }">
              <td><span class="id-badge">{{ u.id }}</span></td>
              <td>
                <div style="display:flex;align-items:center;gap:8px">
                  <strong>{{ u.name }}</strong>
                  <span v-if="u.is_blocked" class="tag tag-xs" style="background:#fee2e2;color:#dc2626;border:1px solid #fca5a5"
                        :title="u.blocked_reason || 'Blocked'">🔒 Blocked</span>
                </div>
              </td>
              <td style="color:var(--grey-500);font-size:13px">{{ u.email }}</td>
              <td><span :class="['tag', roleTag(u.role)]">{{ roleLabel(u.role) }}</span></td>
              <td style="font-size:12px;color:var(--grey-400)">{{ u.created_at?.slice(0,10) }}</td>
              <td>
                <div style="display:flex;gap:6px;flex-wrap:wrap">
                  <button v-if="auth.isAdmin || (auth.isMISHead && ['enumerator','mis_reviewer'].includes(u.role))"
                          class="btn btn-outline btn-xs" @click="openEditModal(u)">✏️ Edit</button>
                  <button v-if="auth.isAdmin || (auth.isMISHead && ['enumerator','mis_reviewer'].includes(u.role))"
                          class="btn btn-outline btn-xs" @click="openPwdModal(u)">🔑 Pwd</button>
                  <!-- Block / Unblock — admin only, cannot block self or other admins -->
                  <template v-if="auth.isAdmin && u.id !== currentUserId && u.role !== 'admin'">
                    <button v-if="!u.is_blocked"
                            class="btn btn-xs" style="background:#fff7ed;color:#c2410c;border:1.5px solid #fed7aa;font-weight:700"
                            @click="openBlockModal(u)">🔒 Block</button>
                    <button v-else
                            class="btn btn-xs" style="background:#f0fdf4;color:#15803d;border:1.5px solid #86efac;font-weight:700"
                            @click="unblockUser(u)">🔓 Unblock</button>
                  </template>
                  <button v-if="auth.isAdmin"
                          class="btn btn-xs" style="background:var(--red-pale);color:var(--red);border:1px solid var(--red)"
                          @click="confirmDelete(u)" :disabled="u.id === currentUserId">🗑️</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ── BLOCK USER MODAL ──────────────────────────────────── -->
    <div class="modal-backdrop" v-if="blockModal.show" @click.self="blockModal.show=false">
      <div class="modal">
        <div class="modal-header">
          <div class="modal-title">🔒 Temporarily Block User</div>
          <button class="modal-close" @click="blockModal.show=false">✕</button>
        </div>
        <div class="modal-body">
          <div class="alert alert-warning" style="margin-bottom:4px">
            Blocking <strong>{{ blockModal.user?.name }}</strong> will immediately prevent them from
            accessing the system. You can unblock them at any time.
          </div>
          <div class="form-group">
            <label class="form-label">Reason (optional)</label>
            <input v-model="blockModal.reason" class="form-input"
                   placeholder="e.g. Suspected data integrity issue, on leave…" />
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline" @click="blockModal.show=false">Cancel</button>
            <button class="btn btn-sm" style="background:#dc2626;color:white;border:none;padding:8px 18px;border-radius:6px;font-weight:700;cursor:pointer"
                    :disabled="blockModal.saving" @click="confirmBlock">
              <span v-if="blockModal.saving" class="spinner" style="width:12px;height:12px;border-width:2px"></span>
              <span v-else>🔒 Block User</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ── CACHE MANAGEMENT (admin only) ──────────────────── -->
    <div class="card" v-if="auth.isAdmin">
      <div class="card-header">
        <div>
          <div class="card-title">⚡ Cache Management</div>
          <div class="card-sub">Server-side in-memory cache for dashboards, masters, and reports</div>
        </div>
        <button class="btn btn-sm" style="background:#fff7ed;color:#c2410c;border:1.5px solid #fed7aa;font-weight:700"
                @click="loadCacheStats" :disabled="cacheLoading">
          {{ cacheLoading ? '…' : '↻ Refresh Stats' }}
        </button>
      </div>

      <div class="cache-grid" v-if="cacheStats">
        <div class="cache-stat-card">
          <div class="cs-value">{{ cacheStats.active }}</div>
          <div class="cs-label">Active Entries</div>
        </div>
        <div class="cache-stat-card">
          <div class="cs-value">{{ cacheStats.total }}</div>
          <div class="cs-label">Total Keys</div>
        </div>
        <div class="cache-stat-card cs-last">
          <div class="cs-value cs-ts">{{ cacheLastRefreshed }}</div>
          <div class="cs-label">Last Checked</div>
        </div>
      </div>
      <div v-else-if="!cacheLoading" class="cache-empty">
        Click "Refresh Stats" to load current cache state.
      </div>

      <div class="cache-actions">
        <div class="cache-action-group">
          <div class="ca-label">Dashboard &amp; KPI cache</div>
          <div class="ca-desc">Executive dashboard, village coverage, project stats</div>
          <button class="btn btn-outline btn-sm ca-btn" @click="clearCache('dashboard:')" :disabled="clearingCache">
            🗑️ Clear Dashboard Cache
          </button>
        </div>
        <div class="cache-action-group">
          <div class="ca-label">Masters / Geo cache</div>
          <div class="ca-desc">States, districts, blocks, villages dropdowns</div>
          <button class="btn btn-outline btn-sm ca-btn" @click="clearCache('masters:')" :disabled="clearingCache">
            🗑️ Clear Masters Cache
          </button>
        </div>
        <div class="cache-action-group ca-all">
          <div class="ca-label">Clear entire cache</div>
          <div class="ca-desc">Forces all data to be re-fetched from the database on next request</div>
          <button class="btn btn-sm ca-btn"
                  style="background:#dc2626;color:white;border:none;font-weight:700"
                  @click="clearCache(null)" :disabled="clearingCache">
            <span v-if="clearingCache" class="spinner" style="width:12px;height:12px;border-width:2px;border-color:rgba(255,255,255,.4);border-top-color:white"></span>
            <span v-else>⚠️ Clear All Cache</span>
          </button>
        </div>
      </div>
      <div class="alert alert-success" v-if="cacheMsg" style="margin:12px 0 0">✅ {{ cacheMsg }}</div>
    </div>

    <!-- ── TEST DATA MANAGEMENT (admin only) ────────────── -->
    <div class="card" v-if="auth.isAdmin">
      <div class="card-header">
        <div>
          <div class="card-title">🧪 Test Data Management</div>
          <div class="card-sub">Generate or clear dummy household records for testing purposes</div>
        </div>
        <div class="td-count-badge" v-if="dummyCount !== null">
          <span class="td-count-num">{{ dummyCount }}</span>
          <span class="td-count-lbl">dummy records</span>
        </div>
      </div>

      <div class="td-body">
        <!-- Generate panel -->
        <div class="td-panel td-panel-generate">
          <div class="td-panel-icon">📊</div>
          <div class="td-panel-title">Generate Sample Data</div>
          <div class="td-panel-desc">
            Creates realistic dummy household records with your chosen workflow status.
            Records are tagged and can be removed at any time without affecting real data.
          </div>
          <div class="td-controls">
            <label class="form-label">Workflow Status</label>
            <div class="td-status-grid">
              <button v-for="s in dummyStatuses" :key="s.value"
                      :class="['td-status-btn', s.cls, { active: dummyGenStatus === s.value }]"
                      @click="dummyGenStatus = s.value">
                <span class="td-status-dot"></span>
                {{ s.label }}
              </button>
            </div>
            <label class="form-label" style="margin-top:10px">Number of records</label>
            <div class="td-num-row">
              <input v-model.number="dummyGenCount" type="number" min="1" max="200"
                     class="form-input td-num-input" />
              <div class="td-quick-btns">
                <button v-for="n in [5,10,25,50]" :key="n" class="td-quick"
                        :class="{ active: dummyGenCount === n }"
                        @click="dummyGenCount = n">{{ n }}</button>
              </div>
            </div>
            <button class="btn btn-primary btn-sm td-action-btn"
                    @click="generateDummy" :disabled="dummyGenerating">
              <span v-if="dummyGenerating" class="spinner" style="width:13px;height:13px;border-width:2px;border-color:rgba(255,255,255,.3);border-top-color:white"></span>
              <span v-else>✚ Generate {{ dummyGenCount }} {{ dummyStatusLabel }} Records</span>
            </button>
          </div>
        </div>

        <!-- Clear panel -->
        <div class="td-panel td-panel-clear">
          <div class="td-panel-icon">🗑️</div>
          <div class="td-panel-title">Clear Dummy Data</div>
          <div class="td-panel-desc">
            Permanently deletes all records tagged as dummy/test data including any linked
            household members and project associations. Real household data is never affected.
          </div>
          <div class="td-controls">
            <div class="td-clear-info" v-if="dummyCount !== null">
              <span v-if="dummyCount === 0">No dummy records currently in the system.</span>
              <span v-else>{{ dummyCount }} dummy record{{ dummyCount !== 1 ? 's' : '' }} will be permanently deleted.</span>
            </div>
            <button class="btn btn-sm td-action-btn td-clear-btn"
                    @click="clearDummy" :disabled="dummyClearing || dummyCount === 0">
              <span v-if="dummyClearing" class="spinner" style="width:13px;height:13px;border-width:2px;border-color:rgba(255,255,255,.3);border-top-color:white"></span>
              <span v-else>🗑️ Clear All Dummy Records</span>
            </button>
          </div>
        </div>
      </div>

      <div class="alert alert-success" v-if="dummyMsg" style="margin:12px 0 0">✅ {{ dummyMsg }}</div>
      <div class="alert alert-danger"  v-if="dummyErr" style="margin:12px 0 0">❌ {{ dummyErr }}</div>
    </div>

    <!-- ── PERMISSION MATRIX ─────────────────────────────── -->
    <div class="card">
      <div class="card-header"><div class="card-title">🛡️ Permission Matrix</div></div>
      <div class="table-wrap">
        <table class="rbac-table">
          <thead>
            <tr>
              <th>Module / Feature</th>
              <th>🛡️ Admin</th><th>👔 MIS Head</th><th>✅ MIS Reviewer</th><th>📝 Enumerator</th><th>📊 M&amp;E</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in matrix" :key="row.feature" :style="row.wf ? { background:'#f3e5f5' } : row.gis ? { background:'var(--teal-pale)' } : {}">
              <td>{{ row.feature }}</td>
              <td v-for="r in ['admin','mishead','reviewer','enum','me']" :key="r">
                <span v-if="row[r]==='full'" class="ck-yes">✔</span>
                <span v-else-if="row[r]==='part'" class="ck-part">{{ row[r+'_note'] || '△' }}</span>
                <span v-else class="ck-no">—</span>
              </td>
            </tr>
          </tbody>
        </table>
        <div style="margin-top:10px;font-size:12px;color:var(--grey-500)">
          ✔ Full &nbsp;·&nbsp; △ Partial / conditional &nbsp;·&nbsp; — No access &nbsp;·&nbsp;
          <span style="background:var(--teal-pale);padding:2px 6px;border-radius:4px;color:#00695c">🗺️ GIS rows highlighted</span>
        </div>
      </div>
    </div>

    <!-- ── ADD USER MODAL ──────────────────────────────────── -->
    <div class="modal-backdrop" v-if="modal.show" @click.self="closeModal">
      <div class="modal">
        <div class="modal-header">
          <div class="modal-title">{{ modal.title }}</div>
          <button class="modal-close" @click="closeModal">✕</button>
        </div>

        <!-- Add User -->
        <div v-if="modal.mode === 'add'" class="modal-body">
          <div class="form-group">
            <label class="form-label">Full Name <span class="req">*</span></label>
            <input v-model="userForm.name" class="form-input" placeholder="e.g. Priya Kumari" />
          </div>
          <div class="form-group">
            <label class="form-label">Email <span class="req">*</span></label>
            <input v-model="userForm.email" type="email" class="form-input" placeholder="user@mssrf.org" />
          </div>
          <div class="form-group">
            <label class="form-label">Role <span class="req">*</span></label>
            <select v-model="userForm.role" class="form-select">
              <option value="">— Select Role —</option>
              <option v-if="auth.isAdmin" value="admin">🛡️ Admin</option>
              <option value="enumerator">📝 Field Enumerator</option>
              <option v-if="auth.isAdmin" value="me">📊 M&amp;E Team</option>
              <option value="mis_reviewer">✅ MIS Reviewer</option>
              <option v-if="auth.isAdmin" value="mis_head">👔 MIS Head</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Password <span class="req">*</span></label>
            <input v-model="userForm.password" type="password" class="form-input" placeholder="Min 6 characters" />
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline" @click="closeModal">Cancel</button>
            <button class="btn btn-primary" :disabled="modalSaving" @click="saveUser">
              <span v-if="modalSaving" class="spinner" style="width:12px;height:12px;border-width:2px"></span>
              <span v-else>💾 Create User</span>
            </button>
          </div>
        </div>

        <!-- Edit User (name + role only) -->
        <div v-if="modal.mode === 'edit'" class="modal-body">
          <div class="alert alert-info" style="margin-bottom:14px">
            Editing user <strong>{{ modal.user?.email }}</strong>. Use Reset Password to change the password separately.
          </div>
          <div class="form-group">
            <label class="form-label">Full Name <span class="req">*</span></label>
            <input v-model="userForm.name" class="form-input" />
          </div>
          <div class="form-group">
            <label class="form-label">Role <span class="req">*</span></label>
            <select v-model="userForm.role" class="form-select">
              <option v-if="auth.isAdmin" value="admin">🛡️ Admin</option>
              <option value="enumerator">📝 Field Enumerator</option>
              <option v-if="auth.isAdmin" value="me">📊 M&amp;E Team</option>
              <option value="mis_reviewer">✅ MIS Reviewer</option>
              <option v-if="auth.isAdmin" value="mis_head">👔 MIS Head</option>
            </select>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline" @click="closeModal">Cancel</button>
            <button class="btn btn-primary" :disabled="modalSaving" @click="updateUser">
              <span v-if="modalSaving" class="spinner" style="width:12px;height:12px;border-width:2px"></span>
              <span v-else>💾 Update User</span>
            </button>
          </div>
        </div>

        <!-- Reset Password -->
        <div v-if="modal.mode === 'password'" class="modal-body">
          <div class="alert alert-warning" style="margin-bottom:14px">
            Resetting password for <strong>{{ modal.user?.name }}</strong> ({{ modal.user?.email }})
          </div>
          <div class="form-group">
            <label class="form-label">New Password <span class="req">*</span></label>
            <input v-model="userForm.new_password" type="password" class="form-input" placeholder="Min 6 characters" />
          </div>
          <div class="form-group">
            <label class="form-label">Confirm Password <span class="req">*</span></label>
            <input v-model="userForm.confirm_password" type="password" class="form-input" placeholder="Repeat password" />
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline" @click="closeModal">Cancel</button>
            <button class="btn btn-primary" :disabled="modalSaving" @click="resetPassword">
              <span v-if="modalSaving" class="spinner" style="width:12px;height:12px;border-width:2px"></span>
              <span v-else>🔑 Reset Password</span>
            </button>
          </div>
        </div>

        <!-- Confirm Delete -->
        <div v-if="modal.mode === 'delete'" class="modal-body">
          <div class="alert alert-danger">
            ⚠️ Are you sure you want to delete user <strong>{{ modal.user?.name }}</strong>?
            This cannot be undone.
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline" @click="closeModal">Cancel</button>
            <button class="btn btn-sm" style="background:var(--red);color:white;border:none;padding:8px 18px;border-radius:6px;font-weight:700;cursor:pointer"
                    :disabled="modalSaving" @click="deleteUser">
              <span v-if="modalSaving" class="spinner" style="width:12px;height:12px;border-width:2px"></span>
              <span v-else>🗑️ Delete User</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════════
         DPDPA PRIVACY DASHBOARD (admin only)
    ══════════════════════════════════════════════════ -->
    <template v-if="authStore.role === 'admin'">

      <!-- Privacy KPI tiles -->
      <div class="page-header" style="margin-top:28px">
        <div><div class="page-title">🛡️ Data Protection & Privacy</div><div class="page-sub">DPDPA 2023 compliance dashboard</div></div>
        <button class="btn btn-outline btn-sm" @click="loadPrivacyStats">↺ Refresh</button>
      </div>

      <div class="stat-grid stat-grid-4" v-if="privacyStats" style="margin-bottom:18px">
        <div class="stat-tile green">
          <div class="stat-icon">✅</div>
          <div class="stat-value">{{ privacyStats.consented_hh }}</div>
          <div class="stat-label">Consented Households</div>
        </div>
        <div class="stat-tile amber">
          <div class="stat-icon">⏳</div>
          <div class="stat-value">{{ privacyStats.pending_consent }}</div>
          <div class="stat-label">Pending Consent</div>
        </div>
        <div class="stat-tile purple">
          <div class="stat-icon">🗑️</div>
          <div class="stat-value">{{ privacyStats.anonymized_hh }}</div>
          <div class="stat-label">Anonymized Records</div>
        </div>
        <div class="stat-tile blue">
          <div class="stat-icon">📤</div>
          <div class="stat-value">{{ privacyStats.total_exports }}</div>
          <div class="stat-label">Data Exports Logged</div>
        </div>
      </div>

      <!-- Anonymize household -->
      <div class="card" style="margin-bottom:18px">
        <div class="card-header">
          <div class="card-title">🗑️ Right to Erasure — Anonymize Household</div>
        </div>
        <div style="padding:16px;display:flex;flex-direction:column;gap:12px">
          <p style="font-size:13px;color:var(--grey-600)">
            Anonymizes all directly identifiable fields (name, mobile, GPS) of a household while preserving statistical data for reporting. This action is irreversible and is logged in the audit trail.
          </p>
          <div style="display:flex;gap:10px;flex-wrap:wrap">
            <input v-model="anonId" class="form-input" placeholder="Household ID (e.g. TN-V01-HH0001)" style="max-width:280px"/>
            <input v-model="anonReason" class="form-input" placeholder="Reason for anonymization (required)" style="flex:1;min-width:200px"/>
            <button class="btn btn-danger" :disabled="anonBusy || !anonId || !anonReason" @click="anonymize">
              <span v-if="anonBusy" class="spinner" style="width:14px;height:14px;border-width:2px"></span>
              Anonymize
            </button>
          </div>
          <div class="alert alert-success" v-if="anonSuccess" style="margin:0">✅ {{ anonSuccess }}</div>
          <div class="alert alert-danger"  v-if="anonError"   style="margin:0">❌ {{ anonError }}</div>
        </div>
      </div>

      <!-- Consent log table -->
      <div class="card" style="margin-bottom:18px">
        <div class="card-header">
          <div class="card-title">📋 Consent Log</div>
          <span style="font-size:12px;color:var(--grey-500)">{{ consentLog.length }} records</span>
        </div>
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th>Household</th><th>Village</th><th>Enumerator</th><th>Language</th><th>Method</th><th>Date</th><th>Status</th></tr></thead>
            <tbody>
              <tr v-if="!consentLog.length"><td colspan="7"><div class="empty-state"><span class="icon">📋</span><p>No consent records</p></div></td></tr>
              <tr v-for="c in consentLog" :key="c.id">
                <td><span class="id-badge">{{ c.household_id }}</span></td>
                <td>{{ c.village_name || '—' }}</td>
                <td>{{ c.enumerator_name }}</td>
                <td>{{ c.consent_language }}</td>
                <td><span class="tag tag-teal">{{ c.consent_method }}</span></td>
                <td>{{ c.recorded_at?.slice(0,10) }}</td>
                <td>
                  <span v-if="c.is_anonymized" class="tag tag-red">Anonymized</span>
                  <span v-else class="tag tag-green">Active</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Data export audit -->
      <div class="card">
        <div class="card-header"><div class="card-title">📤 Data Export Audit Log</div></div>
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th>Date/Time</th><th>User</th><th>Role</th><th>Detail</th></tr></thead>
            <tbody>
              <tr v-if="!exportLogs.length"><td colspan="4"><div class="empty-state"><span class="icon">📤</span><p>No exports logged</p></div></td></tr>
              <tr v-for="e in exportLogs" :key="e.id">
                <td>{{ e.created_at?.slice(0,16).replace('T',' ') }}</td>
                <td>{{ e.user_name }}</td>
                <td><span class="tag tag-blue">{{ e.role }}</span></td>
                <td style="font-size:11px;max-width:360px;word-break:break-word">{{ e.detail }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </template>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import api from '../api'

const authStore = useAuthStore()

const auth          = useAuthStore()
const currentUserId = computed(() => auth.user?.id)

// ── Block / Unblock ───────────────────────────────────────────
const blockModal = ref({ show: false, user: null, reason: '', saving: false })

function openBlockModal(u) {
  blockModal.value = { show: true, user: u, reason: '', saving: false }
}

async function confirmBlock() {
  blockModal.value.saving = true
  try {
    await api.post(`/users/${blockModal.value.user.id}/block`, { reason: blockModal.value.reason })
    flash(`${blockModal.value.user.name} has been blocked`)
    blockModal.value.show = false
    await loadUsers()
  } catch (e) {
    errorMsg.value = e.response?.data?.message || 'Failed to block user'
  } finally { blockModal.value.saving = false }
}

async function unblockUser(u) {
  try {
    await api.post(`/users/${u.id}/unblock`)
    flash(`${u.name} has been unblocked`)
    await loadUsers()
  } catch (e) {
    flash(e.response?.data?.message || 'Failed to unblock user', true)
  }
}

// ── Cache management ──────────────────────────────────────────
const cacheStats        = ref(null)
const cacheLoading      = ref(false)
const clearingCache     = ref(false)
const cacheMsg          = ref('')
const cacheLastRefreshed = ref('')

async function loadCacheStats() {
  cacheLoading.value = true
  try {
    const { data } = await api.get('/_cache/stats')
    cacheStats.value = data
    cacheLastRefreshed.value = new Date().toLocaleTimeString('en-IN')
  } catch (e) {
    flash('Failed to load cache stats', true)
  } finally { cacheLoading.value = false }
}

async function clearCache(prefix) {
  clearingCache.value = true
  cacheMsg.value = ''
  try {
    const params = prefix ? { prefix } : {}
    await api.delete('/_cache', { params })
    cacheMsg.value = prefix
      ? `Cache cleared for "${prefix}" (${new Date().toLocaleTimeString('en-IN')})`
      : `Entire cache cleared (${new Date().toLocaleTimeString('en-IN')})`
    await loadCacheStats()
    setTimeout(() => { cacheMsg.value = '' }, 4000)
  } catch (e) {
    flash('Failed to clear cache', true)
  } finally { clearingCache.value = false }
}

const users      = ref([])
const loading    = ref(true)
const saving     = ref(false)
const successMsg = ref('')
const errorMsg   = ref('')
const modalSaving= ref(false)

const modal    = ref({ show: false, mode: '', title: '', user: null })
const userForm = ref({})

// ── Permission matrix ─────────────────────────────────────────
const matrix = [
  { feature:'Executive Dashboard',      admin:'full', mishead:'full', reviewer:'full',  enum:'none', me:'full' },
  { feature:'Village / Project Dash',   admin:'full', mishead:'full', reviewer:'none',  enum:'none', me:'full' },
  { feature:'Household — View',         admin:'full', mishead:'full', reviewer:'full',  enum:'part', enum_note:'Own only', me:'none' },
  { feature:'Household — Add',          admin:'full', mishead:'none', reviewer:'none',  enum:'full', me:'none' },
  { feature:'Household — Edit',         admin:'full', mishead:'none', reviewer:'full',  enum:'part', enum_note:'Own+Draft', me:'none' },
  { feature:'Household — Delete',       admin:'full', mishead:'none', reviewer:'none',  enum:'none', me:'none' },
  { feature:'Submit for Review',        admin:'none', mishead:'none', reviewer:'none',  enum:'full', me:'none', wf:true },
  { feature:'Review Queue',             admin:'full', mishead:'none', reviewer:'full',  enum:'none', me:'none', wf:true },
  { feature:'Approve / Return Records', admin:'full', mishead:'none', reviewer:'full',  enum:'none', me:'none', wf:true },
  { feature:'Project Master',           admin:'full', mishead:'none', reviewer:'none',  enum:'none', me:'none' },
  { feature:'Project Linking',          admin:'full', mishead:'none', reviewer:'none',  enum:'full', me:'none' },
  { feature:'🗺️ GIS Coverage Map',      admin:'full', mishead:'full', reviewer:'none',  enum:'none', me:'full', gis:true },
  { feature:'📍 HH Location Plot',      admin:'full', mishead:'full', reviewer:'none',  enum:'none', me:'full', gis:true },
  { feature:'Reports — View / Export',  admin:'full', mishead:'full', reviewer:'none',  enum:'none', me:'full' },
  { feature:'Master Data',              admin:'full', mishead:'none', reviewer:'none',  enum:'none', me:'none' },
  { feature:'User Management',          admin:'full', mishead:'part', mishead_note:'Enum/Reviewer', reviewer:'none', enum:'none', me:'none' },
  { feature:'Audit Log',                admin:'full', mishead:'full', reviewer:'none',  enum:'none', me:'full' },
]

// ── Helpers ───────────────────────────────────────────────────
const roleTag   = r => ({ admin:'tag-amber', enumerator:'tag-green', me:'tag-purple', mis_reviewer:'tag-teal', mis_head:'tag-grey' }[r] || 'tag-grey')
const roleLabel = r => ({ admin:'Admin', enumerator:'Enumerator', me:'M&E Team', mis_reviewer:'MIS Reviewer', mis_head:'MIS Head' }[r] || r)

function flash(msg, isError = false) {
  if (isError) { errorMsg.value = msg; successMsg.value = '' }
  else         { successMsg.value = msg; errorMsg.value = '' }
  setTimeout(() => { successMsg.value = ''; errorMsg.value = '' }, 3500)
}

// ── Load ──────────────────────────────────────────────────────
async function loadUsers() {
  loading.value = true
  try {
    const { data } = await api.get('/users')
    users.value = data
  } catch (e) {
    flash(e.response?.data?.message || 'Failed to load users', true)
  } finally {
    loading.value = false
  }
}

// ── Modal helpers ─────────────────────────────────────────────
function openAddModal() {
  userForm.value = { name:'', email:'', role:'', password:'' }
  modal.value    = { show:true, mode:'add', title:'Add New User', user:null }
  errorMsg.value = ''
}

function openEditModal(u) {
  userForm.value = { name: u.name, role: u.role }
  modal.value    = { show:true, mode:'edit', title:'Edit User', user: u }
  errorMsg.value = ''
}

function openPwdModal(u) {
  userForm.value = { new_password:'', confirm_password:'' }
  modal.value    = { show:true, mode:'password', title:'Reset Password', user: u }
  errorMsg.value = ''
}

function confirmDelete(u) {
  modal.value = { show:true, mode:'delete', title:'Confirm Delete', user: u }
}

function closeModal() {
  modal.value = { show:false, mode:'', title:'', user:null }
  userForm.value = {}
  errorMsg.value = ''
}

// ── CRUD actions ──────────────────────────────────────────────
async function saveUser() {
  const f = userForm.value
  if (!f.name || !f.email || !f.role || !f.password)
    return (errorMsg.value = 'All fields are required')
  if (f.password.length < 6)
    return (errorMsg.value = 'Password must be at least 6 characters')
  modalSaving.value = true
  try {
    await api.post('/users', f)
    flash(`User ${f.name} created successfully`)
    closeModal()
    await loadUsers()
  } catch (e) {
    errorMsg.value = e.response?.data?.message || 'Failed to create user'
  } finally { modalSaving.value = false }
}

async function updateUser() {
  const f = userForm.value
  if (!f.name || !f.role) return (errorMsg.value = 'Name and role are required')
  modalSaving.value = true
  try {
    await api.put(`/users/${modal.value.user.id}`, f)
    flash('User updated successfully')
    closeModal()
    await loadUsers()
  } catch (e) {
    errorMsg.value = e.response?.data?.message || 'Failed to update user'
  } finally { modalSaving.value = false }
}

async function resetPassword() {
  const f = userForm.value
  if (!f.new_password || f.new_password.length < 6)
    return (errorMsg.value = 'Password must be at least 6 characters')
  if (f.new_password !== f.confirm_password)
    return (errorMsg.value = 'Passwords do not match')
  modalSaving.value = true
  try {
    await api.post(`/users/${modal.value.user.id}/reset-password`, { new_password: f.new_password })
    flash('Password reset successfully')
    closeModal()
  } catch (e) {
    errorMsg.value = e.response?.data?.message || 'Failed to reset password'
  } finally { modalSaving.value = false }
}

async function deleteUser() {
  modalSaving.value = true
  try {
    await api.delete(`/users/${modal.value.user.id}`)
    flash(`User ${modal.value.user.name} deleted`)
    closeModal()
    await loadUsers()
  } catch (e) {
    errorMsg.value = e.response?.data?.message || 'Failed to delete user'
  } finally { modalSaving.value = false }
}

// ── Dummy data management ─────────────────────────────────────
const dummyStatuses = [
  { value: 'random',       label: 'Mixed (Random)',  cls: 'tds-mixed'    },
  { value: 'draft',        label: 'Draft',           cls: 'tds-draft'    },
  { value: 'submitted',    label: 'Submitted',       cls: 'tds-submitted'},
  { value: 'under_review', label: 'Under Review',    cls: 'tds-review'   },
  { value: 'approved',     label: 'Approved',        cls: 'tds-approved' },
  { value: 'returned',     label: 'Returned',        cls: 'tds-returned' },
]

const dummyCount      = ref(null)
const dummyGenCount   = ref(10)
const dummyGenStatus  = ref('random')
const dummyGenerating = ref(false)
const dummyClearing   = ref(false)
const dummyMsg        = ref('')
const dummyErr        = ref('')

const dummyStatusLabel = computed(() =>
  dummyStatuses.find(s => s.value === dummyGenStatus.value)?.label || ''
)

async function loadDummyCount() {
  try {
    const { data } = await api.get('/admin/dummy-data/count')
    dummyCount.value = data.count
  } catch (e) {
    console.error('dummy count error', e)
  }
}

async function generateDummy() {
  const label = dummyStatusLabel.value
  if (!confirm(`Generate ${dummyGenCount.value} dummy household records with status: ${label}?`)) return
  dummyGenerating.value = true
  dummyMsg.value = ''
  dummyErr.value = ''
  try {
    const { data } = await api.post('/admin/dummy-data', {
      count: dummyGenCount.value,
      status: dummyGenStatus.value,
    })
    dummyMsg.value = `Successfully generated ${data.inserted} "${label}" dummy records.`
    await loadDummyCount()
    setTimeout(() => { dummyMsg.value = '' }, 5000)
  } catch (e) {
    dummyErr.value = e.response?.data?.message || 'Failed to generate dummy data'
    setTimeout(() => { dummyErr.value = '' }, 5000)
  } finally { dummyGenerating.value = false }
}

async function clearDummy() {
  if (!confirm(`Delete all ${dummyCount.value} dummy household records? This cannot be undone.`)) return
  dummyClearing.value = true
  dummyMsg.value = ''
  dummyErr.value = ''
  try {
    const { data } = await api.delete('/admin/dummy-data')
    dummyMsg.value = `Successfully deleted ${data.deleted} dummy records.`
    dummyCount.value = 0
    setTimeout(() => { dummyMsg.value = '' }, 5000)
  } catch (e) {
    dummyErr.value = e.response?.data?.message || 'Failed to clear dummy data'
    setTimeout(() => { dummyErr.value = '' }, 5000)
  } finally { dummyClearing.value = false }
}

// ── Privacy / DPDPA ──────────────────────────────────────────
const privacyStats = ref(null)
const consentLog   = ref([])
const exportLogs   = ref([])
const anonId       = ref('')
const anonReason   = ref('')
const anonBusy     = ref(false)
const anonSuccess  = ref('')
const anonError    = ref('')

async function loadPrivacyStats() {
  try {
    const [{ data: stats }, { data: cl }, { data: el }] = await Promise.all([
      api.get('/privacy/stats'),
      api.get('/privacy/consent-log', { params: { limit: 50 } }),
      api.get('/audit', { params: { module: 'Privacy', action: 'DATA_EXPORT', limit: 50 } }),
    ])
    privacyStats.value = stats
    consentLog.value   = cl.data
    exportLogs.value   = el.data
  } catch (e) { console.error('Privacy stats error:', e.message) }
}

async function anonymize() {
  anonBusy.value = true; anonSuccess.value = ''; anonError.value = ''
  try {
    await api.post(`/privacy/anonymize/${anonId.value}`, { reason: anonReason.value })
    anonSuccess.value = `Household ${anonId.value} has been anonymized.`
    anonId.value = ''; anonReason.value = ''
    await loadPrivacyStats()
  } catch (e) {
    anonError.value = e.response?.data?.message || 'Anonymization failed'
  } finally { anonBusy.value = false }
}

onMounted(() => {
  loadUsers()
  if (auth.isAdmin) {
    loadCacheStats()
    loadDummyCount()
    loadPrivacyStats()
  }
})
</script>

<style scoped>
/* Role-coloured tags */
:global(.tag-purple) { background:#f3e8ff;color:#6b21a8;border:1px solid #e9d5ff; }
.row-blocked td { background:#fff5f5; opacity:.8; }
.tag-xs { font-size:10px;padding:1px 7px;border-radius:8px; }

/* RBAC table */
.rbac-table          { width:100%;border-collapse:collapse;font-size:13px; }
.rbac-table th       { background:var(--green);color:white;padding:10px 14px;text-align:left;font-weight:700; }
.rbac-table td       { padding:9px 14px;border-bottom:1px solid var(--grey-200); }
.rbac-table tr:hover td { background:var(--grey-50); }
.ck-yes  { color:#2e7d32;font-weight:800;font-size:15px; }
.ck-part { color:#f59e0b;font-weight:700;font-size:12px; }
.ck-no   { color:var(--grey-300); }

/* Modal */
.modal-backdrop { position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px; }
.modal          { background:white;border-radius:12px;width:100%;max-width:480px;box-shadow:0 20px 60px rgba(0,0,0,.2);overflow:hidden; }
.modal-header   { display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:2px solid var(--green);background:var(--green-pale); }
.modal-title    { font-size:15px;font-weight:800;color:var(--green-dark); }
.modal-close    { background:none;border:none;font-size:18px;cursor:pointer;color:var(--grey-500);line-height:1; }
.modal-close:hover { color:var(--red); }
.modal-body     { padding:20px;display:flex;flex-direction:column;gap:12px; }
.modal-footer   { display:flex;justify-content:flex-end;gap:10px;padding-top:8px; }

/* Cache management */
.cache-grid { display:flex;gap:12px;padding:16px 0 4px;flex-wrap:wrap; }
.cache-stat-card { flex:1;min-width:100px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px 18px;text-align:center; }
.cs-last { min-width:160px; }
.cs-value { font-size:26px;font-weight:800;color:#1b5e20;line-height:1; }
.cs-ts { font-size:15px; }
.cs-label { font-size:11px;color:#9ca3af;font-weight:600;margin-top:4px;text-transform:uppercase;letter-spacing:.5px; }
.cache-empty { padding:14px 0;font-size:13px;color:#9ca3af; }
.cache-actions { display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;padding:16px 0 4px; }
.cache-action-group { background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:14px 16px;display:flex;flex-direction:column;gap:6px; }
.ca-all { border-color:#fecaca;background:#fff5f5; }
.ca-label { font-size:13px;font-weight:700;color:#374151; }
.ca-desc { font-size:11px;color:#9ca3af;line-height:1.4;flex:1; }
.ca-btn { margin-top:8px;align-self:flex-start; }
@media (max-width:768px) { .cache-actions { grid-template-columns:1fr; } }

/* Test data management */
.td-count-badge { display:flex;flex-direction:column;align-items:center;background:#f0fdf4;border:1.5px solid #86efac;border-radius:12px;padding:10px 20px;min-width:110px; }
.td-count-num   { font-size:28px;font-weight:900;color:#16a34a;line-height:1; }
.td-count-lbl   { font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:.5px; }
.td-body { display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:16px 0 4px; }
@media (max-width:768px) { .td-body { grid-template-columns:1fr; } }
.td-panel { border:1px solid #e5e7eb;border-radius:12px;padding:20px;display:flex;flex-direction:column;gap:10px; }
.td-panel-generate { background:#f0fdf4;border-color:#bbf7d0; }
.td-panel-clear    { background:#fff5f5;border-color:#fecaca; }
.td-panel-icon  { font-size:28px; }
.td-panel-title { font-size:15px;font-weight:800;color:#1f2937; }
.td-panel-desc  { font-size:12px;color:#6b7280;line-height:1.6;flex:1; }
.td-controls    { display:flex;flex-direction:column;gap:8px;padding-top:4px; }
.td-num-row     { display:flex;align-items:center;gap:8px;flex-wrap:wrap; }
.td-num-input   { width:80px;padding:7px 10px;font-size:14px; }
.td-quick-btns  { display:flex;gap:4px; }
.td-quick { padding:6px 10px;border-radius:6px;font-size:12px;font-weight:700;border:1.5px solid #d1fae5;background:white;color:#059669;cursor:pointer;transition:all .15s; }
.td-quick:hover  { background:#d1fae5; }
.td-quick.active { background:#059669;color:white;border-color:#059669; }
.td-action-btn  { width:100%;justify-content:center;margin-top:4px; }
.td-clear-btn   { background:#dc2626;color:white;border:none;font-weight:700; }
.td-clear-btn:hover:not(:disabled) { background:#b91c1c; }
.td-clear-info  { font-size:13px;color:#6b7280;padding:8px 0; }

/* Status selector grid */
.td-status-grid { display:grid;grid-template-columns:repeat(3,1fr);gap:6px; }
@media (max-width:900px) { .td-status-grid { grid-template-columns:repeat(2,1fr); } }
.td-status-btn {
  display:flex;align-items:center;gap:7px;padding:8px 10px;border-radius:8px;
  font-size:12px;font-weight:700;cursor:pointer;transition:all .15s;text-align:left;
  border:1.5px solid #e5e7eb;background:white;color:#374151;
}
.td-status-btn .td-status-dot { width:9px;height:9px;border-radius:50%;flex-shrink:0;background:#d1d5db; }
.td-status-btn:hover { border-color:#6ee7b7;background:#f0fdf4; }
.tds-mixed.active    { background:#f3f4f6;border-color:#9ca3af;color:#111827; }
.tds-mixed.active .td-status-dot  { background:#9ca3af; }
.tds-draft.active    { background:#f9fafb;border-color:#9ca3af;color:#374151; }
.tds-draft.active .td-status-dot  { background:#9ca3af; }
.tds-submitted.active{ background:#eff6ff;border-color:#3b82f6;color:#1d4ed8; }
.tds-submitted.active .td-status-dot { background:#3b82f6; }
.tds-review.active   { background:#fffbeb;border-color:#f59e0b;color:#b45309; }
.tds-review.active .td-status-dot { background:#f59e0b; }
.tds-approved.active { background:#f0fdf4;border-color:#22c55e;color:#15803d; }
.tds-approved.active .td-status-dot { background:#22c55e; }
.tds-returned.active { background:#fef2f2;border-color:#ef4444;color:#b91c1c; }
.tds-returned.active .td-status-dot { background:#ef4444; }
</style>