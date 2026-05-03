<template>
  <div>
    <div class="breadcrumb">Home › <span>Project Master</span></div>
    <div class="page-header">
      <div><div class="page-title">Project Master</div><div class="page-sub">Manage all MSSRF projects and geographic coverage</div></div>
      <button v-if="auth.isAdmin" class="btn btn-primary btn-sm" @click="openForm(null)">＋ Add Project</button>
    </div>

    <div class="loading-center" v-if="loading"><div class="spinner spinner-lg"></div></div>

    <template v-else>
      <div class="card">
        <div class="card-header"><div class="card-title">All Projects</div></div>
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th>ID</th><th>Code</th><th>Project Name</th><th>Type</th><th>Impact Unit</th><th>HH Based?</th><th>Total HH</th><th>Benefit Value</th><th>Start</th><th>End</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              <tr v-if="!projects.length"><td colspan="12"><div class="empty-state"><span class="icon">📋</span><p>No projects</p></div></td></tr>
              <tr v-for="p in projects" :key="p.project_id">
                <td><span class="id-badge">{{ p.project_id }}</span></td>
                <td>{{ p.project_code }}</td>
                <td><strong>{{ p.project_name }}</strong></td>
                <td><span class="tag tag-teal">{{ p.project_type }}</span></td>
                <td><span :class="['tag', p.impact_unit_type==='Household'?'tag-green':'tag-blue']">{{ p.impact_unit_type }}</span></td>
                <td>{{ p.is_household_based ? '✅ Yes' : '❌ No' }}</td>
                <td><strong>{{ p.total_hh }}</strong></td>
                <td>₹{{ Number(p.total_value || 0).toLocaleString('en-IN') }}</td>
                <td>{{ p.start_date?.slice(0,10) }}</td>
                <td>{{ p.end_date?.slice(0,10) }}</td>
                <td><span :class="['tag', p.active_status?'tag-green':'tag-grey']">{{ p.active_status ? 'Active':'Inactive' }}</span></td>
                <td><button v-if="auth.can('admin')" class="btn btn-outline btn-xs" @click="openForm(p)">Edit</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- Add/Edit Modal -->
    <div class="modal-overlay" v-if="formModal" @click.self="formModal=null">
      <div class="modal-box">
        <div class="modal-header">
          <div class="modal-title">{{ editTarget ? 'Edit' : 'Add' }} Project</div>
          <span class="modal-close" @click="formModal=null">✕</span>
        </div>
        <div class="modal-body">
          <div class="alert alert-danger" v-if="formError">{{ formError }}</div>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">Project ID <span class="req">*</span></label>
              <input v-model="pForm.project_id" class="form-input" :disabled="!!editTarget" placeholder="e.g. P004" />
            </div>
            <div class="form-group">
              <label class="form-label">Project Code <span class="req">*</span></label>
              <input v-model="pForm.project_code" class="form-input" placeholder="e.g. TN-AGR-02" />
            </div>
            <div class="form-group full">
              <label class="form-label">Project Name <span class="req">*</span></label>
              <input v-model="pForm.project_name" class="form-input" placeholder="Full project name" />
            </div>
            <div class="form-group">
              <label class="form-label">Start Date</label>
              <input v-model="pForm.start_date" type="date" class="form-input" />
            </div>
            <div class="form-group">
              <label class="form-label">End Date</label>
              <input v-model="pForm.end_date" type="date" class="form-input" />
            </div>
            <div class="form-group">
              <label class="form-label">Project Type</label>
              <select v-model="pForm.project_type" class="form-select">
                <option>Livelihood</option><option>Health</option><option>WASH</option><option>Agriculture</option><option>Education</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Impact Unit Type <span class="req">*</span></label>
              <select v-model="pForm.impact_unit_type" class="form-select">
                <option>Household</option><option>Individual</option><option>Institution</option><option>Community</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Is Household Based?</label>
              <select v-model="pForm.is_household_based" class="form-select">
                <option :value="true">Yes</option><option :value="false">No</option>
              </select>
              <span class="form-hint">If No, HH linking is blocked</span>
            </div>
            <div class="form-group">
              <label class="form-label">Active Status</label>
              <select v-model="pForm.active_status" class="form-select">
                <option :value="true">Active</option><option :value="false">Inactive</option>
              </select>
            </div>
            <div class="form-group full">
              <label class="form-label">Geographic Coverage</label>
              <input v-model="pForm.geographic_coverage" class="form-input" placeholder="Districts / Blocks covered (used for GIS layer)" />
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" @click="formModal=null">Cancel</button>
          <button class="btn btn-primary" :disabled="saving" @click="saveProject">
            <span v-if="saving" class="spinner" style="width:14px;height:14px;border-width:2px"></span>
            <span v-else>Save Project</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import api from '../api'

const auth     = useAuthStore()
const projects = ref([])
const loading  = ref(true)
const formModal= ref(false)
const formError= ref('')
const saving   = ref(false)
const editTarget = ref(null)

const pForm = ref({
  project_id:'', project_name:'', project_code:'', start_date:'', end_date:'',
  project_type:'Livelihood', impact_unit_type:'Household',
  is_household_based:true, geographic_coverage:'', active_status:true,
})

async function load() {
  const { data } = await api.get('/projects')
  projects.value = data; loading.value = false
}

function openForm(p) {
  editTarget.value = p
  formError.value  = ''
  if (p) Object.assign(pForm.value, { ...p, is_household_based:!!p.is_household_based, active_status:!!p.active_status })
  else pForm.value = { project_id:'', project_name:'', project_code:'', start_date:'', end_date:'', project_type:'Livelihood', impact_unit_type:'Household', is_household_based:true, geographic_coverage:'', active_status:true }
  formModal.value = true
}

async function saveProject() {
  formError.value = ''
  if (!pForm.value.project_id || !pForm.value.project_name) return (formError.value = 'Project ID and Name required')
  saving.value = true
  try {
    if (editTarget.value) await api.put(`/projects/${editTarget.value.project_id}`, pForm.value)
    else await api.post('/projects', pForm.value)
    formModal.value = false; load()
  } catch (e) { formError.value = e.response?.data?.message || 'Save failed' }
  finally { saving.value = false }
}

onMounted(load)
</script>
