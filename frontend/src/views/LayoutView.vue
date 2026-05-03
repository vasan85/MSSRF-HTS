<template>
  <div id="app-shell">
    <!-- TOP NAV -->
    <nav class="topnav">
      <!-- Mobile Menu Toggle -->
      <button class="mobile-menu-btn" @click="toggleMobileMenu" aria-label="Toggle menu">
        <span class="hamburger-icon">☰</span>
      </button>

      <div class="tn-brand">
        <img src="https://mssrf.org/sites/default/files/mssrf-logo.svg"
             class="tn-logo-img" alt="MSSRF"
             @error="e => e.target.style.display='none'" />
        <div class="tn-badge tn-badge-fallback" style="display:none">MS</div>
        <div class="tn-text">
          <a href="https://www.mssrf.org" target="_blank" rel="noopener" class="tn-org">MSSRF · M.S. Swaminathan Research Foundation ↗</a>
          <div class="tn-sys">MIS-HITS · Household Impact Tracking System</div>
        </div>
      </div>
      <div class="tn-sep"></div>
      <div class="role-banner">
        <div class="role-dot" :style="{ background: roleColor }"></div>
        {{ roleIcons[auth.role] }} {{ roleLabels[auth.role] }}
      </div>
      <div class="tn-right">
        <div class="notif-btn">🔔<div class="notif-dot"></div></div>
        <div class="user-chip" @click="profileMenu = !profileMenu" ref="userChipRef">
          <div class="user-av" :style="{ background: roleColor }">{{ initials }}</div>
          <span>{{ auth.user?.name }}</span>
          <span class="chip-caret">▾</span>
        </div>
        <!-- Profile dropdown -->
        <div class="profile-menu" v-if="profileMenu" v-click-outside="closeProfileMenu">
          <div class="pm-header">
            <div class="pm-av" :style="{ background: roleColor }">{{ initials }}</div>
            <div>
              <div class="pm-name">{{ auth.user?.name }}</div>
              <div class="pm-email">{{ auth.user?.email }}</div>
              <span :class="['tag', roleColors[auth.role] ? 'pm-role-tag' : '']" :style="{ background: roleColor + '22', color: roleColor }">
                {{ roleIcons[auth.role] }} {{ roleLabels[auth.role] }}
              </span>
            </div>
          </div>
          <div class="pm-divider"></div>
          <button class="pm-item" @click="openChangePw">🔑 Change Password</button>
          <div class="pm-divider"></div>
          <button class="pm-item pm-item-danger" @click="doLogout">↪ Sign Out</button>
        </div>
        <button class="logout-btn" @click="doLogout">Sign Out</button>
      </div>

      <!-- Change Password Modal -->
      <div class="modal-overlay" v-if="changePwModal.show" @click.self="changePwModal.show=false">
        <div class="modal-box" style="max-width:420px">
          <div class="modal-header">
            <div class="modal-title">🔑 Change Password</div>
            <span class="modal-close" @click="changePwModal.show=false">✕</span>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Current Password <span class="req">*</span></label>
              <input v-model="changePwModal.current" type="password" class="form-input" placeholder="Enter current password" />
            </div>
            <div class="form-group">
              <label class="form-label">New Password <span class="req">*</span></label>
              <input v-model="changePwModal.next" type="password" class="form-input" placeholder="Min 6 characters" />
            </div>
            <div class="form-group">
              <label class="form-label">Confirm New Password <span class="req">*</span></label>
              <input v-model="changePwModal.confirm" type="password" class="form-input" placeholder="Repeat new password" />
            </div>
            <div class="alert alert-danger" v-if="changePwModal.error" style="margin-top:4px">{{ changePwModal.error }}</div>
            <div class="alert alert-success" v-if="changePwModal.success" style="margin-top:4px">{{ changePwModal.success }}</div>
          </div>
          <div class="modal-footer" style="padding:0 20px 20px;display:flex;justify-content:flex-end;gap:10px">
            <button class="btn btn-outline" @click="changePwModal.show=false">Cancel</button>
            <button class="btn btn-primary" :disabled="changePwModal.saving" @click="submitChangePw">
              <span v-if="changePwModal.saving" class="spinner" style="width:12px;height:12px;border-width:2px"></span>
              <span v-else>Update Password</span>
            </button>
          </div>
        </div>
      </div>
    </nav>

    <OfflineBanner />
    <PrivacyNotice @show-policy="showPrivacyPolicy = true" />

    <div class="shell-body">
      <!-- SIDEBAR -->
      <aside class="sidebar" :class="{ 'open': mobileMenuOpen }">
        <!-- Mobile Close Button -->
        <button class="mobile-close-btn" @click="closeMobileMenu" aria-label="Close menu">
          ✕
        </button>

        <!-- Dashboards — visible to all analytical roles -->
        <div class="sb-section" v-if="can('admin','me','mis_head','mis_reviewer')">
          <div class="sb-label">Dashboards</div>
          <SidebarItem icon="📊" label="Executive Dashboard"    to="/dashboard" />
          <SidebarItem v-if="can('admin','me','mis_head')" icon="🏘️" label="Village View"   to="/village-dash" />
          <SidebarItem v-if="can('admin','me','mis_head')" icon="📁" label="Project View"   to="/project-dash" />
        </div>

        <!-- Enumerator personal workspace -->
        <div class="sb-section" v-if="can('enumerator')">
          <div class="sb-label">My Workspace</div>
          <SidebarItem icon="📤" label="My Submissions"         to="/my-submissions" />
          <SidebarItem icon="🏠" label="Household Master"       to="/households" :badge="stats.hh_count" />
        </div>

        <!-- Review workflow — reviewer role -->
        <div class="sb-section" v-if="can('mis_reviewer')">
          <div class="sb-label">Review Workflow</div>
          <SidebarItem icon="✅" label="Pending Review"         to="/review-queue" :badge="reviewCount || ''" />
          <SidebarItem icon="🏠" label="Household Records"      to="/households" :badge="stats.hh_count" />
          <SidebarItem icon="📊" label="Enumerator Performance" to="/enumerator-stats" />
        </div>

        <!-- Household data — admin / mis_head see it under Data Management -->
        <div class="sb-section" v-if="can('admin','mis_head')">
          <div class="sb-label">Data Management</div>
          <SidebarItem icon="🏠" label="Household Records"      to="/households" :badge="stats.hh_count" />
          <SidebarItem icon="📋" label="Project Master"         to="/projects" />
          <SidebarItem icon="🔗" label="Project Linking"        to="/linking" />
        </div>

        <!-- Oversight — admin / mis_head only -->
        <div class="sb-section" v-if="can('admin','mis_head')">
          <div class="sb-label">Field Oversight</div>
          <SidebarItem icon="📊" label="Enumerator Performance" to="/enumerator-stats" />
        </div>

        <!-- Geospatial -->
        <div class="sb-section" v-if="can('admin','me','mis_head')">
          <div class="sb-label">Geospatial</div>
          <SidebarItem icon="🗺️" label="GIS Coverage Map"      to="/gis"    :new-tag="true" />
          <SidebarItem icon="📍" label="HH Location Plot"       to="/gis-hh" :new-tag="true" />
        </div>

        <!-- Reports -->
        <div class="sb-section" v-if="can('admin','me','mis_head')">
          <div class="sb-label">Reports</div>
          <SidebarItem icon="📈" label="Reports & Analytics"    to="/reports" />
        </div>

        <!-- Master Data — admin only -->
        <div class="sb-section" v-if="can('admin')">
          <div class="sb-label">Master Data</div>
          <SidebarItem icon="🗾" label="State / District / Block / Village" to="/masters" />
        </div>

        <!-- System Administration -->
        <div class="sb-section" v-if="can('admin','mis_head')">
          <div class="sb-label">Administration</div>
          <SidebarItem v-if="can('admin','mis_head')" icon="👥" label="User Roles & Access" to="/settings" />
          <SidebarItem icon="🕵️" label="Audit Log"              to="/audit" />
        </div>
      </aside>

      <!-- Mobile Menu Overlay -->
      <div 
        class="mobile-overlay" 
        :class="{ 'open': mobileMenuOpen }" 
        @click="closeMobileMenu"
      ></div>

      <!-- MAIN -->
      <main class="main-content">
        <RouterView />
        <footer class="app-footer">
          <span>MIS-HITS v2.0 · M.S. Swaminathan Research Foundation ©2026</span>
          <span class="footer-sep">·</span>
          <a href="https://www.mssrf.org" target="_blank" rel="noopener" class="footer-link">mssrf.org ↗</a>
        </footer>
      </main>
    </div>

    <!-- Privacy Policy Modal (triggered from PrivacyNotice) -->
    <div class="modal-overlay" v-if="showPrivacyPolicy" @click.self="showPrivacyPolicy=false">
      <div class="modal-box pp-box">
        <div class="modal-header" style="background:linear-gradient(135deg,#1b5e20,#2e7d32);color:#fff;border-radius:12px 12px 0 0">
          <div class="modal-title" style="color:#fff">🛡️ Privacy Policy — DPDPA 2023</div>
          <span class="modal-close" style="color:#fff" @click="showPrivacyPolicy=false">✕</span>
        </div>
        <div class="modal-body pp-body">
          <div class="pp-section"><div class="pp-heading">1. Data Controller</div><p>M.S. Swaminathan Research Foundation (MSSRF), Chennai, India acts as the Data Fiduciary under the Digital Personal Data Protection Act, 2023. Contact: mis@mssrf.org</p></div>
          <div class="pp-section"><div class="pp-heading">2. Data Collected</div><p>Household demographic data, income and livelihood information, housing and sanitation conditions, access to government schemes, geographic location (village/GPS), and health/education indicators collected during field surveys.</p></div>
          <div class="pp-section"><div class="pp-heading">3. Purpose of Processing</div><p>Rural development impact measurement, programme planning, beneficiary identification, and reporting to donors and government bodies as required for MSSRF-managed programmes.</p></div>
          <div class="pp-section"><div class="pp-heading">4. Legal Basis</div><p>Processing is based on informed consent obtained from the household head prior to data collection, as required under DPDPA 2023 Section 6. Consent records are maintained electronically.</p></div>
          <div class="pp-section"><div class="pp-heading">5. Data Retention</div><p>Household data is retained for the duration of the relevant programme plus 7 years for audit purposes, after which it is securely archived or deleted in accordance with this policy.</p></div>
          <div class="pp-section"><div class="pp-heading">6. Data Sharing</div><p>Data is not sold or shared with commercial third parties. Aggregated, anonymised statistics may be shared in research publications or donor reports. Access is restricted to authorised MSSRF staff and implementing partners under data-sharing agreements.</p></div>
          <div class="pp-section"><div class="pp-heading">7. Your Rights (Data Principal)</div><ul class="pp-list"><li>Right to access your personal data</li><li>Right to correct inaccurate data</li><li>Right to erasure (subject to legal retention obligations)</li><li>Right to withdraw consent at any time</li><li>Right to grieve: email mis@mssrf.org</li></ul></div>
          <div class="pp-section"><div class="pp-heading">8. Security Measures</div><p>All data is stored in encrypted databases with role-based access control, audit logging of every access and modification, and regular security reviews. Field staff access is controlled via authenticated credentials.</p></div>
          <div class="pp-section"><div class="pp-heading">9. Grievance Officer</div><p>MSSRF Data Protection Officer · 3rd Cross Street, Taramani Institutional Area, Chennai 600 113 · mis@mssrf.org · +91-44-22541229</p></div>
        </div>
        <div class="modal-footer" style="justify-content:flex-end">
          <button class="btn btn-primary" @click="showPrivacyPolicy=false">Close</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, computed, onMounted, ref, watch } from 'vue'
import { RouterView, useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import SidebarItem from '../components/SidebarItem.vue'
import OfflineBanner from '../components/OfflineBanner.vue'
import PrivacyNotice from '../components/PrivacyNotice.vue'
import api from '../api'

const auth   = useAuthStore()
const router = useRouter()
const route  = useRoute()
const stats  = reactive({ hh_count: '' })
const reviewCount = ref('')
const mobileMenuOpen = ref(false)
const profileMenu = ref(false)

const changePwModal = ref({ show: false, current: '', next: '', confirm: '', saving: false, error: '', success: '' })
const showPrivacyPolicy = ref(false)

// v-click-outside directive
const vClickOutside = {
  mounted(el, binding) {
    el._clickOutside = (e) => { if (!el.contains(e.target)) binding.value(e) }
    document.addEventListener('click', el._clickOutside, true)
  },
  unmounted(el) { document.removeEventListener('click', el._clickOutside, true) },
}

function closeProfileMenu() { profileMenu.value = false }

function openChangePw() {
  profileMenu.value = false
  changePwModal.value = { show: true, current: '', next: '', confirm: '', saving: false, error: '', success: '' }
}

async function submitChangePw() {
  const m = changePwModal.value
  m.error = ''; m.success = ''
  if (!m.current || !m.next || !m.confirm) { m.error = 'All fields are required'; return }
  if (m.next.length < 6) { m.error = 'New password must be at least 6 characters'; return }
  if (m.next !== m.confirm) { m.error = 'Passwords do not match'; return }
  m.saving = true
  try {
    await api.post('/users/me/change-password', { current_password: m.current, new_password: m.next })
    m.success = 'Password updated successfully!'
    m.current = ''; m.next = ''; m.confirm = ''
    setTimeout(() => { changePwModal.value.show = false }, 1800)
  } catch (e) {
    m.error = e.response?.data?.message || 'Failed to update password'
  } finally { m.saving = false }
}

const roleLabels = {
  admin:'Admin', enumerator:'Field Enumerator',
  me:'M&E Team', mis_reviewer:'MIS Reviewer', mis_head:'MIS Head',
}
const roleIcons  = { admin:'🛡️', enumerator:'📝', me:'📊', mis_reviewer:'✅', mis_head:'👔' }
const roleColors = { admin:'#f59e0b', enumerator:'#388e3c', me:'#7c3aed', mis_reviewer:'#00897b', mis_head:'#5c6bc0' }
const roleColor  = computed(() => roleColors[auth.role] || '#9e9e9e')
const initials   = computed(() => auth.user?.name?.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase() || 'U')

const can = (...roles) => auth.can(...roles)

function toggleMobileMenu() {
  mobileMenuOpen.value = !mobileMenuOpen.value
  // Prevent body scroll when menu is open
  if (mobileMenuOpen.value) {
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
}

function closeMobileMenu() {
  mobileMenuOpen.value = false
  document.body.style.overflow = ''
}

async function loadStats() {
  try {
    const { data } = await api.get('/dashboard/executive')
    stats.hh_count = data.registered_hh
  } catch {}
  if (auth.can('mis_reviewer', 'admin')) {
    try {
      const { data } = await api.get('/workflow/review-queue?limit=1')
      reviewCount.value = data.total > 0 ? data.total : ''
    } catch {}
  }
}

function doLogout() { 
  closeMobileMenu()
  auth.logout()
  router.push('/login')
}

// Close mobile menu when route changes
watch(() => route.path, () => {
  closeMobileMenu()
})

onMounted(loadStats)
</script>

<style scoped>
#app-shell { min-height:100vh; display:flex; flex-direction:column; }
.topnav { position:fixed;top:0;left:0;right:0;z-index:100;height:60px;background:#2e7d32;display:flex;align-items:center;padding:0 20px;gap:14px;box-shadow:0 2px 8px rgba(0,0,0,.2); }
.tn-brand { display:flex;align-items:center;gap:10px;flex:0 0 auto; }
.tn-logo-img { height:38px;width:auto;object-fit:contain;filter:brightness(0) invert(1); }
.tn-badge { width:36px;height:36px;border-radius:50%;background:white;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:900;color:#2e7d32; }
.tn-org { font-size:10px;color:rgba(255,255,255,.7);font-weight:700;letter-spacing:.5px;text-decoration:none;transition:color .15s; }
.tn-org:hover { color:rgba(255,255,255,.95); }
.tn-sys { font-size:15px;color:white;font-weight:800; }
.tn-sep { width:1px;height:30px;background:rgba(255,255,255,.2); }
.role-banner { background:rgba(255,255,255,.15);border-radius:20px;padding:4px 14px;font-size:12px;font-weight:700;color:white;display:flex;align-items:center;gap:6px; }
.role-dot { width:8px;height:8px;border-radius:50%; }
.tn-right { display:flex;align-items:center;gap:10px;margin-left:auto;position:relative; }
.notif-btn { width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,.15);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:16px;position:relative; }
.notif-dot { position:absolute;top:6px;right:6px;width:8px;height:8px;background:#f59e0b;border-radius:50%;border:2px solid #2e7d32; }
.user-chip { display:flex;align-items:center;gap:8px;cursor:pointer;background:rgba(255,255,255,.15);border-radius:20px;padding:4px 12px 4px 4px;position:relative;user-select:none; }
.user-chip:hover { background:rgba(255,255,255,.25); }
.user-av { width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:white; }
.user-chip span { color:white;font-size:12px;font-weight:700; }
.chip-caret { font-size:10px;color:rgba(255,255,255,.7); }

/* Profile dropdown */
.profile-menu {
  position:absolute;top:calc(100% + 10px);right:0;
  background:white;border-radius:12px;
  box-shadow:0 8px 32px rgba(0,0,0,.18);
  min-width:240px;z-index:200;overflow:hidden;
  border:1px solid rgba(0,0,0,.08);
}
.pm-header { display:flex;align-items:center;gap:12px;padding:14px 16px; }
.pm-av { width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;color:white;flex-shrink:0; }
.pm-name { font-size:13px;font-weight:700;color:#1f2937; }
.pm-email { font-size:11px;color:#9ca3af;margin-bottom:4px; }
.pm-role-tag { font-size:10px;padding:2px 8px;border-radius:10px;font-weight:700; }
.pm-divider { height:1px;background:#f3f4f6; }
.pm-item { width:100%;text-align:left;padding:11px 16px;background:none;border:none;font-size:13px;font-weight:600;color:#374151;cursor:pointer;transition:background .12s; }
.pm-item:hover { background:#f9fafb; }
.pm-item-danger { color:#dc2626; }
.pm-item-danger:hover { background:#fff5f5; }
.logout-btn { padding:6px 14px;border-radius:20px;border:1.5px solid rgba(255,255,255,.4);background:transparent;color:white;font-size:12px;font-weight:700;cursor:pointer;transition:all .15s; }
.logout-btn:hover { background:rgba(255,255,255,.15); }
.shell-body { display:flex;margin-top:60px;min-height:calc(100vh - 60px); }
.sidebar { width:248px;background:#1b5e20;flex:0 0 248px;padding:10px 0;position:sticky;top:60px;height:calc(100vh - 60px);overflow-y:auto; }
.sb-section { margin-bottom:6px; }
.sb-label { font-size:10px;font-weight:700;letter-spacing:1px;color:rgba(255,255,255,.35);text-transform:uppercase;padding:10px 16px 4px; }
.main-content { flex:1;padding:24px;overflow:auto;min-height:calc(100vh - 60px);display:flex;flex-direction:column; }
.app-footer { margin-top:auto;padding:16px 0 4px;font-size:11px;color:#9e9e9e;display:flex;align-items:center;gap:6px;flex-wrap:wrap; }
.footer-sep { color:#ccc; }
.footer-link { color:#7cb87e;text-decoration:none; }
.footer-link:hover { color:#2e7d32; }

/* Mobile Menu Button */
.mobile-menu-btn {
  display: none;
  width: 40px;
  height: 40px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.15);
  border: none;
  color: white;
  font-size: 22px;
  cursor: pointer;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  padding: 0;
}

.mobile-menu-btn:hover {
  background: rgba(255, 255, 255, 0.25);
}

.hamburger-icon {
  display: block;
  line-height: 1;
}

/* Mobile Close Button */
.mobile-close-btn {
  display: none;
  position: absolute;
  top: 12px;
  right: 12px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  font-size: 20px;
  cursor: pointer;
  align-items: center;
  justify-content: center;
  z-index: 100;
  transition: all 0.2s;
}

.mobile-close-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* Mobile Overlay */
.mobile-overlay {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 85;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s ease;
}

.mobile-overlay.open {
  opacity: 1;
  pointer-events: auto;
}

/* ═══════════════════════════════════════════════════════════════════════════════
   RESPONSIVE LAYOUT - Mobile First
   ═══════════════════════════════════════════════════════════════════════════════ */

/* Mobile Styles (< 768px) */
@media (max-width: 767px) {
  /* Show Mobile Menu Button */
  .mobile-menu-btn {
    display: flex;
  }

  /* Show Mobile Close Button */
  .mobile-close-btn {
    display: flex;
  }

  /* Show Mobile Overlay */
  .mobile-overlay {
    display: block;
  }

  /* Top Navigation - Compact */
  .topnav {
    padding: 0 12px;
    gap: 8px;
    height: 56px;
  }

  /* Hide organization name on mobile */
  .tn-org {
    display: none;
  }

  .tn-sys {
    font-size: 13px;
  }

  .tn-badge {
    width: 32px;
    height: 32px;
    font-size: 12px;
  }

  /* Hide separator on mobile */
  .tn-sep {
    display: none;
  }

  /* Compact role banner */
  .role-banner {
    padding: 4px 10px;
    font-size: 10px;
  }

  .role-dot {
    width: 6px;
    height: 6px;
  }

  /* Hide notification button on very small screens */
  .notif-btn {
    width: 30px;
    height: 30px;
    font-size: 14px;
  }

  /* Compact user chip */
  .user-chip {
    padding: 3px 10px 3px 3px;
  }

  .user-av {
    width: 26px;
    height: 26px;
    font-size: 11px;
  }

  .user-chip span {
    font-size: 11px;
  }

  /* Hide logout button text, show only on click */
  .logout-btn {
    padding: 5px 12px;
    font-size: 11px;
  }

  /* Shell Body */
  .shell-body {
    margin-top: 56px;
    min-height: calc(100vh - 56px);
  }

  /* HIDE SIDEBAR ON MOBILE - Use hamburger menu instead */
  .sidebar {
    position: fixed;
    left: -280px;
    top: 56px;
    width: 280px;
    height: calc(100vh - 56px);
    z-index: 90;
    transition: left 0.3s ease;
    box-shadow: 2px 0 12px rgba(0, 0, 0, 0.3);
  }

  /* Show sidebar when toggled (you'll need to add toggle functionality) */
  .sidebar.open {
    left: 0;
  }

  /* Main Content - Full Width */
  .main-content {
    flex: 1;
    width: 100%;
    padding: 16px 12px;
    min-height: calc(100vh - 56px);
  }
}

/* Tablet Styles (768px - 1023px) */
@media (min-width: 768px) and (max-width: 1023px) {
  .topnav {
    padding: 0 16px;
    gap: 10px;
  }

  .tn-org {
    font-size: 9px;
  }

  .tn-sys {
    font-size: 14px;
  }

  /* Smaller sidebar on tablet */
  .sidebar {
    width: 220px;
    flex: 0 0 220px;
  }

  .main-content {
    padding: 20px;
  }
}

/* Desktop Styles (1024px and above) */
@media (min-width: 1024px) {
  .topnav {
    padding: 0 20px;
  }

  .sidebar {
    width: 248px;
  }

  .main-content {
    padding: 24px;
  }
}

/* Extra Small Mobile (< 375px) */
@media (max-width: 374px) {
  .topnav {
    padding: 0 8px;
    gap: 6px;
  }

  .tn-sys {
    font-size: 11px;
  }

  .tn-badge {
    width: 28px;
    height: 28px;
    font-size: 11px;
  }

  /* Hide role banner on very small screens */
  .role-banner {
    display: none;
  }

  .user-chip span {
    display: none; /* Show only avatar */
  }

  .logout-btn {
    padding: 5px 8px;
    font-size: 10px;
  }

  .main-content {
    padding: 12px 8px;
  }
}

/* Landscape Mobile */
@media (max-width: 900px) and (orientation: landscape) {
  .topnav {
    height: 48px;
  }

  .shell-body {
    margin-top: 48px;
  }

  .sidebar {
    top: 48px;
    height: calc(100vh - 48px);
  }

  .main-content {
    min-height: calc(100vh - 48px);
  }
}

.pp-box { max-width: 640px; width: 100%; }
.pp-body { padding: 20px 24px; max-height: 65vh; overflow-y: auto; display: flex; flex-direction: column; gap: 14px; }
.pp-section { border-bottom: 1px solid var(--grey-200); padding-bottom: 12px; }
.pp-section:last-child { border-bottom: none; }
.pp-heading { font-size: 13px; font-weight: 800; color: var(--green); margin-bottom: 5px; }
.pp-section p { font-size: 13px; color: var(--grey-700); line-height: 1.65; }
.pp-list { padding-left: 18px; font-size: 13px; color: var(--grey-700); line-height: 1.8; }
</style>
