const DB_NAME    = 'mis-hits-offline'
const DB_VERSION = 1
const STORE      = 'pending-households'

let _db = null

function openDB() {
  if (_db) return Promise.resolve(_db)
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = e => {
      const db = e.target.result
      if (!db.objectStoreNames.contains(STORE)) {
        const s = db.createObjectStore(STORE, { keyPath: 'localId', autoIncrement: true })
        s.createIndex('syncStatus', 'syncStatus', { unique: false })
        s.createIndex('savedAt',    'savedAt',    { unique: false })
      }
    }
    req.onsuccess = e => { _db = e.target.result; resolve(_db) }
    req.onerror   = e => reject(e.target.error)
  })
}

function tx(mode) {
  return openDB().then(db => db.transaction(STORE, mode).objectStore(STORE))
}

export async function saveOfflineForm(formData) {
  const store = await tx('readwrite')
  return new Promise((resolve, reject) => {
    const req = store.add({
      ...formData,
      syncStatus: 'pending',
      savedAt: new Date().toISOString(),
    })
    req.onsuccess = () => resolve(req.result)   // returns localId
    req.onerror   = e => reject(e.target.error)
  })
}

export async function getPendingForms() {
  const store = await tx('readonly')
  return new Promise((resolve, reject) => {
    const req = store.index('syncStatus').getAll('pending')
    req.onsuccess = () => resolve(req.result)
    req.onerror   = e => reject(e.target.error)
  })
}

export async function getAllOfflineForms() {
  const store = await tx('readonly')
  return new Promise((resolve, reject) => {
    const req = store.getAll()
    req.onsuccess = () => resolve(req.result)
    req.onerror   = e => reject(e.target.error)
  })
}

export async function updateSyncStatus(localId, syncStatus, error = null) {
  const store = await tx('readwrite')
  return new Promise((resolve, reject) => {
    const get = store.get(localId)
    get.onsuccess = () => {
      const rec = get.result
      if (!rec) return resolve()
      Object.assign(rec, { syncStatus, syncError: error, syncedAt: syncStatus === 'synced' ? new Date().toISOString() : null })
      store.put(rec).onsuccess = () => resolve()
    }
    get.onerror = e => reject(e.target.error)
  })
}

export async function deleteOfflineForm(localId) {
  const store = await tx('readwrite')
  return new Promise((resolve, reject) => {
    const req = store.delete(localId)
    req.onsuccess = () => resolve()
    req.onerror   = e => reject(e.target.error)
  })
}

export async function countPending() {
  const store = await tx('readonly')
  return new Promise((resolve, reject) => {
    const req = store.index('syncStatus').count('pending')
    req.onsuccess = () => resolve(req.result)
    req.onerror   = e => reject(e.target.error)
  })
}
