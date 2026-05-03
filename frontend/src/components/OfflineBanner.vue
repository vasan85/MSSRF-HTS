<template>
  <!-- Offline strip -->
  <div v-if="!isOnline" class="offline-strip">
    <span class="offline-icon">📵</span>
    <span>You are offline — data entry is saved locally and will sync when you reconnect.</span>
  </div>

  <!-- Pending sync banner (online but unsynced records exist) -->
  <div v-else-if="pendingCount > 0" class="sync-strip" :class="{ syncing }">
    <template v-if="syncing">
      <span class="sync-spinner"></span>
      <span>Syncing {{ pendingCount }} offline record{{ pendingCount !== 1 ? 's' : '' }}…</span>
    </template>
    <template v-else>
      <span>🔄 {{ pendingCount }} record{{ pendingCount !== 1 ? 's' : '' }} pending sync</span>
      <button class="sync-btn" @click="syncNow">Sync now</button>
    </template>
  </div>
</template>

<script setup>
import { useOfflineSync } from '../composables/useOfflineSync'
const { isOnline, pendingCount, syncing, syncNow } = useOfflineSync()
</script>

<style scoped>
.offline-strip,
.sync-strip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 20px;
  font-size: 13px;
  font-weight: 500;
  position: sticky;
  top: 60px;
  z-index: 90;
}
.offline-strip {
  background: #b91c1c;
  color: #fff;
}
.sync-strip {
  background: #f59e0b;
  color: #1c1917;
}
.sync-strip.syncing {
  background: #0288d1;
  color: #fff;
}
.offline-icon { font-size: 15px; }
.sync-btn {
  margin-left: auto;
  padding: 3px 12px;
  border-radius: 12px;
  border: 1.5px solid rgba(0,0,0,.25);
  background: transparent;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}
.sync-spinner {
  width: 14px; height: 14px;
  border: 2px solid rgba(255,255,255,.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin .7s linear infinite;
  flex-shrink: 0;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
