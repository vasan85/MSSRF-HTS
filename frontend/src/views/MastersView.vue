<template>
  <div>
    <div class="breadcrumb">Home › <span>Master Data</span></div>
    <div class="page-header">
      <div><div class="page-title">Master Data Management</div><div class="page-sub">Manage the State → District → Block → Village hierarchy</div></div>
    </div>

    <!-- Alerts -->
    <div class="alert alert-success" v-if="successMsg">✅ {{ successMsg }}</div>
    <div class="alert alert-danger"  v-if="errorMsg">❌ {{ errorMsg }}</div>

    <!-- Hierarchy diagram -->
    <div class="card" style="padding:14px 18px;margin-bottom:18px">
      <div class="hierarchy">
        <div :class="['h-box', activeTab==='state' && 'active']">State</div><div class="h-arrow">→</div>
        <div :class="['h-box', activeTab==='district' && 'active']">District</div><div class="h-arrow">→</div>
        <div :class="['h-box', activeTab==='block' && 'active']">Block</div><div class="h-arrow">→</div>
        <div :class="['h-box', activeTab==='village' && 'active']">Village</div><div class="h-arrow">→</div>
        <div class="h-box">Household</div><div class="h-arrow">→</div>
        <div class="h-box">Project Participation</div>
      </div>
    </div>

    <!-- Tab Navigation -->
    <div class="card" style="padding:0;overflow:visible">
      <div class="tabs">
        <button :class="['tab', activeTab==='state' && 'active']" @click="activeTab='state'">
          🌏 States <span class="tab-count">{{ states.length }}</span>
        </button>
        <button :class="['tab', activeTab==='district' && 'active']" @click="activeTab='district'">
          🏙️ Districts <span class="tab-count">{{ districts.length }}</span>
        </button>
        <button :class="['tab', activeTab==='block' && 'active']" @click="activeTab='block'">
          🏘️ Blocks <span class="tab-count">{{ blocks.length }}</span>
        </button>
        <button :class="['tab', activeTab==='village' && 'active']" @click="activeTab='village'">
          🌾 Villages <span class="tab-count">{{ villageList.length }}</span>
        </button>
      </div>

      <div class="tab-content">

        <!-- ═══════════════ STATE TAB ═══════════════ -->
        <div v-show="activeTab==='state'">
          <div class="tab-header">
            <div class="search-box">
              <input v-model="searchQuery" class="form-input" placeholder="🔍 Search states..." />
            </div>
            <button class="btn btn-primary" @click="toggleForm('state')">
              {{ showForm==='state' ? '✕ Cancel' : '＋ Add State' }}
            </button>
          </div>

          <!-- Add State form -->
          <transition name="slide">
            <div v-if="showForm==='state'" class="form-card">
              <h3 class="form-title">Add New State</h3>
              <div class="form-row">
                <div class="form-group" style="flex:1">
                  <label class="form-label">State Name <span class="req">*</span></label>
                  <input v-model="forms.state.state_name" class="form-input" placeholder="e.g. Tamil Nadu" @keyup.enter="addState" />
                </div>
              </div>
              <div class="form-actions">
                <button class="btn btn-secondary" @click="showForm=''">Cancel</button>
                <button class="btn btn-primary" :disabled="saving" @click="addState">
                  <span v-if="saving" class="spinner" style="width:14px;height:14px;border-width:2px"></span>
                  <span v-else>💾 Save State</span>
                </button>
              </div>
            </div>
          </transition>

          <div class="data-table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width:100px">ID</th>
                  <th>State Name</th>
                  <th style="width:150px;text-align:center">Districts</th>
                  <th style="width:150px;text-align:center">Created</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="!filteredStates.length">
                  <td colspan="4">
                    <div class="empty-state">
                      <span class="icon">🌏</span>
                      <p>{{ searchQuery ? 'No states found matching your search' : 'No states added yet' }}</p>
                    </div>
                  </td>
                </tr>
                <tr v-for="s in paginatedStates" :key="s.state_id">
                  <td><span class="id-badge">{{ s.state_id }}</span></td>
                  <td><strong>{{ s.state_name }}</strong></td>
                  <td style="text-align:center"><span class="badge-count">{{ getDistrictCount(s.state_id) }}</span></td>
                  <td style="text-align:center;color:var(--grey-400);font-size:12px">{{ formatDate(s.created_at) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-if="filteredStates.length > itemsPerPage" class="pagination">
            <button class="btn btn-sm" :disabled="currentPage===1" @click="currentPage--">← Prev</button>
            <span class="page-info">Page {{ currentPage }} of {{ totalPages }}</span>
            <button class="btn btn-sm" :disabled="currentPage===totalPages" @click="currentPage++">Next →</button>
          </div>
        </div>

        <!-- ═══════════════ DISTRICT TAB ═══════════════ -->
        <div v-show="activeTab==='district'">
          <div class="tab-header">
            <div class="search-box">
              <input v-model="searchQuery" class="form-input" placeholder="🔍 Search districts..." />
            </div>
            <div class="filter-box">
              <select v-model="filterState" class="form-select">
                <option value="">All States</option>
                <option v-for="s in states" :key="s.state_id" :value="s.state_id">{{ s.state_name }}</option>
              </select>
            </div>
            <button class="btn btn-primary" @click="toggleForm('district')">
              {{ showForm==='district' ? '✕ Cancel' : '＋ Add District' }}
            </button>
          </div>

          <transition name="slide">
            <div v-if="showForm==='district'" class="form-card">
              <h3 class="form-title">Add New District</h3>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">District ID <span class="req">*</span></label>
                  <input v-model="forms.district.district_id" class="form-input" placeholder="e.g. TN04" maxlength="10" />
                </div>
                <div class="form-group" style="flex:2">
                  <label class="form-label">District Name <span class="req">*</span></label>
                  <input v-model="forms.district.district_name" class="form-input" placeholder="e.g. Coimbatore" />
                </div>
                <div class="form-group" style="flex:1.5">
                  <label class="form-label">State <span class="req">*</span></label>
                  <select v-model="forms.district.state_id" class="form-select">
                    <option value="">— Select State —</option>
                    <option v-for="s in states" :key="s.state_id" :value="s.state_id">{{ s.state_name }}</option>
                  </select>
                </div>
              </div>
              <div class="form-actions">
                <button class="btn btn-secondary" @click="showForm=''">Cancel</button>
                <button class="btn btn-primary" :disabled="saving" @click="addDistrict">
                  <span v-if="saving" class="spinner" style="width:14px;height:14px;border-width:2px"></span>
                  <span v-else>💾 Save District</span>
                </button>
              </div>
            </div>
          </transition>

          <div class="data-table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width:100px">ID</th>
                  <th>District Name</th>
                  <th style="width:200px">State</th>
                  <th style="width:120px;text-align:center">Blocks</th>
                  <th style="width:150px;text-align:center">Created</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="!filteredDistricts.length">
                  <td colspan="5">
                    <div class="empty-state">
                      <span class="icon">🏙️</span>
                      <p>{{ searchQuery || filterState ? 'No districts found' : 'No districts added yet' }}</p>
                    </div>
                  </td>
                </tr>
                <tr v-for="d in paginatedDistricts" :key="d.district_id">
                  <td><span class="id-badge">{{ d.district_id }}</span></td>
                  <td><strong>{{ d.district_name }}</strong></td>
                  <td><span class="tag tag-grey">{{ d.state_name }}</span></td>
                  <td style="text-align:center"><span class="badge-count">{{ getBlockCount(d.district_id) }}</span></td>
                  <td style="text-align:center;color:var(--grey-400);font-size:12px">{{ formatDate(d.created_at) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-if="filteredDistricts.length > itemsPerPage" class="pagination">
            <button class="btn btn-sm" :disabled="currentPage===1" @click="currentPage--">← Prev</button>
            <span class="page-info">Page {{ currentPage }} of {{ totalPages }}</span>
            <button class="btn btn-sm" :disabled="currentPage===totalPages" @click="currentPage++">Next →</button>
          </div>
        </div>

        <!-- ═══════════════ BLOCK TAB ═══════════════ -->
        <div v-show="activeTab==='block'">
          <div class="tab-header">
            <div class="search-box">
              <input v-model="searchQuery" class="form-input" placeholder="🔍 Search blocks..." />
            </div>
            <div class="filter-box">
              <select v-model="filterDistrict" class="form-select">
                <option value="">All Districts</option>
                <option v-for="d in districts" :key="d.district_id" :value="d.district_id">{{ d.district_name }}</option>
              </select>
            </div>
            <button class="btn btn-primary" @click="toggleForm('block')">
              {{ showForm==='block' ? '✕ Cancel' : '＋ Add Block' }}
            </button>
          </div>

          <transition name="slide">
            <div v-if="showForm==='block'" class="form-card">
              <h3 class="form-title">Add New Block</h3>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Block ID <span class="req">*</span></label>
                  <input v-model="forms.block.block_id" class="form-input" placeholder="e.g. BL005" maxlength="10" />
                </div>
                <div class="form-group" style="flex:2">
                  <label class="form-label">Block Name <span class="req">*</span></label>
                  <input v-model="forms.block.block_name" class="form-input" placeholder="e.g. Velachery" />
                </div>
                <div class="form-group" style="flex:1.5">
                  <label class="form-label">District <span class="req">*</span></label>
                  <select v-model="forms.block.district_id" class="form-select">
                    <option value="">— Select District —</option>
                    <option v-for="d in districts" :key="d.district_id" :value="d.district_id">
                      {{ d.district_name }} ({{ d.state_name }})
                    </option>
                  </select>
                </div>
              </div>
              <div class="form-actions">
                <button class="btn btn-secondary" @click="showForm=''">Cancel</button>
                <button class="btn btn-primary" :disabled="saving" @click="addBlock">
                  <span v-if="saving" class="spinner" style="width:14px;height:14px;border-width:2px"></span>
                  <span v-else>💾 Save Block</span>
                </button>
              </div>
            </div>
          </transition>

          <div class="data-table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width:100px">ID</th>
                  <th>Block Name</th>
                  <th style="width:200px">District</th>
                  <th style="width:200px">State</th>
                  <th style="width:120px;text-align:center">Villages</th>
                  <th style="width:150px;text-align:center">Created</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="!filteredBlocks.length">
                  <td colspan="6">
                    <div class="empty-state">
                      <span class="icon">🏘️</span>
                      <p>{{ searchQuery || filterDistrict ? 'No blocks found' : 'No blocks added yet' }}</p>
                    </div>
                  </td>
                </tr>
                <tr v-for="b in paginatedBlocks" :key="b.block_id">
                  <td><span class="id-badge">{{ b.block_id }}</span></td>
                  <td><strong>{{ b.block_name }}</strong></td>
                  <td><span class="tag tag-grey">{{ b.district_name }}</span></td>
                  <td><span class="tag tag-blue">{{ b.state_name }}</span></td>
                  <td style="text-align:center"><span class="badge-count">{{ getVillageCount(b.block_id) }}</span></td>
                  <td style="text-align:center;color:var(--grey-400);font-size:12px">{{ formatDate(b.created_at) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-if="filteredBlocks.length > itemsPerPage" class="pagination">
            <button class="btn btn-sm" :disabled="currentPage===1" @click="currentPage--">← Prev</button>
            <span class="page-info">Page {{ currentPage }} of {{ totalPages }}</span>
            <button class="btn btn-sm" :disabled="currentPage===totalPages" @click="currentPage++">Next →</button>
          </div>
        </div>

        <!-- ═══════════════ VILLAGE TAB ═══════════════ -->
        <div v-show="activeTab==='village'">
          <div class="tab-header">
            <div class="search-box">
              <input v-model="searchQuery" class="form-input" placeholder="🔍 Search villages..." />
            </div>
            <div class="filter-box">
              <select v-model="filterBlock" class="form-select">
                <option value="">All Blocks</option>
                <option v-for="b in blocks" :key="b.block_id" :value="b.block_id">{{ b.block_name }}</option>
              </select>
            </div>
            <button class="btn btn-primary" @click="toggleForm('village')">
              {{ showForm==='village' ? '✕ Cancel' : '＋ Add Village' }}
            </button>
          </div>

          <transition name="slide">
            <div v-if="showForm==='village'" class="form-card">
              <h3 class="form-title">Add New Village</h3>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Village ID <span class="req">*</span></label>
                  <input v-model="forms.village.village_id" class="form-input" placeholder="e.g. V05" maxlength="10" />
                </div>
                <div class="form-group" style="flex:2">
                  <label class="form-label">Village Name <span class="req">*</span></label>
                  <input v-model="forms.village.village_name" class="form-input" placeholder="e.g. Kelambakkam" />
                </div>
                <div class="form-group" style="flex:1.5">
                  <label class="form-label">Block <span class="req">*</span></label>
                  <select v-model="forms.village.block_id" class="form-select">
                    <option value="">— Select Block —</option>
                    <option v-for="b in blocks" :key="b.block_id" :value="b.block_id">
                      {{ b.block_name }} ({{ b.district_name }})
                    </option>
                  </select>
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Population</label>
                  <input v-model.number="forms.village.population" type="number" class="form-input" placeholder="0" />
                </div>
                <div class="form-group">
                  <label class="form-label">Total Households</label>
                  <input v-model.number="forms.village.total_households" type="number" class="form-input" placeholder="0" />
                </div>
              </div>
              <div class="form-actions">
                <button class="btn btn-secondary" @click="showForm=''">Cancel</button>
                <button class="btn btn-primary" :disabled="saving" @click="addVillage">
                  <span v-if="saving" class="spinner" style="width:14px;height:14px;border-width:2px"></span>
                  <span v-else>💾 Save Village</span>
                </button>
              </div>
            </div>
          </transition>

          <div class="data-table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width:100px">ID</th>
                  <th>Village Name</th>
                  <th style="width:180px">Block</th>
                  <th style="width:180px">District</th>
                  <th style="width:100px;text-align:center">Population</th>
                  <th style="width:100px;text-align:center">Households</th>
                  <th style="width:100px;text-align:center">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="!filteredVillages.length">
                  <td colspan="7">
                    <div class="empty-state">
                      <span class="icon">🌾</span>
                      <p>{{ searchQuery || filterBlock ? 'No villages found' : 'No villages added yet' }}</p>
                    </div>
                  </td>
                </tr>
                <tr v-for="v in paginatedVillages" :key="v.village_id">
                  <td><span class="id-badge">{{ v.village_id }}</span></td>
                  <td><strong>{{ v.village_name }}</strong></td>
                  <td><span class="tag tag-grey">{{ v.block_name }}</span></td>
                  <td><span class="tag tag-blue">{{ v.district_name }}</span></td>
                  <td style="text-align:center">{{ v.population || '—' }}</td>
                  <td style="text-align:center"><span class="badge-count">{{ v.total_households || 0 }}</span></td>
                  <td style="text-align:center"><span :class="['tag', v.active ? 'tag-green' : 'tag-grey']">{{ v.active ? 'Active' : 'Inactive' }}</span></td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-if="filteredVillages.length > itemsPerPage" class="pagination">
            <button class="btn btn-sm" :disabled="currentPage===1" @click="currentPage--">← Prev</button>
            <span class="page-info">Page {{ currentPage }} of {{ totalPages }}</span>
            <button class="btn btn-sm" :disabled="currentPage===totalPages" @click="currentPage++">Next →</button>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import api from '../api'

const states      = ref([])
const districts   = ref([])
const blocks      = ref([])
const villageList = ref([])
const activeTab   = ref('state')
const showForm    = ref('')
const saving      = ref(false)
const successMsg  = ref('')
const errorMsg    = ref('')

// Search and Filter
const searchQuery     = ref('')
const filterState     = ref('')
const filterDistrict  = ref('')
const filterBlock     = ref('')

// Pagination
const currentPage  = ref(1)
const itemsPerPage = ref(20)

const forms = ref({
  state:    { state_name: '' },
  district: { district_id: '', district_name: '', state_id: '' },
  block:    { block_id: '', block_name: '', district_id: '' },
  village:  { village_id: '', village_name: '', block_id: '', population: 0, total_households: 0 },
})

// Watch tab changes to reset search, filters, and pagination
watch(activeTab, () => {
  searchQuery.value = ''
  filterState.value = ''
  filterDistrict.value = ''
  filterBlock.value = ''
  currentPage.value = 1
  showForm.value = ''
})

// Watch search/filter changes to reset pagination
watch([searchQuery, filterState, filterDistrict, filterBlock], () => {
  currentPage.value = 1
})

// Filtered data
const filteredStates = computed(() => {
  if (!searchQuery.value) return states.value
  const q = searchQuery.value.toLowerCase()
  return states.value.filter(s => 
    s.state_name.toLowerCase().includes(q) ||
    s.state_id.toLowerCase().includes(q)
  )
})

const filteredDistricts = computed(() => {
  let result = districts.value
  if (filterState.value) {
    result = result.filter(d => d.state_id === filterState.value)
  }
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(d => 
      d.district_name.toLowerCase().includes(q) ||
      d.district_id.toLowerCase().includes(q) ||
      d.state_name.toLowerCase().includes(q)
    )
  }
  return result
})

const filteredBlocks = computed(() => {
  let result = blocks.value
  if (filterDistrict.value) {
    result = result.filter(b => b.district_id === filterDistrict.value)
  }
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(b => 
      b.block_name.toLowerCase().includes(q) ||
      b.block_id.toLowerCase().includes(q) ||
      b.district_name.toLowerCase().includes(q)
    )
  }
  return result
})

const filteredVillages = computed(() => {
  let result = villageList.value
  if (filterBlock.value) {
    result = result.filter(v => v.block_id === filterBlock.value)
  }
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(v => 
      v.village_name.toLowerCase().includes(q) ||
      v.village_id.toLowerCase().includes(q) ||
      v.block_name.toLowerCase().includes(q)
    )
  }
  return result
})

// Pagination computed properties
const totalPages = computed(() => {
  let total = 0
  if (activeTab.value === 'state') total = filteredStates.value.length
  else if (activeTab.value === 'district') total = filteredDistricts.value.length
  else if (activeTab.value === 'block') total = filteredBlocks.value.length
  else if (activeTab.value === 'village') total = filteredVillages.value.length
  return Math.ceil(total / itemsPerPage.value)
})

const paginatedStates = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return filteredStates.value.slice(start, end)
})

const paginatedDistricts = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return filteredDistricts.value.slice(start, end)
})

const paginatedBlocks = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return filteredBlocks.value.slice(start, end)
})

const paginatedVillages = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return filteredVillages.value.slice(start, end)
})

// Helper functions for counts
function getDistrictCount(stateId) {
  return districts.value.filter(d => d.state_id === stateId).length
}

function getBlockCount(districtId) {
  return blocks.value.filter(b => b.district_id === districtId).length
}

function getVillageCount(blockId) {
  return villageList.value.filter(v => v.block_id === blockId).length
}

function formatDate(dateString) {
  if (!dateString) return '—'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function toggleForm(name) {
  showForm.value = showForm.value === name ? '' : name
  errorMsg.value = ''
}

function flash(msg, isError = false) {
  if (isError) { errorMsg.value = msg; successMsg.value = '' }
  else         { successMsg.value = msg; errorMsg.value = '' }
  setTimeout(() => { successMsg.value = ''; errorMsg.value = '' }, 3500)
}

async function load() {
  const [s, d, b, v] = await Promise.all([
    api.get('/masters/states'), api.get('/masters/districts'),
    api.get('/masters/blocks'), api.get('/masters/villages'),
  ])
  states.value      = s.data
  districts.value   = d.data
  blocks.value      = b.data
  villageList.value = v.data
}

async function addState() {
  const f = forms.value.state
  if (!f.state_name.trim()) return (errorMsg.value = 'State name is required')
  saving.value = true
  try {
    await api.post('/masters/states', f)
    flash('State added successfully')
    forms.value.state = { state_name: '' }
    showForm.value  = ''
    await load()
  } catch (e) {
    flash(e.response?.data?.message || 'Failed to add state', true)
  } finally { saving.value = false }
}

async function addDistrict() {
  const f = forms.value.district
  if (!f.district_id || !f.district_name || !f.state_id)
    return (errorMsg.value = 'All district fields are required')
  saving.value = true
  try {
    await api.post('/masters/districts', f)
    flash('District added successfully')
    forms.value.district = { district_id: '', district_name: '', state_id: '' }
    showForm.value     = ''
    await load()
  } catch (e) {
    flash(e.response?.data?.message || 'Failed to add district', true)
  } finally { saving.value = false }
}

async function addBlock() {
  const f = forms.value.block
  if (!f.block_id || !f.block_name || !f.district_id)
    return (errorMsg.value = 'All block fields are required')
  saving.value = true
  try {
    await api.post('/masters/blocks', f)
    flash('Block added successfully')
    forms.value.block = { block_id: '', block_name: '', district_id: '' }
    showForm.value  = ''
    await load()
  } catch (e) {
    flash(e.response?.data?.message || 'Failed to add block', true)
  } finally { saving.value = false }
}

async function addVillage() {
  const f = forms.value.village
  if (!f.village_id || !f.village_name || !f.block_id)
    return (errorMsg.value = 'Village ID, name and block are required')
  saving.value = true
  try {
    await api.post('/masters/villages', f)
    flash('Village added successfully')
    forms.value.village = { village_id: '', village_name: '', block_id: '', population: 0, total_households: 0 }
    showForm.value    = ''
    await load()
  } catch (e) {
    flash(e.response?.data?.message || 'Failed to add village', true)
  } finally { saving.value = false }
}

onMounted(load)
</script>

<style scoped>
.hierarchy     { display:flex;align-items:center;flex-wrap:wrap;gap:0; }
.h-box         { background:white;border:2px solid var(--green);border-radius:6px;padding:7px 14px;font-size:13px;font-weight:700;color:var(--green-dark);box-shadow:var(--shadow); }
.h-box.active  { background:var(--green);color:white; }
.h-arrow       { font-size:16px;color:var(--grey-300);padding:0 5px; }

/* Tab navigation */
.tabs          { display:flex;border-bottom:2px solid var(--grey-200);gap:4px; }
.tab           { padding:12px 20px;background:transparent;border:none;cursor:pointer;transition:all .2s;
                 color:var(--grey-400);font-weight:500;font-size:14px;border-bottom:3px solid transparent;position:relative; }
.tab:hover     { background:var(--grey-50);color:var(--green-dark); }
.tab.active    { border-bottom:3px solid var(--green);color:var(--green);font-weight:600; }
.tab-count     { background:var(--grey-200);color:var(--grey-500);padding:2px 8px;border-radius:12px;font-size:11px;margin-left:6px;font-weight:600; }
.tab.active .tab-count { background:var(--green-light);color:var(--green-dark); }

/* Tab content */
.tab-content   { padding:20px; }
.tab-header    { display:flex;gap:12px;align-items:center;margin-bottom:16px;flex-wrap:wrap; }
.search-box    { flex:1;min-width:200px; }
.filter-box    { min-width:180px; }

/* Form card */
.form-card     { background:var(--green-pale);border:1px solid var(--green-light);border-radius:10px;padding:20px;margin-bottom:20px; }
.form-title    { font-size:16px;font-weight:600;margin-bottom:16px;color:var(--green-dark); }
.form-row      { display:flex;flex-wrap:wrap;gap:10px;margin-bottom:10px; }
.form-row .form-group { flex:1;min-width:160px;margin:0; }
.form-actions  { display:flex;justify-content:flex-end;gap:10px;margin-top:16px; }

/* Data table */
.data-table-container { overflow-x:auto;border:1px solid var(--grey-200);border-radius:8px; }
.data-table    { width:100%;border-collapse:collapse;background:white; }
.data-table thead { background:var(--grey-50); }
.data-table th { padding:12px;text-align:left;font-size:13px;font-weight:600;color:var(--grey-600);border-bottom:2px solid var(--grey-200); }
.data-table td { padding:12px;border-bottom:1px solid var(--grey-100); }
.data-table tbody tr:hover { background:var(--grey-50); }

/* Pagination */
.pagination    { display:flex;justify-content:center;align-items:center;gap:16px;margin-top:16px; }
.page-info     { color:var(--grey-400);font-size:13px; }

/* Badges and tags */
.badge-count   { background:var(--green-light);color:var(--green-dark);padding:4px 10px;border-radius:12px;font-size:12px;font-weight:600; }
.tag-blue      { background:#e3f2fd;color:#1976d2; }

/* Slide transition */
.slide-enter-active, .slide-leave-active { transition:all .2s ease;overflow:hidden; }
.slide-enter-from, .slide-leave-to { opacity:0;max-height:0;padding:0;margin:0; }
.slide-enter-to, .slide-leave-from { opacity:1;max-height:500px; }
</style>