import { ref, onMounted, onUnmounted } from 'vue'
import { getPendingForms, deleteOfflineForm, updateSyncStatus, countPending } from '../utils/offlineDB'
import api from '../api'

// Shared reactive online state (module-level so all components share it)
const isOnline    = ref(navigator.onLine)
const pendingCount = ref(0)
const syncing     = ref(false)
const lastSync    = ref(null)

async function refreshPendingCount() {
  pendingCount.value = await countPending()
}

async function syncNow() {
  if (!isOnline.value || syncing.value) return { synced: 0, failed: 0 }
  syncing.value = true
  let synced = 0, failed = 0

  try {
    const pending = await getPendingForms()
    for (const form of pending) {
      const { localId, syncStatus, savedAt, syncedAt, syncError, ...payload } = form
      try {
        if (form.isEdit && form.household_id) {
          await api.put(`/households/${form.household_id}`, payload)
        } else {
          await api.post('/households', payload)
        }
        await deleteOfflineForm(localId)
        synced++
      } catch (err) {
        const status = err.response?.status
        if (status >= 400 && status < 500) {
          // Permanent client-side error — mark failed so it doesn't loop
          await updateSyncStatus(localId, 'failed', err.response?.data?.message || 'Validation error')
        }
        failed++
      }
    }
  } finally {
    syncing.value  = false
    lastSync.value = new Date()
    await refreshPendingCount()
  }

  return { synced, failed }
}

// Auto-sync whenever we come back online
function onOnline() {
  isOnline.value = true
  syncNow()
}
function onOffline() {
  isOnline.value = false
}

// One-time global listeners (idempotent)
let listenersAdded = false
function ensureListeners() {
  if (listenersAdded) return
  listenersAdded = true
  window.addEventListener('online',  onOnline)
  window.addEventListener('offline', onOffline)
}

export function useOfflineSync() {
  ensureListeners()

  onMounted(async () => {
    await refreshPendingCount()
    // Try to sync any pending on mount (covers page refresh while online)
    if (isOnline.value && pendingCount.value > 0) syncNow()
  })

  return { isOnline, pendingCount, syncing, lastSync, syncNow, refreshPendingCount }
}
