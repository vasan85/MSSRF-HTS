<template>
  <div>
    <div class="breadcrumb">Home › <span>GIS Explorer</span></div>
    <div class="page-header">
      <div>
        <div class="page-title">🗺️ GIS Explorer</div>
        <div class="page-sub">5-layer spatial analysis — coverage, vulnerability, WASH, health risk &amp; assets</div>
      </div>
      <RouterLink to="/gis-hh" class="btn btn-teal btn-sm">📍 GPS Dot Map →</RouterLink>
    </div>

    <!-- Layer tabs -->
    <div class="layer-tabs">
      <button v-for="layer in LAYERS" :key="layer.key"
              :class="['layer-tab', activeLayer === layer.key && 'active']"
              @click="switchLayer(layer.key)">
        {{ layer.icon }} {{ layer.label }}
      </button>
    </div>

    <div class="loading-center" v-if="loading"><div class="spinner spinner-lg"></div></div>

    <template v-else>
      <!-- KPI strip -->
      <div class="stat-grid stat-grid-4" style="margin-bottom:16px">
        <div v-for="k in kpis" :key="k.label" :class="['stat-tile', k.cls]">
          <div class="stat-value">{{ k.value }}</div>
          <div class="stat-label">{{ k.label }}</div>
        </div>
      </div>

      <div class="gis-layout">
        <!-- Map card -->
        <div class="card" style="padding:0;overflow:hidden">
          <div class="map-toolbar">
            <span style="font-size:13px;font-weight:800;color:var(--green)">
              {{ activeLayerDef.icon }} {{ activeLayerDef.label }}
            </span>
            <span v-if="layerLoading" class="spinner" style="width:16px;height:16px;margin-left:6px"></span>
            <div style="margin-left:auto;display:flex;gap:6px">
              <button :class="['btn btn-sm', dotView==='pins'?'btn-primary':'btn-outline']"
                      @click="dotView='pins'; drawMarkers()">📍 Pins</button>
              <button :class="['btn btn-sm', dotView==='heat'?'btn-teal':'btn-outline']"
                      @click="dotView='heat'; drawMarkers()">🔥 Heat</button>
            </div>
          </div>
          <div id="gis-map" style="height:520px;width:100%"></div>
          <div v-if="mapError" class="map-error">⚠️ Map tiles unavailable — check internet connection</div>
        </div>

        <!-- Side panel -->
        <div class="gis-panel">
          <!-- Selected village detail -->
          <div class="card" v-if="selectedVillage">
            <div class="card-header" style="align-items:flex-start">
              <div style="flex:1">
                <div class="card-title">📍 {{ selectedVillage.village_name }}</div>
                <div class="card-sub">{{ selectedVillage.block_name }}, {{ selectedVillage.district_name }}</div>
              </div>
              <span :class="['tag', scoreTagClass(getScore(selectedVillage))]">
                {{ getScore(selectedVillage).toFixed(1) }}%
              </span>
            </div>
            <div class="detail-grid">
              <div v-for="f in detailFields" :key="f.label" class="detail-row">
                <span>{{ f.label }}</span>
                <strong :style="f.color ? { color: f.color } : {}">{{ f.value }}</strong>
              </div>
            </div>
          </div>
          <div class="card" v-else>
            <div class="empty-state" style="min-height:140px">
              <span class="icon">🗺️</span><p>Click a village pin</p>
            </div>
          </div>

          <!-- Village list -->
          <div class="card" style="margin-top:0">
            <div class="card-header">
              <div class="card-title">Villages</div>
              <span style="font-size:11px;color:var(--grey-500)">{{ currentVillages.length }} total</span>
            </div>
            <div class="village-list">
              <div v-for="v in currentVillages" :key="v.village_id"
                   :class="['vill-row', selectedVillage?.village_id === v.village_id && 'selected']"
                   @click="selectVillage(v)">
                <div style="display:flex;justify-content:space-between;align-items:center">
                  <span style="font-size:13px;font-weight:700">{{ v.village_name }}</span>
                  <span :class="['tag', scoreTagClass(getScore(v))]">{{ getScore(v).toFixed(1) }}%</span>
                </div>
                <div class="progress-bar" style="margin-top:5px">
                  <div class="progress-fill"
                       :style="{ width: Math.min(getScore(v), 100) + '%', background: layerColor(v) }"></div>
                </div>
                <div style="font-size:11px;color:var(--grey-500);margin-top:3px">
                  {{ activeLayerDef.sublabel(v) }}
                </div>
              </div>
            </div>
          </div>
        </div>
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

const LAYERS = [
  {
    key: 'coverage', label: 'Coverage', icon: '📊', inverse: false,
    endpoint: '/dashboard/gis-villages',
    sublabel: v => `${v.benefitted_hh} / ${v.total_households} HH benefitted`,
  },
  {
    key: 'vulnerability', label: 'Vulnerability', icon: '⚠️', inverse: true,
    endpoint: '/dashboard/gis-vulnerability',
    sublabel: v => `${v.female_hh_count || 0} female-headed · ${v.diff_abled_count || 0} diff-abled`,
  },
  {
    key: 'wash', label: 'WASH', icon: '💧', inverse: false,
    endpoint: '/dashboard/gis-wash',
    sublabel: v => `ODF ${v.odf_pct ?? 0}% · Piped ${v.piped_pct ?? 0}%`,
  },
  {
    key: 'health', label: 'Health Risk', icon: '🏥', inverse: true,
    endpoint: '/dashboard/gis-health',
    sublabel: v => `Chronic ${v.chronic_pct ?? 0}% · Uninsured ${v.uninsured_pct ?? 0}%`,
  },
  {
    key: 'assets', label: 'Asset Index', icon: '🌾', inverse: false,
    endpoint: '/dashboard/gis-assets',
    sublabel: v => `Land ${v.land_pct ?? 0}% · SHG ${v.shg_pct ?? 0}%`,
  },
]

const activeLayer    = ref('coverage')
const loading        = ref(true)
const layerLoading   = ref(false)
const mapError       = ref(false)
const dotView        = ref('pins')
const selectedVillage = ref(null)
const layerCache     = ref({})

let leafletMap    = null
let markerGroup   = null
let legendControl = null

const activeLayerDef  = computed(() => LAYERS.find(l => l.key === activeLayer.value))
const currentVillages = computed(() => layerCache.value[activeLayer.value] || [])

// ── Score computation ──────────────────────────────────
function n(val) { return parseFloat(val) || 0 }

function getScore(v) {
  switch (activeLayer.value) {
    case 'coverage':      return n(v.coverage_pct)
    case 'vulnerability': return (n(v.female_hh_pct) + n(v.diff_abled_pct) + n(v.migrant_pct)) / 3
    case 'wash':          return (n(v.odf_pct) + n(v.piped_pct) + n(v.electricity_pct)) / 3
    case 'health':        return (n(v.chronic_pct) + n(v.uninsured_pct)) / 2
    case 'assets':        return (n(v.land_pct) + n(v.livestock_pct) + n(v.shg_pct)) / 3
    default:              return 0
  }
}

function scoreColor(score, inverse) {
  if (inverse) return score >= 50 ? '#d32f2f' : score >= 25 ? '#f59e0b' : '#2e7d32'
  return score >= 70 ? '#2e7d32' : score >= 40 ? '#f59e0b' : '#d32f2f'
}

function layerColor(v) {
  return scoreColor(getScore(v), activeLayerDef.value.inverse)
}

function scoreTagClass(score) {
  const inv = activeLayerDef.value.inverse
  if (inv) return score >= 50 ? 'tag-red' : score >= 25 ? 'tag-amber' : 'tag-green'
  return score >= 70 ? 'tag-green' : score >= 40 ? 'tag-amber' : 'tag-red'
}

// ── KPI strip ─────────────────────────────────────────
const kpis = computed(() => {
  const vv = currentVillages.value
  if (!vv.length) return []
  const avg = arr => arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : 0

  switch (activeLayer.value) {
    case 'coverage': {
      const h = vv.filter(v => v.coverage_pct >= 80).length
      const m = vv.filter(v => v.coverage_pct >= 50 && v.coverage_pct < 80).length
      const l = vv.filter(v => v.coverage_pct < 50).length
      return [
        { label: 'Villages Mapped',       value: vv.length, cls: '' },
        { label: 'High Coverage (>80%)',   value: h, cls: 'blue' },
        { label: 'Medium (50–80%)',        value: m, cls: 'amber' },
        { label: 'Low Coverage (<50%)',    value: l, cls: 'red' },
      ]
    }
    case 'vulnerability': {
      const high = vv.filter(v => getScore(v) >= 50).length
      const mod  = vv.filter(v => getScore(v) >= 25 && getScore(v) < 50).length
      return [
        { label: 'Villages Assessed',     value: vv.length, cls: '' },
        { label: 'High Vulnerability',    value: high, cls: 'red' },
        { label: 'Moderate Vulnerability', value: mod, cls: 'amber' },
        { label: 'Avg Female-headed %',   value: avg(vv.map(v => n(v.female_hh_pct))) + '%', cls: '' },
      ]
    }
    case 'wash': {
      const high = vv.filter(v => getScore(v) >= 70).length
      return [
        { label: 'Villages Assessed',     value: vv.length, cls: '' },
        { label: 'Good WASH Score (≥70%)', value: high, cls: 'blue' },
        { label: 'Avg WASH Score',        value: avg(vv.map(v => getScore(v))) + '%', cls: 'teal' },
        { label: 'Avg ODF %',             value: avg(vv.map(v => n(v.odf_pct))) + '%', cls: '' },
      ]
    }
    case 'health': {
      const high = vv.filter(v => getScore(v) >= 50).length
      return [
        { label: 'Villages Assessed',     value: vv.length, cls: '' },
        { label: 'High Risk Villages',    value: high, cls: 'red' },
        { label: 'Avg Chronic Illness %', value: avg(vv.map(v => n(v.chronic_pct))) + '%', cls: 'amber' },
        { label: 'Avg Uninsured %',       value: avg(vv.map(v => n(v.uninsured_pct))) + '%', cls: '' },
      ]
    }
    case 'assets': {
      const high = vv.filter(v => getScore(v) >= 70).length
      return [
        { label: 'Villages Assessed',     value: vv.length, cls: '' },
        { label: 'Asset-rich Villages',   value: high, cls: 'blue' },
        { label: 'Avg Asset Score',       value: avg(vv.map(v => getScore(v))) + '%', cls: 'teal' },
        { label: 'Avg SHG Coverage',      value: avg(vv.map(v => n(v.shg_pct))) + '%', cls: '' },
      ]
    }
    default: return []
  }
})

// ── Detail fields for selected village ────────────────
const detailFields = computed(() => {
  const _ = activeLayer.value  // track dependency
  const v = selectedVillage.value
  if (!v) return []
  switch (activeLayer.value) {
    case 'coverage': return [
      { label: 'Total HH',       value: v.total_households },
      { label: 'Registered HH',  value: v.registered_hh },
      { label: 'Benefitted HH',  value: v.benefitted_hh },
      { label: 'Coverage %',     value: `${v.coverage_pct}%`, color: scoreColor(v.coverage_pct, false) },
      { label: 'Geotagged HH',   value: v.geotagged_hh || 0 },
    ]
    case 'vulnerability': return [
      { label: 'Total HH Surveyed',     value: v.total_hh },
      { label: 'Female-headed HH',      value: `${v.female_hh_pct}% (${v.female_hh_count})` },
      { label: 'Differently-abled HH',  value: `${v.diff_abled_pct}% (${v.diff_abled_count})` },
      { label: 'Migrant HH',            value: `${v.migrant_pct}% (${v.migrant_count})` },
      { label: 'Vuln. Index',           value: `${getScore(v).toFixed(1)}%`, color: scoreColor(getScore(v), true) },
    ]
    case 'wash': return [
      { label: 'Total HH Surveyed',  value: v.total_hh },
      { label: 'ODF (toilet access)', value: `${v.odf_pct}%` },
      { label: 'Piped Water',        value: `${v.piped_pct}%` },
      { label: 'Electricity',        value: `${v.electricity_pct}%` },
      { label: 'LPG Cooking',        value: `${v.lpg_pct}%` },
      { label: 'Pucca Housing',      value: `${v.pucca_pct}%` },
    ]
    case 'health': return [
      { label: 'Total HH Surveyed',  value: v.total_hh },
      { label: 'Chronic Illness',    value: `${v.chronic_pct}%`, color: n(v.chronic_pct) >= 30 ? '#d32f2f' : null },
      { label: 'Uninsured HH',       value: `${v.uninsured_pct}%`, color: n(v.uninsured_pct) >= 50 ? '#d32f2f' : null },
      { label: 'Anganwadi Access',   value: `${v.anganwadi_pct}%` },
      { label: 'Pregnant/Lactating', value: `${v.pregnant_pct}%` },
      { label: 'Children U-5',       value: v.children_u5 },
    ]
    case 'assets': return [
      { label: 'Total HH Surveyed', value: v.total_hh },
      { label: 'Land Ownership',    value: `${v.land_pct}%` },
      { label: 'Livestock',         value: `${v.livestock_pct}%` },
      { label: 'SHG Membership',    value: `${v.shg_pct}%` },
      { label: 'FPO Membership',    value: `${v.fpo_pct}%` },
      { label: 'Credit Access',     value: `${v.credit_pct}%` },
    ]
    default: return []
  }
})

// ── Map legend HTML ────────────────────────────────────
function buildLegendHTML() {
  const layer = activeLayerDef.value
  const items = layer.inverse
    ? [
        { color: '#d32f2f', label: '≥50% (High Risk)' },
        { color: '#f59e0b', label: '25–50% (Moderate)' },
        { color: '#2e7d32', label: '<25% (Low Risk)' },
      ]
    : [
        { color: '#2e7d32', label: '≥70% (High)' },
        { color: '#f59e0b', label: '40–70% (Medium)' },
        { color: '#d32f2f', label: '<40% (Low)' },
      ]
  const rows = items.map(i =>
    `<div><span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${i.color};margin-right:7px;vertical-align:middle"></span>${i.label}</div>`
  ).join('')
  return `<div style="font-weight:800;margin-bottom:4px;color:#1b5e20">${layer.icon} ${layer.label}</div>${rows}`
}

// ── Map init & draw ────────────────────────────────────
async function initMap() {
  const L = await loadLeaflet()
  if (!L) { mapError.value = true; return }
  await nextTick()
  const el = document.getElementById('gis-map')
  if (!el || leafletMap) return

  leafletMap = L.map('gis-map', { center: [12.92, 80.15], zoom: 11 })
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  }).addTo(leafletMap)

  updateLegend()
  drawMarkers()
}

function updateLegend() {
  if (!leafletMap || !window.L) return
  const L = window.L
  if (legendControl) { legendControl.remove(); legendControl = null }
  legendControl = L.control({ position: 'bottomleft' })
  legendControl.onAdd = () => {
    const d = L.DomUtil.create('div')
    d.style.cssText = 'background:white;padding:10px 14px;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,.15);font-size:12px;font-family:Nunito,sans-serif;font-weight:600;line-height:1.9'
    d.innerHTML = buildLegendHTML()
    return d
  }
  legendControl.addTo(leafletMap)
}

function markerRadius(v) {
  const count = v.total_hh || v.benefitted_hh || v.total_households || 5
  const base = dotView.value === 'heat' ? 14 : 10
  return Math.max(base, Math.min(42, base + count / 4))
}

function drawMarkers() {
  if (!leafletMap || !window.L) return
  const L = window.L
  if (markerGroup) { leafletMap.removeLayer(markerGroup); markerGroup = null }
  markerGroup = L.layerGroup().addTo(leafletMap)
  const bounds = []

  currentVillages.value.forEach(v => {
    if (!v.lat || !v.lng) return
    bounds.push([v.lat, v.lng])

    const score   = getScore(v)
    const color   = layerColor(v)
    const opacity = dotView.value === 'heat'
      ? Math.max(0.3, Math.min(0.9, 0.3 + score / 120))
      : 0.82

    const circle = L.circleMarker([v.lat, v.lng], {
      radius: markerRadius(v), fillColor: color,
      fillOpacity: opacity, color: 'white', weight: 2.5,
    }).addTo(markerGroup)

    circle.bindPopup(buildPopup(v, score, color), { maxWidth: 260 })
    circle.on('click', () => { selectedVillage.value = v })

    L.marker([v.lat, v.lng], {
      icon: L.divIcon({
        className: '',
        html: `<div style="background:rgba(255,255,255,.92);border:1px solid #e0e0e0;border-radius:4px;padding:2px 8px;font-size:11px;font-weight:700;color:#1b5e20;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,.12);font-family:Nunito,sans-serif;pointer-events:none">${v.village_name}</div>`,
        iconAnchor: [-(markerRadius(v) + 4), 10],
      }),
      interactive: false,
    }).addTo(markerGroup)
  })

  if (bounds.length) leafletMap.fitBounds(bounds, { padding: [60, 60], maxZoom: 13 })
}

function buildPopup(v, score, color) {
  let rows = ''
  switch (activeLayer.value) {
    case 'coverage':
      rows = `
        <tr><td>Total HH</td><td style="text-align:right;font-weight:700">${v.total_households}</td></tr>
        <tr><td>Registered</td><td style="text-align:right;font-weight:700">${v.registered_hh}</td></tr>
        <tr><td>Benefitted</td><td style="text-align:right;font-weight:700">${v.benefitted_hh}</td></tr>
        <tr><td style="color:${color}">Coverage</td><td style="text-align:right;font-weight:800;color:${color}">${v.coverage_pct}%</td></tr>`
      break
    case 'vulnerability':
      rows = `
        <tr><td>Female HH</td><td style="text-align:right;font-weight:700">${v.female_hh_pct}%</td></tr>
        <tr><td>Diff-abled HH</td><td style="text-align:right;font-weight:700">${v.diff_abled_pct}%</td></tr>
        <tr><td>Migrant HH</td><td style="text-align:right;font-weight:700">${v.migrant_pct}%</td></tr>
        <tr><td style="color:${color}">Vuln. Index</td><td style="text-align:right;font-weight:800;color:${color}">${score.toFixed(1)}%</td></tr>`
      break
    case 'wash':
      rows = `
        <tr><td>ODF</td><td style="text-align:right;font-weight:700">${v.odf_pct}%</td></tr>
        <tr><td>Piped Water</td><td style="text-align:right;font-weight:700">${v.piped_pct}%</td></tr>
        <tr><td>Electricity</td><td style="text-align:right;font-weight:700">${v.electricity_pct}%</td></tr>
        <tr><td style="color:${color}">WASH Score</td><td style="text-align:right;font-weight:800;color:${color}">${score.toFixed(1)}%</td></tr>`
      break
    case 'health':
      rows = `
        <tr><td>Chronic Illness</td><td style="text-align:right;font-weight:700">${v.chronic_pct}%</td></tr>
        <tr><td>Uninsured</td><td style="text-align:right;font-weight:700">${v.uninsured_pct}%</td></tr>
        <tr><td>Anganwadi</td><td style="text-align:right;font-weight:700">${v.anganwadi_pct}%</td></tr>
        <tr><td style="color:${color}">Risk Score</td><td style="text-align:right;font-weight:800;color:${color}">${score.toFixed(1)}%</td></tr>`
      break
    case 'assets':
      rows = `
        <tr><td>Land</td><td style="text-align:right;font-weight:700">${v.land_pct}%</td></tr>
        <tr><td>Livestock</td><td style="text-align:right;font-weight:700">${v.livestock_pct}%</td></tr>
        <tr><td>SHG</td><td style="text-align:right;font-weight:700">${v.shg_pct}%</td></tr>
        <tr><td style="color:${color}">Asset Score</td><td style="text-align:right;font-weight:800;color:${color}">${score.toFixed(1)}%</td></tr>`
      break
  }
  return `
    <div style="min-width:180px;font-family:Nunito,sans-serif">
      <div style="font-size:14px;font-weight:800;color:#1b5e20;margin-bottom:4px">📍 ${v.village_name}</div>
      <div style="font-size:11px;color:#9e9e9e;margin-bottom:8px">${v.block_name} · ${v.district_name}</div>
      <table style="width:100%;font-size:12px;border-collapse:collapse">
        <colgroup><col style="color:#616161"><col style="text-align:right"></colgroup>
        ${rows}
      </table>
    </div>`
}

// ── Layer switching ────────────────────────────────────
async function switchLayer(key) {
  activeLayer.value = key
  if (!layerCache.value[key]) {
    layerLoading.value = true
    try {
      const layer = LAYERS.find(l => l.key === key)
      const { data } = await api.get(layer.endpoint)
      layerCache.value[key] = data
    } catch (e) {
      console.error(`GIS layer ${key} load error:`, e)
      layerCache.value[key] = []
    } finally {
      layerLoading.value = false
    }
  }
  selectedVillage.value = currentVillages.value[0] || null
  updateLegend()
  drawMarkers()
}

function selectVillage(v) {
  selectedVillage.value = v
  if (leafletMap && v.lat && v.lng)
    leafletMap.setView([v.lat, v.lng], 13, { animate: true, duration: 0.5 })
}

// ── Lifecycle ──────────────────────────────────────────
onMounted(async () => {
  loading.value = true
  try {
    const { data } = await api.get('/dashboard/gis-villages')
    layerCache.value['coverage'] = data
    selectedVillage.value = data[0] || null
  } catch (e) {
    console.error('GIS coverage load error:', e)
  } finally {
    loading.value = false
  }
  await nextTick()
  initMap()
})

onUnmounted(() => { if (leafletMap) { leafletMap.remove(); leafletMap = null } })
</script>

<style scoped>
.layer-tabs { display:flex;gap:6px;margin-bottom:16px;flex-wrap:wrap; }
.layer-tab  { padding:8px 18px;border-radius:24px;border:1.5px solid var(--grey-300);background:white;cursor:pointer;font-size:13px;font-weight:700;color:var(--grey-600);transition:all .15s; }
.layer-tab:hover { border-color:var(--green);color:var(--green); }
.layer-tab.active { background:var(--green);color:white;border-color:var(--green);box-shadow:0 2px 8px rgba(46,125,50,.25); }
.gis-layout  { display:grid;grid-template-columns:1fr 300px;gap:18px; }
.gis-panel   { display:flex;flex-direction:column;gap:16px; }
.map-toolbar { padding:10px 16px;border-bottom:1px solid var(--grey-200);display:flex;align-items:center;gap:10px;background:var(--grey-50);flex-wrap:wrap; }
.detail-grid { display:flex;flex-direction:column;gap:2px; }
.detail-row  { display:flex;justify-content:space-between;align-items:center;font-size:13px;padding:6px 0;border-bottom:1px solid var(--grey-200); }
.detail-row:last-child { border-bottom:none; }
.detail-row span { color:var(--grey-500);font-weight:600; }
.village-list { display:flex;flex-direction:column;gap:8px;max-height:320px;overflow-y:auto; }
.vill-row    { padding:10px;border-radius:8px;cursor:pointer;border:1px solid var(--grey-200);transition:all .15s; }
.vill-row:hover,.vill-row.selected { border-color:var(--green);background:var(--green-pale); }
.map-error   { padding:12px 16px;background:var(--amber-pale);color:#7c4600;font-size:13px;font-weight:600; }
:global(.leaflet-container)             { font-family:'Nunito',sans-serif !important; }
:global(.leaflet-popup-content)         { font-family:'Nunito',sans-serif !important; margin:12px 14px !important; }
:global(.leaflet-popup-content-wrapper) { border-radius:10px !important; box-shadow:0 4px 16px rgba(0,0,0,.15) !important; }
</style>
