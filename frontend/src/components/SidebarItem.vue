<template>
  <RouterLink :to="to" class="sb-item" :class="{ active: isActive }">
    <span class="s-icon">{{ icon }}</span>
    <span class="s-label">{{ label }}</span>
    <span v-if="badge" class="s-badge">{{ badge }}</span>
    <span v-if="newTag" class="s-new">GIS</span>
  </RouterLink>
</template>

<script setup>
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

const props = defineProps({ icon: String, label: String, to: String, badge: [String,Number], newTag: Boolean })
const route = useRoute()
const isActive = computed(() => route.path === props.to || route.path.startsWith(props.to + '/'))
</script>

<style scoped>
.sb-item { display:flex;align-items:center;gap:10px;padding:9px 16px;cursor:pointer;color:rgba(255,255,255,.72);font-size:13px;font-weight:600;border-left:3px solid transparent;transition:all .15s;text-decoration:none; }
.sb-item:hover,.sb-item.active { background:rgba(255,255,255,.13);color:white;border-left-color:#0288d1; }
.s-icon  { font-size:15px;width:20px;text-align:center; }
.s-label { flex:1; }
.s-badge { background:#0288d1;color:white;font-size:10px;font-weight:700;padding:1px 7px;border-radius:10px; }
.s-new   { background:#7c3aed;color:white;font-size:9px;font-weight:700;padding:1px 6px;border-radius:8px;letter-spacing:.5px; }
</style>
