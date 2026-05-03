<template>
  <div class="login-screen">
    <div class="login-wrap">

      <!-- ── Left panel: Brand & Info ── -->
      <div class="login-left">
        <div class="brand-header">
          <div class="brand-logo-wrap">
            <img
              src="https://mssrf.org/sites/default/files/mssrf-logo.svg"
              class="brand-logo-img"
              @error="logoFailed = true"
              v-if="!logoFailed"
              alt="MSSRF Logo"
            />
            <div class="brand-logo-fallback" v-else>
              <div class="logo-badge-lg">MS</div>
            </div>
          </div>
        </div>

        <div class="brand-divider"></div>

        <div class="sys-section">
          <div class="sys-badge">MIS · HITS</div>
          <div class="sys-title">Household Impact<br>Tracking System</div>
          <div class="sys-desc">
            A centralised digital platform for managing household-level data across
            MSSRF's rural and coastal intervention programmes. Enables structured
            data collection, multi-stage review workflows, and impact measurement
            at scale.
          </div>
        </div>

        <div class="feature-list">
          <div class="feature-item"><span class="fi-icon">🏠</span><span>Household baseline surveys &amp; profiling</span></div>
          <div class="feature-item"><span class="fi-icon">✅</span><span>Multi-stage approval workflow</span></div>
          <div class="feature-item"><span class="fi-icon">🗺️</span><span>GIS-based geographic coverage maps</span></div>
          <div class="feature-item"><span class="fi-icon">📊</span><span>Real-time dashboards &amp; analytics</span></div>
          <div class="feature-item"><span class="fi-icon">📈</span><span>Impact measurement &amp; export reports</span></div>
        </div>

        <div class="left-footer">
          <a href="https://www.mssrf.org" target="_blank" rel="noopener">About MSSRF</a>
          <span class="sep">·</span>
          <a href="https://www.mssrf.org/research-programmes" target="_blank" rel="noopener">Programmes</a>
          <span class="sep">·</span>
          <a href="https://www.mssrf.org/contact-us" target="_blank" rel="noopener">Contact</a>
        </div>
      </div>

      <!-- ── Right panel: Login form ── -->
      <div class="login-right">
        <div class="form-top">
          <div class="form-title">Sign in to MIS-HITS</div>
          <div class="form-sub">Enter your MSSRF credentials to continue</div>
        </div>

        <!-- Role selector -->
        <div class="role-grid">
          <div v-for="r in roles" :key="r.key"
               :class="['role-tile', { active: selectedRole === r.key }]"
               @click="selectRole(r)">
            <span class="rt-icon">{{ r.icon }}</span>
            <span class="rt-label">{{ r.label }}</span>
          </div>
        </div>

        <div class="selected-role-badge" v-if="selectedRole">
          <span class="srb-icon">{{ roles.find(r=>r.key===selectedRole)?.icon }}</span>
          <span>Signing in as <strong>{{ roles.find(r=>r.key===selectedRole)?.label }}</strong></span>
        </div>

        <div class="alert alert-danger" v-if="error" style="margin-bottom:14px">{{ error }}</div>

        <div class="field-group">
          <label class="field-label">Email address</label>
          <input v-model="form.email" type="email" class="field-input"
                 placeholder="your.name@mssrf.org" @keyup.enter="doLogin" autocomplete="email" />
        </div>
        <div class="field-group">
          <label class="field-label">Password</label>
          <div class="pw-wrap">
            <input v-model="form.password" :type="showPw ? 'text' : 'password'"
                   class="field-input" placeholder="••••••••"
                   @keyup.enter="doLogin" autocomplete="current-password" />
            <button class="pw-toggle" @click="showPw = !showPw" type="button">
              {{ showPw ? '🙈' : '👁️' }}
            </button>
          </div>
        </div>

        <button class="btn-signin" :disabled="loading" @click="doLogin">
          <span v-if="loading" class="spinner" style="width:16px;height:16px;border-width:2px;border-color:rgba(255,255,255,.4);border-top-color:white"></span>
          <span v-else>Sign In →</span>
        </button>

        <!-- Quick logins for demo -->
        <div class="quick-section">
          <div class="quick-label">Demo quick-login</div>
          <div class="quick-row">
            <button v-for="r in roles" :key="r.key" class="quick-btn" @click="quickLogin(r)">
              {{ r.icon }} {{ r.label }}
            </button>
          </div>
        </div>

        <div class="form-footer">
          MIS-HITS v2.0 · MSSRF © 2026 ·
          <a href="https://www.mssrf.org" target="_blank" rel="noopener">mssrf.org</a> ·
          <button class="pp-link" @click="showPrivacy = true">Privacy Policy</button>
        </div>
      </div>
    </div>

    <!-- Privacy Policy Modal -->
    <div class="modal-overlay" v-if="showPrivacy" @click.self="showPrivacy=false" style="z-index:3000">
      <div class="modal-box pp-box">
        <div class="modal-header" style="background:linear-gradient(135deg,#1b5e20,#2e7d32)">
          <div class="modal-title" style="color:#fff">🔒 Privacy Policy — MIS-HITS</div>
          <button class="modal-close" @click="showPrivacy=false" style="color:#fff">✕</button>
        </div>
        <div class="modal-body pp-body">
          <p class="pp-version">Version 1.0 · Effective: January 2025 · DPDPA Compliant</p>

          <div class="pp-section">
            <div class="pp-heading">1. Data Controller</div>
            <p>M.S. Swaminathan Research Foundation (MSSRF), 3rd Cross Street, Institutional Area, Taramani, Chennai – 600 113, Tamil Nadu, India. Contact: <strong>mis@mssrf.org</strong></p>
          </div>

          <div class="pp-section">
            <div class="pp-heading">2. Data We Collect</div>
            <p>We collect household-level survey data including: names, mobile numbers, GPS coordinates, socioeconomic indicators, health status, educational attainment, housing conditions, land ownership, livestock, government scheme participation, and family member details.</p>
          </div>

          <div class="pp-section">
            <div class="pp-heading">3. Legal Basis for Processing</div>
            <p>Data is processed with the explicit informed consent of the household head (DPDPA 2023, Section 6). For programme beneficiaries, data may also be processed under legitimate interests of rural development and impact assessment.</p>
          </div>

          <div class="pp-section">
            <div class="pp-heading">4. Purpose of Processing</div>
            <p>Household data is used to: (a) baseline socioeconomic conditions, (b) track programme reach and impact, (c) generate anonymised statistical reports for donors and government partners, and (d) plan interventions for rural communities.</p>
          </div>

          <div class="pp-section">
            <div class="pp-heading">5. Data Sharing</div>
            <p>Individual household data is never sold or shared commercially. Anonymised aggregate data may be shared with government bodies, academic institutions, or funding agencies under data sharing agreements. System access is role-based and limited to authorised MSSRF staff.</p>
          </div>

          <div class="pp-section">
            <div class="pp-heading">6. Data Retention</div>
            <p>Personal data is retained for 7 years from the date of collection, or until the end of the relevant programme, whichever is later. After this period, identifiable fields are anonymised or securely deleted.</p>
          </div>

          <div class="pp-section">
            <div class="pp-heading">7. Your Rights (DPDPA 2023)</div>
            <ul class="pp-list">
              <li><strong>Right to Access</strong> — You may request a copy of your household data.</li>
              <li><strong>Right to Correction</strong> — You may request corrections to inaccurate data.</li>
              <li><strong>Right to Erasure</strong> — You may request deletion of your personal data.</li>
              <li><strong>Right to Withdraw Consent</strong> — You may withdraw consent at any time.</li>
              <li><strong>Right to Grievance Redressal</strong> — You may raise a complaint with the Data Protection Board of India.</li>
            </ul>
            <p>To exercise any right, contact: <strong>mis@mssrf.org</strong> or write to the address above.</p>
          </div>

          <div class="pp-section">
            <div class="pp-heading">8. Security Measures</div>
            <p>Data is stored on secured servers with role-based access control, audit logging, encrypted transmission (HTTPS/TLS), and regular security reviews. All staff with data access are bound by confidentiality agreements.</p>
          </div>

          <div class="pp-section">
            <div class="pp-heading">9. Grievance Officer</div>
            <p>As required under DPDPA 2023, our designated Grievance Officer is reachable at <strong>mis@mssrf.org</strong>. Complaints will be acknowledged within 48 hours and resolved within 30 days.</p>
          </div>
        </div>
        <div class="modal-footer" style="justify-content:flex-end">
          <button class="btn btn-primary" @click="showPrivacy=false">Close</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const auth   = useAuthStore()

const roles = [
  { key:'admin',        label:'Admin',          icon:'🛡️', email:'admin@mssrf.org' },
  { key:'mis_head',     label:'MIS Head',       icon:'👔', email:'mishead@mssrf.org' },
  { key:'mis_reviewer', label:'MIS Reviewer',   icon:'✅', email:'reviewer@mssrf.org' },
  { key:'enumerator',   label:'Enumerator',     icon:'📝', email:'enumerator@mssrf.org' },
  { key:'me',           label:'M&E Team',       icon:'📊', email:'me@mssrf.org' },
]

const selectedRole = ref('admin')
const form         = ref({ email: 'admin@mssrf.org', password: 'password' })
const showPrivacy  = ref(false)
const error    = ref('')
const loading  = ref(false)
const logoFailed = ref(false)
const showPw   = ref(false)

function selectRole(r) {
  selectedRole.value  = r.key
  form.value.email    = r.email
  form.value.password = 'password'
}

function quickLogin(r) {
  selectRole(r)
  doLogin()
}

async function doLogin() {
  if (!form.value.email || !form.value.password) { error.value = 'Email and password required'; return }
  loading.value = true; error.value = ''
  try {
    await auth.login(form.value.email, form.value.password)
    const dest = {
      admin:'dashboard', me:'dashboard',
      enumerator:'households', mis_reviewer:'review-queue', mis_head:'dashboard',
    }
    router.push('/' + (dest[auth.role] || 'dashboard'))
  } catch (e) {
    const data = e.response?.data
    if (data?.blocked && data?.reason) {
      error.value = `${data.message} Reason: ${data.reason}`
    } else {
      error.value = data?.message || 'Login failed. Please try again.'
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
/* ── Screen & wrap ── */
.login-screen {
  position: fixed; inset: 0;
  background: linear-gradient(135deg, #0d3b18 0%, #1b5e20 45%, #01579b 100%);
  display: flex; align-items: center; justify-content: center;
  overflow: auto; padding: 20px;
}
.login-wrap {
  display: grid; grid-template-columns: 1.1fr 1fr;
  max-width: 980px; width: 100%;
  border-radius: 20px; overflow: hidden;
  box-shadow: 0 24px 80px rgba(0,0,0,.45);
  min-height: 580px;
}

/* ── Left panel ── */
.login-left {
  background: rgba(0,0,0,.28);
  backdrop-filter: blur(6px);
  padding: 36px 36px 28px;
  display: flex; flex-direction: column; gap: 0;
  border-right: 1px solid rgba(255,255,255,.1);
}

/* Brand header */
.brand-header { display: flex; align-items: center; gap: 18px; margin-bottom: 20px; }
.brand-logo-wrap {
  flex: 0 0 auto;
  background: white;
  border-radius: 12px;
  padding: 10px 14px;
  box-shadow: 0 4px 16px rgba(0,0,0,.25);
}
.brand-logo-img { height: 72px; width: auto; object-fit: contain; display: block; }
.brand-logo-fallback { display: flex; }
.logo-badge-lg {
  width: 72px; height: 72px; border-radius: 12px;
  background: white; color: #1b5e20;
  display: flex; align-items: center; justify-content: center;
  font-size: 22px; font-weight: 900; letter-spacing: -1px;
}
.brand-text { display: flex; flex-direction: column; gap: 3px; }
.brand-full { color: rgba(255,255,255,.95); font-size: 14px; font-weight: 700; line-height: 1.3; }
.brand-tagline { color: rgba(255,255,255,.55); font-size: 11px; font-style: italic; }
.brand-url {
  color: rgba(255,255,255,.5); font-size: 11px; text-decoration: none;
  transition: color .15s; margin-top: 2px;
}
.brand-url:hover { color: rgba(255,255,255,.85); }

.brand-divider { height: 1px; background: rgba(255,255,255,.12); margin-bottom: 20px; }

/* System section */
.sys-section { margin-bottom: 20px; }
.sys-badge {
  display: inline-block;
  background: rgba(255,255,255,.15); border: 1px solid rgba(255,255,255,.25);
  color: rgba(255,255,255,.85); font-size: 10px; font-weight: 800;
  letter-spacing: 2px; padding: 3px 10px; border-radius: 20px;
  margin-bottom: 10px; text-transform: uppercase;
}
.sys-title { color: white; font-size: 26px; font-weight: 900; line-height: 1.2; margin-bottom: 12px; }
.sys-desc { color: rgba(255,255,255,.6); font-size: 13px; line-height: 1.6; }

/* Feature list */
.feature-list { display: flex; flex-direction: column; gap: 9px; margin-bottom: 24px; flex: 1; }
.feature-item { display: flex; align-items: center; gap: 10px; color: rgba(255,255,255,.75); font-size: 13px; }
.fi-icon { font-size: 15px; width: 20px; text-align: center; flex-shrink: 0; }

/* Left footer links */
.left-footer { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
.left-footer a { color: rgba(255,255,255,.45); font-size: 11px; text-decoration: none; transition: color .15s; }
.left-footer a:hover { color: rgba(255,255,255,.85); }
.sep { color: rgba(255,255,255,.2); font-size: 10px; }

/* ── Right panel ── */
.login-right {
  background: #ffffff;
  padding: 36px 36px 28px;
  display: flex; flex-direction: column;
}
.form-top { margin-bottom: 22px; }
.form-title { font-size: 22px; font-weight: 900; color: #1b5e20; margin-bottom: 4px; }
.form-sub { font-size: 12px; color: #9e9e9e; }

/* Role grid */
.role-grid {
  display: grid; grid-template-columns: repeat(5, 1fr);
  gap: 6px; margin-bottom: 14px;
}
.role-tile {
  display: flex; flex-direction: column; align-items: center; gap: 3px;
  padding: 8px 4px; border-radius: 8px;
  border: 1.5px solid #e5e7eb;
  cursor: pointer; transition: all .15s;
  background: #f9fafb;
}
.role-tile:hover { border-color: #a7f3d0; background: #f0fdf4; }
.role-tile.active { border-color: #2e7d32; background: #f0fdf4; box-shadow: 0 0 0 3px rgba(46,125,50,.12); }
.rt-icon { font-size: 18px; }
.rt-label { font-size: 9px; font-weight: 700; color: #616161; text-align: center; line-height: 1.2; }
.role-tile.active .rt-label { color: #1b5e20; }

.selected-role-badge {
  display: flex; align-items: center; gap: 8px;
  background: #f1f8e9; border: 1px solid #c8e6c9;
  border-radius: 8px; padding: 8px 12px;
  font-size: 13px; color: #1b5e20; font-weight: 600;
  margin-bottom: 16px;
}
.srb-icon { font-size: 16px; }

/* Form fields */
.field-group { margin-bottom: 14px; }
.field-label { display: block; font-size: 12px; font-weight: 700; color: #616161; margin-bottom: 5px; }
.field-input {
  width: 100%; padding: 10px 12px; border: 1.5px solid #e0e0e0;
  border-radius: 8px; font-size: 14px; color: #212121;
  transition: border-color .15s; box-sizing: border-box;
}
.field-input:focus { outline: none; border-color: #2e7d32; box-shadow: 0 0 0 3px rgba(46,125,50,.1); }
.pw-wrap { position: relative; }
.pw-wrap .field-input { padding-right: 40px; }
.pw-toggle {
  position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
  background: none; border: none; cursor: pointer; font-size: 15px; padding: 0;
  color: #9e9e9e;
}

.btn-signin {
  width: 100%; padding: 13px; border-radius: 8px;
  background: linear-gradient(135deg, #2e7d32, #1b5e20);
  color: white; border: none;
  font-size: 15px; font-weight: 800;
  cursor: pointer; margin-top: 4px;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  transition: opacity .15s; box-shadow: 0 4px 12px rgba(27,94,32,.25);
}
.btn-signin:hover:not(:disabled) { opacity: .9; }
.btn-signin:disabled { opacity: .6; cursor: not-allowed; }

/* Quick logins */
.quick-section { margin-top: 20px; border-top: 1px solid #f0f0f0; padding-top: 14px; }
.quick-label { font-size: 10px; color: #bdbdbd; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 8px; }
.quick-row { display: flex; gap: 5px; flex-wrap: wrap; }
.quick-btn {
  padding: 5px 10px; border-radius: 20px; font-size: 11px; font-weight: 700;
  cursor: pointer; border: 1.5px solid #e0e0e0; color: #616161; background: white;
  transition: all .15s;
}
.quick-btn:hover { background: #1b5e20; color: white; border-color: #1b5e20; }

.form-footer {
  margin-top: auto; padding-top: 16px;
  font-size: 11px; color: #bdbdbd; text-align: center;
}
.form-footer a { color: #9e9e9e; text-decoration: none; }
.form-footer a:hover { color: #1b5e20; }
.pp-link { background: none; border: none; color: #9e9e9e; font-size: 11px; cursor: pointer; padding: 0; text-decoration: underline; }
.pp-link:hover { color: #1b5e20; }
.pp-box  { max-width: 700px; width: 100%; }
.pp-body { padding: 20px 24px; max-height: 65vh; overflow-y: auto; display: flex; flex-direction: column; gap: 14px; }
.pp-version { font-size: 11px; color: var(--grey-500); background: var(--grey-100); padding: 6px 10px; border-radius: 4px; }
.pp-section { border-left: 3px solid var(--green-light); padding-left: 12px; }
.pp-heading  { font-size: 13px; font-weight: 800; color: var(--green); margin-bottom: 4px; }
.pp-body p   { font-size: 12px; color: var(--grey-700); line-height: 1.7; }
.pp-list     { font-size: 12px; color: var(--grey-700); padding-left: 18px; line-height: 2; }

/* ── Responsive ── */
@media (max-width: 720px) {
  .login-wrap { grid-template-columns: 1fr; min-height: auto; }
  .login-left { display: none; }
  .login-right { padding: 28px 24px; }
}
@media (max-width: 400px) {
  .role-grid { grid-template-columns: repeat(3, 1fr); }
}
</style>
