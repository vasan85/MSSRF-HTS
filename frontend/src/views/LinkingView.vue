<template>
  <div>
    <div class="breadcrumb">Home › <span>Project Linking</span></div>
    <div class="page-header">
      <div>
        <div class="page-title">Project Linking</div>
        <div class="page-sub">Link villages or individual households to projects</div>
      </div>
      <button v-if="activeTab==='individual'" class="btn btn-primary btn-sm" @click="openNewForm">＋ New Benefit Record</button>
      <button v-else class="btn btn-primary btn-sm" @click="openVillageForm">＋ Link Village</button>
    </div>

    <!-- Tabs -->
    <div class="tab-bar">
      <button :class="['tab-btn', activeTab==='village'&&'active']" @click="activeTab='village'">🏘 Village Linking</button>
      <button :class="['tab-btn', activeTab==='individual'&&'active']" @click="activeTab='individual'">👤 Individual Linking</button>
    </div>

    <!-- ═══════════════════ VILLAGE TAB ═══════════════════ -->
    <template v-if="activeTab==='village'">
      <div class="alert alert-info" style="margin-bottom:12px">
        ℹ️ Linking a village auto-maps all <strong>approved</strong> households in that village to the project.
        New households approved after linking are also auto-mapped.
      </div>

      <!-- Project picker -->
      <div class="card" style="margin-bottom:12px">
        <div class="card-header" style="border-bottom:none;padding-bottom:0">
          <div class="card-title">Select Project</div>
        </div>
        <div style="padding:0 16px 16px">
          <select v-model="villageProjectId" class="form-select" style="max-width:400px" @change="loadVillageLinks">
            <option value="">— Select a household-based project —</option>
            <option v-for="p in hhProjects" :key="p.project_id" :value="p.project_id">
              {{ p.project_code }} · {{ p.project_name }}
            </option>
          </select>
        </div>
      </div>

      <!-- Village links table -->
      <div class="card" v-if="villageProjectId">
        <div class="card-header">
          <div class="card-title">Linked Villages</div>
          <span class="badge badge-blue">{{ villageLinks.length }} village{{ villageLinks.length!==1?'s':'' }}</span>
        </div>
        <div class="loading-center" v-if="villageLoading"><div class="spinner"></div></div>
        <template v-else>
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Village</th>
                  <th>Block</th>
                  <th>Total HH</th>
                  <th>Linked HH</th>
                  <th>Coverage</th>
                  <th>Linked By</th>
                  <th>Linked On</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="!villageLinks.length">
                  <td colspan="8">
                    <div class="empty-state">
                      <span class="icon">🏘</span>
                      <p>No villages linked yet. Click "Link Village" to add one.</p>
                    </div>
                  </td>
                </tr>
                <tr v-for="vl in villageLinks" :key="vl.id">
                  <td><strong>{{ vl.village_name }}</strong></td>
                  <td>{{ vl.block_name }}</td>
                  <td>{{ vl.total_households }}</td>
                  <td>
                    <span class="badge badge-green">{{ vl.linked_hh_count }}</span>
                  </td>
                  <td>
                    <div class="progress-wrap">
                      <div class="progress-bar" :style="{ width: coveragePct(vl) + '%' }"></div>
                      <span class="progress-label">{{ coveragePct(vl) }}%</span>
                    </div>
                  </td>
                  <td>{{ vl.linked_by_name || '—' }}</td>
                  <td>{{ vl.linked_at?.slice(0,10) }}</td>
                  <td>
                    <button class="btn btn-danger btn-xs" @click="confirmUnlink(vl)">Unlink</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>
      </div>

      <div class="card empty-prompt" v-else>
        <div class="empty-state"><span class="icon">🏘</span><p>Select a project above to see its linked villages.</p></div>
      </div>
    </template>

    <!-- ═══════════════════ INDIVIDUAL TAB ═══════════════════ -->
    <template v-if="activeTab==='individual'">
      <div class="alert alert-warning">
        ⚠️ <strong>Business Rule:</strong> Linking only permitted when <em>Impact Unit Type = Household</em>. Blocked for Community/Institution projects.
      </div>

      <div class="card">
        <div class="card-header">
          <div class="card-title">Benefit Records</div>
          <div style="display:flex;gap:8px">
            <select v-model="filterProject" class="form-select" style="width:220px" @change="loadLinks">
              <option value="">All Projects</option>
              <option v-for="p in projects" :key="p.project_id" :value="p.project_id">{{ p.project_code }} · {{ p.project_name }}</option>
            </select>
          </div>
        </div>
        <div class="loading-center" v-if="loading"><div class="spinner"></div></div>
        <template v-else>
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Record ID</th><th>Project</th><th>Household</th><th>Village</th>
                  <th>Benefit</th><th>Category</th><th>Value (₹)</th><th>Qty</th>
                  <th>Enrolled</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="!rows.length">
                  <td colspan="11"><div class="empty-state"><span class="icon">🔗</span><p>No records</p></div></td>
                </tr>
                <tr v-for="r in rows" :key="r.record_id">
                  <td><span class="id-badge">{{ r.record_id }}</span></td>
                  <td><span class="id-badge">{{ r.project_code }}</span></td>
                  <td><span class="id-badge">{{ r.household_id }}</span></td>
                  <td>{{ r.village_name }}</td>
                  <td>{{ r.benefit_type }}</td>
                  <td><span class="tag tag-teal">{{ r.benefit_category }}</span></td>
                  <td>{{ Number(r.monetary_value).toLocaleString('en-IN') }}</td>
                  <td>{{ r.service_quantity }}</td>
                  <td>{{ r.enrollment_date?.slice(0,10) }}</td>
                  <td><span :class="['tag', r.status==='Active'?'tag-green':r.status==='Pending'?'tag-amber':'tag-grey']">{{ r.status }}</span></td>
                  <td><button class="btn btn-outline btn-xs" @click="openEdit(r)">Edit</button></td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="pagination">
            <div class="page-btn" @click="changePage(page-1)">«</div>
            <div v-for="p in totalPages" :key="p" :class="['page-btn', p===page&&'active']" @click="changePage(p)">{{ p }}</div>
            <div class="page-btn" @click="changePage(page+1)">»</div>
          </div>
        </template>
      </div>
    </template>

    <!-- ═══════ Modal: Link Village ═══════ -->
    <div class="modal-overlay" v-if="showVillageForm" @click.self="closeVillageForm">
      <div class="modal-box" style="max-width:580px">
        <div class="modal-header">
          <div class="modal-title">Link Village to Project</div>
          <span class="modal-close" @click="closeVillageForm">✕</span>
        </div>
        <div class="modal-body">
          <div class="alert alert-danger" v-if="villageFormError">{{ villageFormError }}</div>
          <div class="form-grid">

            <!-- Project -->
            <div class="form-group full">
              <label class="form-label">Project <span class="req">*</span></label>
              <select v-model="vForm.project_id" class="form-select">
                <option value="">— Select Project —</option>
                <option v-for="p in hhProjects" :key="p.project_id" :value="p.project_id">{{ p.project_code }} · {{ p.project_name }}</option>
              </select>
            </div>

            <!-- Geo cascade -->
            <div class="geo-cascade">
              <div class="geo-step">
                <label class="form-label">State</label>
                <select v-model="geoState" class="form-select" @change="geoDistrict=''; geoBlock=''; vForm.village_id=''">
                  <option value="">All States</option>
                  <option v-for="s in geoStates" :key="s" :value="s">{{ s }}</option>
                </select>
              </div>
              <div class="geo-arrow">›</div>
              <div class="geo-step">
                <label class="form-label">District</label>
                <select v-model="geoDistrict" class="form-select" @change="geoBlock=''; vForm.village_id=''" :disabled="!geoState">
                  <option value="">All Districts</option>
                  <option v-for="d in geoDistricts" :key="d" :value="d">{{ d }}</option>
                </select>
              </div>
              <div class="geo-arrow">›</div>
              <div class="geo-step">
                <label class="form-label">Block</label>
                <select v-model="geoBlock" class="form-select" @change="vForm.village_id=''" :disabled="!geoDistrict">
                  <option value="">All Blocks</option>
                  <option v-for="b in geoBlocks" :key="b" :value="b">{{ b }}</option>
                </select>
              </div>
            </div>

            <!-- Village -->
            <div class="form-group full">
              <label class="form-label">Village <span class="req">*</span></label>
              <select v-model="vForm.village_id" class="form-select" :disabled="geoVillages.length===0">
                <option value="">— Select Village —</option>
                <option v-for="v in geoVillages" :key="v.village_id" :value="v.village_id">
                  {{ v.village_name }}
                  <template v-if="!geoBlock"> ({{ v.block_name }})</template>
                  <span> · {{ v.hh_count }} HH</span>
                </option>
              </select>
              <span class="form-hint" v-if="geoVillages.length===0 && (geoState||geoBlock)">
                No villages with household data in this selection.
              </span>
              <span class="form-hint" v-else-if="!geoState">
                Only villages with household data are listed. Use filters above to narrow down.
              </span>
            </div>

            <!-- Enrollment date + defaults -->
            <div class="form-group">
              <label class="form-label">Enrollment Date</label>
              <input v-model="vForm.enrollment_date" type="date" class="form-input" />
              <span class="form-hint">Defaults to today if blank</span>
            </div>
            <div class="form-group">
              <label class="form-label">Default Benefit Type</label>
              <select v-model="vForm.benefit_type" class="form-select">
                <option value="">— None —</option>
                <option>Sewing Machine</option><option>Goat Unit</option>
                <option>Dairy Cow</option><option>Nutrition Kit</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Default Status</label>
              <select v-model="vForm.status" class="form-select">
                <option>Active</option><option>Pending</option>
              </select>
            </div>
          </div>
          <div class="alert alert-info" style="margin-top:8px;font-size:12px">
            All currently <strong>approved</strong> households in the selected village will be auto-mapped to the project.
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" @click="closeVillageForm">Cancel</button>
          <button class="btn btn-primary" :disabled="savingVillage" @click="saveVillageLink">
            <span v-if="savingVillage" class="spinner" style="width:14px;height:14px;border-width:2px"></span>
            <span v-else>Link Village</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ═══════ Modal: Individual Benefit Record ═══════ -->
    <div class="modal-overlay" v-if="showForm" @click.self="showForm=false">
      <div class="modal-box">
        <div class="modal-header">
          <div class="modal-title">{{ lForm.record_id ? 'Edit Benefit Record' : 'New Benefit Record' }}</div>
          <span class="modal-close" @click="showForm=false">✕</span>
        </div>
        <div class="modal-body">
          <div class="alert alert-danger" v-if="formError">{{ formError }}</div>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">Project <span class="req">*</span></label>
              <select v-model="lForm.project_id" class="form-select" @change="onProjectSelect" :disabled="!!lForm.record_id">
                <option value="">— Select Project —</option>
                <option v-for="p in hhProjects" :key="p.project_id" :value="p.project_id">{{ p.project_code }} · {{ p.project_name }}</option>
              </select>
              <span v-if="blockedProject" class="form-error">⛔ {{ blockedProject }}</span>
            </div>
            <div class="form-group">
              <label class="form-label">Household ID <span class="req">*</span></label>
              <input v-model="lForm.household_id" type="text" class="form-input" list="hh-list"
                     placeholder="Type HH ID or name" @change="onHHSelect" :disabled="!!lForm.record_id" />
              <datalist id="hh-list">
                <option v-for="h in hhSuggestions" :key="h.household_id" :value="h.household_id">{{ h.head_name }} — {{ h.village_name }}</option>
              </datalist>
            </div>
            <div class="form-group">
              <label class="form-label">Village (Auto)</label>
              <input v-model="lForm.village_id" class="form-input" disabled placeholder="Auto-filled" />
            </div>
            <div class="form-group">
              <label class="form-label">Enrollment Date <span class="req">*</span></label>
              <input v-model="lForm.enrollment_date" type="date" class="form-input" />
              <span class="form-hint">Must be within project start–end date</span>
            </div>
            <div class="form-group">
              <label class="form-label">Benefit Type <span class="req">*</span></label>
              <select v-model="lForm.benefit_type" class="form-select">
                <option value="">— Select —</option>
                <option>Sewing Machine</option><option>Goat Unit</option>
                <option>Dairy Cow</option><option>Nutrition Kit</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Benefit Category</label>
              <select v-model="lForm.benefit_category" class="form-select">
                <option value="">— Select —</option>
                <option>Livelihood Asset</option><option>Health Support</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Monetary Value (₹)</label>
              <input v-model="lForm.monetary_value" type="number" class="form-input" placeholder="0" />
            </div>
            <div class="form-group">
              <label class="form-label">Service Quantity</label>
              <input v-model="lForm.service_quantity" type="number" class="form-input" placeholder="1" />
            </div>
            <div class="form-group">
              <label class="form-label">Status</label>
              <select v-model="lForm.status" class="form-select">
                <option>Active</option><option>Pending</option><option>Partial</option><option>Closed</option>
              </select>
            </div>
            <div class="form-group full">
              <label class="form-label">Remarks</label>
              <textarea v-model="lForm.remarks" class="form-textarea" rows="2" placeholder="Additional notes..."></textarea>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" @click="showForm=false">Cancel</button>
          <button class="btn btn-primary" :disabled="saving || !!blockedProject" @click="saveLink">
            <span v-if="saving" class="spinner" style="width:14px;height:14px;border-width:2px"></span>
            <span v-else>{{ lForm.record_id ? 'Update Record' : 'Save Benefit Record' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Unlink confirm -->
    <div class="modal-overlay" v-if="unlinkTarget" @click.self="unlinkTarget=null">
      <div class="modal-box" style="max-width:420px">
        <div class="modal-header">
          <div class="modal-title">Unlink Village?</div>
          <span class="modal-close" @click="unlinkTarget=null">✕</span>
        </div>
        <div class="modal-body">
          <p>Remove <strong>{{ unlinkTarget?.village_name }}</strong> from this project?</p>
          <p class="form-hint" style="margin-top:6px">
            Existing household benefit records will <strong>not</strong> be deleted — only the village-level link is removed.
            Future approved households in this village will no longer be auto-mapped.
          </p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" @click="unlinkTarget=null">Cancel</button>
          <button class="btn btn-danger" :disabled="unlinking" @click="doUnlink">
            <span v-if="unlinking" class="spinner" style="width:14px;height:14px;border-width:2px"></span>
            <span v-else>Yes, Unlink</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '../api'

// ── shared ────────────────────────────────────────────────────
const activeTab    = ref('village')
const projects     = ref([])
const hhVillages   = ref([])   // villages with actual HH data (full hierarchy)
const hhSuggestions= ref([])

const hhProjects = computed(() => projects.value.filter(p => p.is_household_based))

// ── geo cascade for village modal ────────────────────────────
const geoState    = ref('')
const geoDistrict = ref('')
const geoBlock    = ref('')

const geoStates = computed(() =>
  [...new Set(hhVillages.value.map(v => v.state_name).filter(Boolean))].sort()
)
const geoDistricts = computed(() => {
  const src = geoState.value
    ? hhVillages.value.filter(v => v.state_name === geoState.value)
    : hhVillages.value
  return [...new Set(src.map(v => v.district_name).filter(Boolean))].sort()
})
const geoBlocks = computed(() => {
  let src = hhVillages.value
  if (geoState.value)    src = src.filter(v => v.state_name    === geoState.value)
  if (geoDistrict.value) src = src.filter(v => v.district_name === geoDistrict.value)
  return [...new Set(src.map(v => v.block_name).filter(Boolean))].sort()
})
const geoVillages = computed(() => {
  let src = hhVillages.value
  if (geoState.value)    src = src.filter(v => v.state_name    === geoState.value)
  if (geoDistrict.value) src = src.filter(v => v.district_name === geoDistrict.value)
  if (geoBlock.value)    src = src.filter(v => v.block_name    === geoBlock.value)
  return src.sort((a, b) => a.village_name.localeCompare(b.village_name))
})

// ── individual tab ────────────────────────────────────────────
const rows          = ref([])
const loading       = ref(true)
const total         = ref(0)
const page          = ref(1)
const limit         = 20
const filterProject = ref('')
const showForm      = ref(false)
const saving        = ref(false)
const formError     = ref('')
const blockedProject= ref('')

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / limit)))

const emptyLink = () => ({
  record_id:'', project_id:'', household_id:'', village_id:'', enrollment_date:'',
  benefit_type:'', benefit_category:'', monetary_value:0, service_quantity:1,
  status:'Active', remarks:'',
})
const lForm = ref(emptyLink())

async function loadLinks() {
  loading.value = true
  try {
    const { data } = await api.get('/links', { params: { project_id: filterProject.value, page: page.value, limit } })
    rows.value = data.data; total.value = data.total
  } finally { loading.value = false }
}

function changePage(p) { if (p < 1 || p > totalPages.value) return; page.value = p; loadLinks() }

function onProjectSelect() {
  const p = projects.value.find(x => x.project_id === lForm.value.project_id)
  blockedProject.value = p && !p.is_household_based
    ? `Project '${p.project_name}' is not Household-based. Linking blocked.` : ''
}

async function onHHSelect() {
  if (!lForm.value.household_id) return
  try {
    const { data } = await api.get(`/households/${lForm.value.household_id}`)
    lForm.value.village_id = data.village_id
  } catch {}
}

function openNewForm() { lForm.value = emptyLink(); blockedProject.value = ''; formError.value = ''; showForm.value = true }
function openEdit(r)   { Object.assign(lForm.value, r); blockedProject.value = ''; formError.value = ''; showForm.value = true }

async function saveLink() {
  formError.value = ''
  if (!lForm.value.project_id || !lForm.value.household_id || !lForm.value.benefit_type)
    return (formError.value = 'Project, Household ID, and Benefit Type are required')
  saving.value = true
  try {
    if (lForm.value.record_id) {
      await api.put(`/links/${lForm.value.record_id}`, lForm.value)
    } else {
      await api.post('/links', lForm.value)
    }
    showForm.value = false
    lForm.value = emptyLink()
    loadLinks()
  } catch (e) { formError.value = e.response?.data?.message || 'Save failed' }
  finally { saving.value = false }
}

// ── village tab ───────────────────────────────────────────────
const villageProjectId  = ref('')
const villageLinks      = ref([])
const villageLoading    = ref(false)
const showVillageForm   = ref(false)
const savingVillage     = ref(false)
const villageFormError  = ref('')
const unlinkTarget      = ref(null)
const unlinking         = ref(false)

const emptyVForm = () => ({
  project_id: villageProjectId.value, village_id: '',
  enrollment_date: '', benefit_type: '', status: 'Active',
})
const vForm = ref(emptyVForm())

function coveragePct(vl) {
  if (!vl.total_households) return 0
  return Math.min(100, Math.round((vl.linked_hh_count / vl.total_households) * 100))
}

async function loadVillageLinks() {
  if (!villageProjectId.value) { villageLinks.value = []; return }
  villageLoading.value = true
  try {
    const { data } = await api.get('/links/village-links', { params: { project_id: villageProjectId.value } })
    villageLinks.value = data
  } finally { villageLoading.value = false }
}

function closeVillageForm() { showVillageForm.value = false; villageFormError.value = '' }

async function saveVillageLink() {
  villageFormError.value = ''
  if (!vForm.value.project_id || !vForm.value.village_id)
    return (villageFormError.value = 'Project and Village are required')
  savingVillage.value = true
  try {
    const { data } = await api.post('/links/village-links', vForm.value)
    closeVillageForm()
    villageProjectId.value = vForm.value.project_id
    await loadVillageLinks()
    if (data.auto_mapped > 0)
      alert(`Village linked. ${data.auto_mapped} approved household(s) were auto-mapped to the project.`)
  } catch (e) { villageFormError.value = e.response?.data?.message || 'Save failed' }
  finally { savingVillage.value = false }
}

function openVillageForm() {
  vForm.value = emptyVForm()
  vForm.value.project_id = villageProjectId.value
  geoState.value = ''; geoDistrict.value = ''; geoBlock.value = ''
  villageFormError.value = ''
  showVillageForm.value = true
}

function confirmUnlink(vl) { unlinkTarget.value = vl }

async function doUnlink() {
  if (!unlinkTarget.value) return
  unlinking.value = true
  try {
    await api.delete(`/links/village-links/${unlinkTarget.value.id}`)
    unlinkTarget.value = null
    loadVillageLinks()
  } catch (e) { alert(e.response?.data?.message || 'Unlink failed') }
  finally { unlinking.value = false }
}

// ── init ──────────────────────────────────────────────────────
onMounted(async () => {
  const [{ data: ps }, { data: vs }, { data: hh }] = await Promise.all([
    api.get('/projects'),
    api.get('/masters/hh-villages'),
    api.get('/households', { params: { limit: 200 } }),
  ])
  projects.value      = ps
  hhVillages.value    = vs
  hhSuggestions.value = hh.data
  loadLinks()
})
</script>

<style scoped>
.tab-bar { display:flex; gap:4px; margin-bottom:16px; border-bottom:2px solid #e5e7eb; }
.tab-btn {
  padding:8px 20px; border:none; background:none; cursor:pointer;
  font-size:14px; font-weight:500; color:#6b7280; border-bottom:2px solid transparent;
  margin-bottom:-2px; transition:color .15s, border-color .15s;
}
.tab-btn:hover  { color:#374151; }
.tab-btn.active { color:#2563eb; border-bottom-color:#2563eb; }

.badge { display:inline-block; padding:2px 10px; border-radius:999px; font-size:12px; font-weight:600; }
.badge-blue  { background:#dbeafe; color:#1d4ed8; }
.badge-green { background:#dcfce7; color:#15803d; }

.progress-wrap {
  position:relative; background:#e5e7eb; border-radius:4px;
  height:18px; min-width:80px; overflow:hidden;
}
.progress-bar  { height:100%; background:#22c55e; transition:width .3s; }
.progress-label {
  position:absolute; inset:0; display:flex; align-items:center;
  justify-content:center; font-size:11px; font-weight:600; color:#111;
}

.btn-danger { background:#ef4444; color:#fff; border:none; }
.btn-danger:hover:not(:disabled) { background:#dc2626; }

.empty-prompt { padding:32px; }

.geo-cascade {
  grid-column: 1 / -1;
  display: flex;
  align-items: flex-end;
  gap: 0;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 4px;
}
.geo-step { flex: 1; min-width: 0; }
.geo-step .form-label { font-size: 11px; text-transform: uppercase; letter-spacing: .05em; color: #6b7280; margin-bottom: 4px; }
.geo-step .form-select { font-size: 13px; }
.geo-arrow {
  flex: 0 0 24px; text-align: center; font-size: 20px;
  color: #94a3b8; padding-bottom: 6px; align-self: flex-end;
}
</style>
