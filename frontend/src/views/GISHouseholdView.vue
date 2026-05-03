<template>
  <div>
    <div class="breadcrumb">Home › GIS › <span>GPS Dot Map</span></div>
    <div class="page-header">
      <div>
        <div class="page-title">📍 GPS Dot Map</div>
        <div class="page-sub">Individual household GPS pins — field-captured coordinates</div>
      </div>
      <RouterLink to="/gis" class="btn btn-outline btn-sm">← GIS Explorer</RouterLink>
    </div>

    <div class="stat-grid stat-grid-4" style="margin-bottom:16px">
      <div class="stat-tile">
        <div class="stat-value">{{ totalHH }}</div>
        <div class="stat-label">Total Registered HH</div>
      </div>
      <div class="stat-tile teal">
        <div class="stat-value">{{ geotagged }}</div>
        <div class="stat-label">HH with GPS</div>
      </div>
      <div class="stat-tile amber">
        <div class="stat-value">{{ totalHH - geotagged }}</div>
        <div class="stat-label">Pending GPS</div>
      </div>
      <div class="stat-tile blue">
        <div class="stat-value">{{ geotaggedPct }}%</div>
        <div class="stat-label">Geo-tagged Coverage</div>
      </div>
    </div>

    <div class="loading-center" v-if="loading"><div class="spinner spinner-lg"></div></div>

    <template v-else>
      <div class="card" style="padding:0;overflow:hidden">
        <!-- Geo filter bar -->
        <div class="geo-bar">
          <select v-model="geo.state_id" class="form-select geo-sel" @change="onStateChange">
            <option value="">All States</option>
            <option v-for="s in geo.states" :key="s.state_id" :value="s.state_id">{{ s.state_name }}</option>
          </select>
          <select v-model="geo.district_id" class="form-select geo-sel" @change="onDistrictChange" :disabled="!geo.state_id">
            <option value="">All Districts</option>
            <option v-for="d in geo.districts" :key="d.district_id" :value="d.district_id">{{ d.district_name }}</option>
          </select>
          <select v-model="geo.block_id" class="form-select geo-sel" @change="onBlockChange" :disabled="!geo.district_id">
            <option value="">All Blocks</option>
            <option v-for="b in geo.blocks" :key="b.block_id" :value="b.block_id">{{ b.block_name }}</option>
          </select>
          <select v-model="geo.village_id" class="form-select geo-sel" @change="loadHH" :disabled="!geo.block_id">
            <option value="">All Villages</option>
            <option v-for="v in geo.villages" :key="v.village_id" :value="v.village_id">{{ v.village_name }}</option>
          </select>
          <button v-if="geo.state_id || geo.district_id || geo.block_id || geo.village_id"
                  class="btn btn-outline btn-sm" @click="resetGeo" style="white-space:nowrap">✕ Clear</button>
        </div>

        <!-- Mode toolbar -->
        <div class="hh-toolbar">
          <div class="mode-tabs">
            <button :class="['mode-btn', colorMode==='status' && 'active']"        @click="setMode('status')">By Beneficiary</button>
            <button :class="['mode-btn', colorMode==='category' && 'active']"      @click="setMode('category')">By Category</button>
            <button :class="['mode-btn', colorMode==='vulnerability' && 'active']" @click="setMode('vulnerability')">By Vulnerability</button>
          </div>
          <div class="hh-count">
            <strong>{{ geoHH.length }}</strong> pins
            <span v-if="noGpsHH.length" style="color:var(--amber)"> · {{ noGpsHH.length }} without GPS</span>
          </div>
        </div>

        <!-- Map — Leaflet mounts here; legend is injected as a Leaflet control -->
        <div id="hh-map" style="height:480px;width:100%"></div>
      </div>

      <!-- Pending GPS table -->
      <div v-if="noGpsHH.length" class="card" style="margin-top:18px">
        <div class="card-header">
          <div>
            <div class="card-title">⚠️ Households Pending GPS Collection</div>
            <div class="card-sub">{{ noGpsHH.length }} households without coordinates</div>
          </div>
        </div>
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Household ID</th>
                <th>Head of HH</th>
                <th>Village</th>
                <th>Social Category</th>
                <th>Female-headed</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="h in noGpsHH.slice(0, 20)" :key="h.household_id">
                <td><span class="id-badge">{{ h.household_id }}</span></td>
                <td>{{ h.head_name }}</td>
                <td>{{ h.village_name }}</td>
                <td><span class="tag tag-grey">{{ h.social_category || '—' }}</span></td>
                <td>{{ h.female_headed_household === 'Yes' ? '✓ Yes' : '—' }}</td>
                <td>
                  <RouterLink :to="`/households/${h.household_id}/edit`" class="btn btn-teal btn-xs">📍 Add GPS</RouterLink>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div v-else class="alert alert-info" style="margin-top:16px">
        ✅ All {{ totalHH }} households are geotagged!
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { RouterLink } from 'vue-router'
import { useLeaflet } from '../composables/useLeaflet'
import api from '../api'

const { loadLeaflet } = useLeaflet()

const CATEGORY_COLORS = {
  SC: '#d32f2f', ST: '#e65100', OBC: '#1565c0',
  MBC: '#6a1b9a', General: '#37474f', EWS: '#00695c',
}

const allHH       = ref([])
const geoHH       = ref([])
const noGpsHH     = ref([])
const loading     = ref(true)
const colorMode   = ref('status')
const projectCount = ref({})

const geo = ref({
  state_id: '', district_id: '', block_id: '', village_id: '',
  states: [], districts: [], blocks: [], villages: [],
})

let leafletMap    = null
let pinGroup      = null
let legendControl = null

const totalHH      = computed(() => allHH.value.length)
const geotagged    = computed(() => allHH.value.filter(h => h.gps_latitude).length)
const geotaggedPct = computed(() =>
  totalHH.value ? ((geotagged.value / totalHH.value) * 100).toFixed(1) : 0
)

const villageCenters = {
  V01: [12.9141, 80.2011], V02: [12.9073, 80.2289],
  V03: [12.9208, 80.0736], V04: [12.9631, 79.9218],
}

function pinColor(h) {
  const isBen = (projectCount.value[h.household_id] || 0) > 0
  switch (colorMode.value) {
    case 'status':
      return isBen ? '#1b7a3e' : '#1565c0'
    case 'category':
      return CATEGORY_COLORS[h.social_category] || '#9e9e9e'
    case 'vulnerability':
      if (h.female_headed_household === 'Yes' || h.differently_abled === 'Yes') return '#d32f2f'
      if (h.social_category === 'SC' || h.social_category === 'ST') return '#f59e0b'
      return '#2e7d32'
    default:
      return '#2e7d32'
  }
}

function buildLegendHTML() {
  const s = 'display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:6px;vertical-align:middle'
  if (colorMode.value === 'status') {
    return `
      <b style="display:block;margin-bottom:4px;color:#1b5e20">Beneficiary Status</b>
      <div><span style="${s};background:#1b7a3e"></span>MSSRF Beneficiary</div>
      <div><span style="${s};background:#1565c0"></span>Registered (not yet)</div>`
  }
  if (colorMode.value === 'category') {
    return `<b style="display:block;margin-bottom:4px;color:#1b5e20">Social Category</b>` +
      Object.entries(CATEGORY_COLORS).map(([cat, c]) =>
        `<div><span style="${s};background:${c}"></span>${cat}</div>`
      ).join('')
  }
  return `
    <b style="display:block;margin-bottom:4px;color:#1b5e20">Vulnerability</b>
    <div><span style="${s};background:#d32f2f"></span>High (Female HH / Diff-abled)</div>
    <div><span style="${s};background:#f59e0b"></span>Moderate (SC / ST)</div>
    <div><span style="${s};background:#2e7d32"></span>Standard</div>`
}

function updateLegend() {
  if (!leafletMap || !window.L) return
  const L = window.L
  if (legendControl) { legendControl.remove(); legendControl = null }
  legendControl = L.control({ position: 'bottomright' })
  legendControl.onAdd = () => {
    const d = L.DomUtil.create('div')
    d.style.cssText = 'background:white;padding:10px 14px;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,.15);font-size:12px;font-family:Nunito,sans-serif;font-weight:600;line-height:1.9;max-width:200px'
    d.innerHTML = buildLegendHTML()
    return d
  }
  legendControl.addTo(leafletMap)
}

// ── Geo cascade handlers ───────────────────────────────
async function onStateChange() {
  geo.value.district_id = ''; geo.value.districts = []
  geo.value.block_id = '';    geo.value.blocks = []
  geo.value.village_id = '';  geo.value.villages = []
  if (geo.value.state_id) {
    const { data } = await api.get('/masters/hh-districts', { params: { state_id: geo.value.state_id } })
    geo.value.districts = data
  }
  loadHH()
}

async function onDistrictChange() {
  geo.value.block_id = '';   geo.value.blocks = []
  geo.value.village_id = ''; geo.value.villages = []
  if (geo.value.district_id) {
    const { data } = await api.get('/masters/hh-blocks', { params: { district_id: geo.value.district_id } })
    geo.value.blocks = data
  }
  loadHH()
}

async function onBlockChange() {
  geo.value.village_id = ''; geo.value.villages = []
  if (geo.value.block_id) {
    const { data } = await api.get('/masters/hh-villages', { params: { block_id: geo.value.block_id } })
    geo.value.villages = data
  }
  loadHH()
}

function resetGeo() {
  geo.value.state_id = '';   geo.value.states = geo.value.states  // keep states list
  geo.value.district_id = ''; geo.value.districts = []
  geo.value.block_id = '';    geo.value.blocks = []
  geo.value.village_id = '';  geo.value.villages = []
  loadHH()
}

function setMode(mode) {
  colorMode.value = mode
  updateLegend()
  redrawPins()
}

async function initMap() {
  const L = await loadLeaflet()
  if (!L) return
  await nextTick()
  const el = document.getElementById('hh-map')
  if (!el || leafletMap) return

  leafletMap = L.map('hh-map', { center: [12.92, 80.15], zoom: 12 })
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  }).addTo(leafletMap)

  updateLegend()
  redrawPins()
}

function redrawPins() {
  if (!leafletMap || !window.L) return
  const L = window.L
  if (pinGroup) { leafletMap.removeLayer(pinGroup); pinGroup = null }
  pinGroup = L.layerGroup().addTo(leafletMap)
  const bounds = []

  geoHH.value.forEach(h => {
    const lat = parseFloat(h.gps_latitude)
    const lng = parseFloat(h.gps_longitude)
    if (isNaN(lat) || isNaN(lng)) return
    bounds.push([lat, lng])

    const isBen = (projectCount.value[h.household_id] || 0) > 0
    const color = pinColor(h)

    L.circleMarker([lat, lng], {
      radius: 8, fillColor: color, fillOpacity: 0.9, color: 'white', weight: 1.5,
    }).bindPopup(`
      <div style="font-family:Nunito,sans-serif;min-width:170px">
        <div style="font-size:13px;font-weight:800;color:#1b5e20;margin-bottom:4px">🏠 ${h.head_name}</div>
        <div style="font-size:11px;color:#9e9e9e;margin-bottom:8px">${h.household_id} · ${h.village_name}</div>
        <table style="font-size:12px;width:100%;border-collapse:collapse">
          <tr><td style="color:#616161;padding:2px 0">Category</td><td style="text-align:right;font-weight:700">${h.social_category || '—'}</td></tr>
          <tr><td style="color:#616161;padding:2px 0">Female HH</td><td style="text-align:right;font-weight:700">${h.female_headed_household === 'Yes' ? 'Yes' : 'No'}</td></tr>
          <tr><td style="color:#616161;padding:2px 0">Beneficiary</td>
              <td style="text-align:right;font-weight:700;color:${isBen ? '#1b7a3e' : '#1565c0'}">${isBen ? '✓ Yes' : 'Not yet'}</td></tr>
          <tr><td style="color:#616161;padding:2px 0">GPS</td>
              <td style="text-align:right;font-weight:700;color:#2e7d32">${lat.toFixed(4)}, ${lng.toFixed(4)}</td></tr>
        </table>
      </div>
    `, { maxWidth: 220 }).addTo(pinGroup)
  })

  // Grey dashed circles for villages with pending GPS
  const clusterCount = {}
  noGpsHH.value.forEach(h => { clusterCount[h.village_id] = (clusterCount[h.village_id] || 0) + 1 })
  Object.entries(clusterCount).forEach(([vid, cnt]) => {
    const c = villageCenters[vid]; if (!c) return
    L.circle(c, { radius: 600, fillColor: '#9e9e9e', fillOpacity: 0.06, color: '#9e9e9e', weight: 1, dashArray: '4 4' })
      .bindTooltip(`${cnt} HH without GPS in this area`).addTo(pinGroup)
  })

  if (bounds.length) leafletMap.fitBounds(bounds, { padding: [48, 48], maxZoom: 14 })
  else leafletMap.setView([12.92, 80.15], 12)
}

async function loadHH() {
  const params = { limit: 1000 }
  if (geo.value.village_id)  params.village_id  = geo.value.village_id
  else if (geo.value.block_id)    params.block_id    = geo.value.block_id
  else if (geo.value.district_id) params.district_id = geo.value.district_id
  else if (geo.value.state_id)    params.state_id    = geo.value.state_id

  const [hhRes, gisRes] = await Promise.all([
    api.get('/households', { params }),
    api.get('/dashboard/gis-households'),
  ])

  allHH.value   = hhRes.data.data
  geoHH.value   = allHH.value.filter(h => h.gps_latitude)
  noGpsHH.value = allHH.value.filter(h => !h.gps_latitude)

  const pcMap = {}
  gisRes.data.forEach(h => { pcMap[h.household_id] = h.project_count || 0 })
  projectCount.value = pcMap

  if (leafletMap) { updateLegend(); redrawPins() }
}

onMounted(async () => {
  const { data } = await api.get('/masters/hh-states')
  geo.value.states = data
  await loadHH()
  loading.value = false
  await nextTick()
  initMap()
})

onUnmounted(() => { if (leafletMap) { leafletMap.remove(); leafletMap = null } })
</script>

<style scoped>
.geo-bar     { display:flex;align-items:center;gap:8px;padding:10px 16px;border-bottom:1px solid var(--grey-200);background:#f8fdf8;flex-wrap:wrap; }
.geo-sel     { width:148px;font-size:13px; }
.hh-toolbar  { display:flex;align-items:center;gap:12px;padding:8px 16px;border-bottom:1px solid var(--grey-200);background:var(--grey-50);flex-wrap:wrap; }
.mode-tabs   { display:flex;border:1.5px solid var(--grey-300);border-radius:8px;overflow:hidden; }
.mode-btn    { padding:6px 14px;background:white;border:none;cursor:pointer;font-size:12px;font-weight:700;color:var(--grey-600);border-right:1.5px solid var(--grey-300);transition:all .15s; }
.mode-btn:last-child { border-right:none; }
.mode-btn:hover { background:var(--grey-100); }
.mode-btn.active { background:var(--green);color:white; }
.hh-count    { margin-left:auto;font-size:12px;color:var(--grey-500);font-weight:600; }
:global(.leaflet-container)             { font-family:'Nunito',sans-serif !important; }
:global(.leaflet-popup-content)         { font-family:'Nunito',sans-serif !important; margin:12px 14px !important; }
:global(.leaflet-popup-content-wrapper) { border-radius:10px !important; box-shadow:0 4px 16px rgba(0,0,0,.15) !important; }
</style>
