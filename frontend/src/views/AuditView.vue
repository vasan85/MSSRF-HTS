<template>
  <div>
    <div class="breadcrumb">Home › <span>Audit Log</span></div>
    <div class="page-header"><div><div class="page-title">Audit & Change Log</div><div class="page-sub">System tracks all record creation, edits, and access events</div></div></div>
    <div class="card">
      <div class="search-bar">
        <select v-model="filters.module" class="form-select" style="width:130px" @change="load">
          <option value="">All Modules</option><option>Household</option><option>Project</option><option>ProjectLink</option><option>GIS</option>
        </select>
        <select v-model="filters.action" class="form-select" style="width:130px" @change="load">
          <option value="">All Actions</option><option>CREATE</option><option>UPDATE</option><option>DELETE</option><option>EXPORT</option>
        </select>
      </div>
      <div class="loading-center" v-if="loading"><div class="spinner"></div></div>
      <template v-else>
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th>Timestamp</th><th>User</th><th>Role</th><th>Module</th><th>Action</th><th>Record ID</th><th>Details</th></tr></thead>
            <tbody>
              <tr v-if="!rows.length"><td colspan="7"><div class="empty-state"><span class="icon">🕵️</span><p>No audit entries</p></div></td></tr>
              <tr v-for="r in rows" :key="r.id">
                <td style="font-size:12px;white-space:nowrap">{{ r.created_at?.slice(0,16).replace('T',' ') }}</td>
                <td>{{ r.user_name }}</td>
                <td><span :class="['tag', roleTag(r.role)]">{{ r.role }}</span></td>
                <td>{{ r.module }}</td>
                <td><span :class="['tag', actionTag(r.action)]">{{ r.action }}</span></td>
                <td><span class="id-badge">{{ r.record_id }}</span></td>
                <td style="font-size:12px">{{ r.detail }}</td>
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
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '../api'

const rows    = ref([])
const total   = ref(0)
const loading = ref(true)
const page    = ref(1)
const limit   = 30
const filters = ref({ module:'', action:'' })
const totalPages = computed(() => Math.max(1,Math.ceil(total.value/limit)))

const roleTag   = r => ({ admin:'tag-amber', enumerator:'tag-green', me:'tag-purple', mis_reviewer:'tag-teal', mis_head:'tag-grey' }[r]||'tag-grey')
const actionTag = a => ({ CREATE:'tag-green', UPDATE:'tag-blue', DELETE:'tag-red', EXPORT:'tag-teal' }[a]||'tag-grey')

async function load() {
  loading.value = true
  const { data } = await api.get('/audit', { params: { ...filters.value, page: page.value, limit } })
  rows.value = data.data; total.value = data.total; loading.value = false
}

function changePage(p) { if(p<1||p>totalPages.value) return; page.value=p; load() }

onMounted(load)
</script>
