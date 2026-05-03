<template>
  <div class="login-screen">

    <!-- Animated background blobs -->
    <div class="bg-blob b1"></div>
    <div class="bg-blob b2"></div>
    <div class="bg-blob b3"></div>

    <div class="login-wrap">

      <!-- ── Left panel ── -->
      <div class="login-left">
        <!-- Logo -->
        <div class="brand-logo-wrap">
          <img
            src="https://mssrf.org/sites/default/files/mssrf-logo.svg"
            class="brand-logo-img"
            @error="logoFailed = true"
            v-if="!logoFailed"
            alt="MSSRF"
          />
          <div class="logo-badge-lg" v-else>MS</div>
        </div>

        <!-- Hero text -->
        <div class="hero-section">
          <div class="hero-badge">MIS · HITS</div>
          <div class="hero-title">Household Impact<br>Tracking System</div>
          <div class="hero-desc">
            A centralised digital platform for managing household-level data across
            MSSRF's rural and coastal intervention programmes.
          </div>
        </div>

        <!-- Impact stats -->
        <div class="stats-row">
          <div class="stat-box">
            <div class="stat-num">5+</div>
            <div class="stat-lbl">States</div>
          </div>
          <div class="stat-sep"></div>
          <div class="stat-box">
            <div class="stat-num">50+</div>
            <div class="stat-lbl">Districts</div>
          </div>
          <div class="stat-sep"></div>
          <div class="stat-box">
            <div class="stat-num">10K+</div>
            <div class="stat-lbl">Households</div>
          </div>
        </div>

        <!-- Feature pills -->
        <div class="feature-grid">
          <div class="fp-item"><span class="fp-icon">🏠</span> Baseline Surveys</div>
          <div class="fp-item"><span class="fp-icon">✅</span> Approval Workflow</div>
          <div class="fp-item"><span class="fp-icon">🗺️</span> GIS Coverage Maps</div>
          <div class="fp-item"><span class="fp-icon">📊</span> Live Dashboards</div>
          <div class="fp-item"><span class="fp-icon">📈</span> Impact Reports</div>
          <div class="fp-item"><span class="fp-icon">🔒</span> DPDPA Compliant</div>
        </div>

        <!-- Left footer -->
        <div class="left-footer">
          <a href="https://www.mssrf.org" target="_blank" rel="noopener">mssrf.org ↗</a>
          <span class="sep">·</span>
          <a href="https://www.mssrf.org/research-programmes" target="_blank" rel="noopener">Programmes</a>
          <span class="sep">·</span>
          <a href="https://www.mssrf.org/contact-us" target="_blank" rel="noopener">Contact</a>
        </div>
      </div>

      <!-- ── Right panel: Login form ── -->
      <div class="login-right">

        <!-- Header icon -->
        <div class="form-icon-wrap">
          <div class="form-icon">🌾</div>
        </div>

        <div class="form-top">
          <div class="form-title">Welcome back</div>
          <div class="form-sub">Sign in with your MSSRF credentials to continue</div>
        </div>

        <div class="alert alert-danger" v-if="error" style="margin-bottom:14px;font-size:13px">
          ⚠️ {{ error }}
        </div>

        <div class="field-group">
          <label class="field-label">
            <span class="fl-icon">✉️</span> Email address
          </label>
          <input v-model="form.email" type="email" class="field-input"
                 placeholder="your.name@mssrf.org" @keyup.enter="doLogin" autocomplete="email" />
        </div>

        <div class="field-group">
          <label class="field-label">
            <span class="fl-icon">🔑</span> Password
          </label>
          <div class="pw-wrap">
            <input v-model="form.password" :type="showPw ? 'text' : 'password'"
                   class="field-input" placeholder="Enter your password"
                   @keyup.enter="doLogin" autocomplete="current-password" />
            <button class="pw-toggle" @click="showPw = !showPw" type="button"
                    :title="showPw ? 'Hide password' : 'Show password'">
              {{ showPw ? '🙈' : '👁️' }}
            </button>
          </div>
        </div>

        <button class="btn-signin" :disabled="loading" @click="doLogin">
          <span v-if="loading" class="spinner" style="width:16px;height:16px;border-width:2px;border-color:rgba(255,255,255,.35);border-top-color:#fff"></span>
          <span v-else>Sign In →</span>
        </button>

        <!-- Trust badges -->
        <div class="trust-row">
          <div class="trust-badge">🔒 SSL Encrypted</div>
          <div class="trust-badge">🛡️ DPDPA 2023</div>
          <div class="trust-badge">📋 Audit Logged</div>
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
            <p>Individual household data is never sold or shared commercially. Anonymised aggregate data may be shared with government bodies, academic institutions, or funding agencies under data sharing agreements.</p>
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
            <p>To exercise any right, contact: <strong>mis@mssrf.org</strong></p>
          </div>
          <div class="pp-section">
            <div class="pp-heading">8. Security Measures</div>
            <p>Data is stored on secured servers with role-based access control, audit logging, encrypted transmission (HTTPS/TLS), and regular security reviews.</p>
          </div>
          <div class="pp-section">
            <div class="pp-heading">9. Grievance Officer</div>
            <p>Reachable at <strong>mis@mssrf.org</strong>. Complaints will be acknowledged within 48 hours and resolved within 30 days.</p>
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

const form       = ref({ email: '', password: '' })
const showPrivacy = ref(false)
const error      = ref('')
const loading    = ref(false)
const logoFailed = ref(false)
const showPw     = ref(false)

async function doLogin() {
  if (!form.value.email || !form.value.password) { error.value = 'Email and password are required'; return }
  loading.value = true; error.value = ''
  try {
    await auth.login(form.value.email, form.value.password)
    const dest = {
      admin: 'dashboard', me: 'dashboard',
      enumerator: 'households', mis_reviewer: 'review-queue', mis_head: 'dashboard',
    }
    router.push('/' + (dest[auth.role] || 'dashboard'))
  } catch (e) {
    const data = e.response?.data
    if (data?.blocked && data?.reason) {
      error.value = `${data.message} Reason: ${data.reason}`
    } else {
      error.value = data?.message || 'Login failed. Please check your credentials.'
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
/* ── Base ── */
.login-screen {
  position: fixed; inset: 0;
  background: linear-gradient(145deg, #052e10 0%, #0d3b18 35%, #0a3d55 75%, #051e3e 100%);
  display: flex; align-items: center; justify-content: center;
  overflow: auto; padding: 20px;
}

/* Animated background blobs */
.bg-blob {
  position: fixed; border-radius: 50%; filter: blur(80px);
  opacity: .18; pointer-events: none; animation: drift 12s ease-in-out infinite alternate;
}
.b1 { width: 520px; height: 520px; background: #2e7d32; top: -120px; left: -100px; animation-delay: 0s; }
.b2 { width: 400px; height: 400px; background: #0288d1; bottom: -80px; right: -60px; animation-delay: -4s; }
.b3 { width: 300px; height: 300px; background: #558b2f; top: 40%; left: 30%; animation-delay: -8s; }
@keyframes drift { from { transform: translate(0,0) scale(1); } to { transform: translate(30px,20px) scale(1.08); } }

/* ── Wrap ── */
.login-wrap {
  position: relative; z-index: 1;
  display: grid; grid-template-columns: 1.15fr 1fr;
  max-width: 1000px; width: 100%;
  border-radius: 22px; overflow: hidden;
  box-shadow: 0 32px 100px rgba(0,0,0,.55), 0 0 0 1px rgba(255,255,255,.06);
  min-height: 600px;
}

/* ── Left panel ── */
.login-left {
  padding: 38px 38px 28px;
  background: rgba(255,255,255,.06);
  backdrop-filter: blur(18px);
  border-right: 1px solid rgba(255,255,255,.1);
  display: flex; flex-direction: column; gap: 0;
}

/* Logo */
.brand-logo-wrap {
  background: #fff; border-radius: 14px;
  padding: 12px 18px; display: inline-flex;
  box-shadow: 0 6px 20px rgba(0,0,0,.3);
  margin-bottom: 26px; align-self: center;
}
.brand-logo-img { height: 58px; width: auto; display: block; }
.logo-badge-lg {
  width: 58px; height: 58px; border-radius: 10px;
  background: #1b5e20; color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 20px; font-weight: 900;
}

/* Hero */
.hero-section { margin-bottom: 24px; text-align: center; }
.hero-badge {
  display: inline-block;
  background: rgba(255,255,255,.12); border: 1px solid rgba(255,255,255,.22);
  color: rgba(255,255,255,.9); font-size: 10px; font-weight: 800;
  letter-spacing: 2.5px; padding: 3px 12px; border-radius: 20px;
  margin-bottom: 12px; text-transform: uppercase;
}
.hero-title {
  color: #fff; font-size: 28px; font-weight: 900;
  line-height: 1.2; margin-bottom: 12px;
  text-shadow: 0 2px 12px rgba(0,0,0,.3);
}
.hero-desc { color: rgba(255,255,255,.58); font-size: 13px; line-height: 1.65; }

/* Stats */
.stats-row {
  display: flex; align-items: center; gap: 0;
  background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.12);
  border-radius: 12px; padding: 14px 0;
  margin-bottom: 22px;
}
.stat-box { flex: 1; text-align: center; }
.stat-num { color: #69f0ae; font-size: 22px; font-weight: 900; line-height: 1; }
.stat-lbl { color: rgba(255,255,255,.5); font-size: 11px; margin-top: 3px; }
.stat-sep { width: 1px; height: 36px; background: rgba(255,255,255,.15); }

/* Feature pills */
.feature-grid {
  display: grid; grid-template-columns: 1fr 1fr;
  gap: 8px; margin-bottom: 28px; flex: 1;
}
.fp-item {
  display: flex; align-items: center; gap: 8px;
  background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.1);
  border-radius: 8px; padding: 9px 12px;
  color: rgba(255,255,255,.78); font-size: 12px; font-weight: 600;
  transition: background .15s;
}
.fp-item:hover { background: rgba(255,255,255,.12); }
.fp-icon { font-size: 14px; }

/* Left footer */
.left-footer { display: flex; gap: 6px; align-items: center; }
.left-footer a { color: rgba(255,255,255,.38); font-size: 11px; text-decoration: none; transition: color .15s; }
.left-footer a:hover { color: rgba(255,255,255,.8); }
.sep { color: rgba(255,255,255,.2); font-size: 10px; }

/* ── Right panel ── */
.login-right {
  background: #ffffff;
  padding: 38px 38px 28px;
  display: flex; flex-direction: column;
}

/* Form icon */
.form-icon-wrap { display: flex; justify-content: center; margin-bottom: 18px; }
.form-icon {
  width: 60px; height: 60px; border-radius: 18px;
  background: linear-gradient(135deg, #e8f5e9, #c8e6c9);
  display: flex; align-items: center; justify-content: center;
  font-size: 28px;
  box-shadow: 0 4px 14px rgba(46,125,50,.2);
}

/* Form header */
.form-top { text-align: center; margin-bottom: 24px; }
.form-title { font-size: 24px; font-weight: 900; color: #1b5e20; margin-bottom: 5px; }
.form-sub { font-size: 12.5px; color: #9e9e9e; }

/* Fields */
.field-group { margin-bottom: 16px; }
.field-label {
  display: flex; align-items: center; gap: 6px;
  font-size: 12px; font-weight: 700; color: #616161; margin-bottom: 6px;
}
.fl-icon { font-size: 13px; }
.field-input {
  width: 100%; padding: 11px 14px;
  border: 1.5px solid #e8e8e8; border-radius: 10px;
  font-size: 14px; color: #212121;
  transition: border-color .15s, box-shadow .15s;
  box-sizing: border-box; background: #fafafa;
}
.field-input:focus {
  outline: none; border-color: #2e7d32;
  box-shadow: 0 0 0 3px rgba(46,125,50,.12);
  background: #fff;
}
.pw-wrap { position: relative; }
.pw-wrap .field-input { padding-right: 44px; }
.pw-toggle {
  position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
  background: none; border: none; cursor: pointer; font-size: 16px; padding: 0; color: #bdbdbd;
}

/* Sign in button */
.btn-signin {
  width: 100%; padding: 14px;
  border-radius: 10px;
  background: linear-gradient(135deg, #2e7d32, #1b5e20);
  color: #fff; border: none;
  font-size: 15px; font-weight: 800; letter-spacing: .3px;
  cursor: pointer; margin-top: 4px; margin-bottom: 18px;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  transition: transform .15s, box-shadow .15s;
  box-shadow: 0 6px 18px rgba(27,94,32,.3);
}
.btn-signin:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 10px 24px rgba(27,94,32,.38);
}
.btn-signin:active:not(:disabled) { transform: translateY(0); }
.btn-signin:disabled { opacity: .6; cursor: not-allowed; }

/* Trust badges */
.trust-row {
  display: flex; gap: 8px; justify-content: center;
  flex-wrap: wrap; margin-bottom: 16px;
}
.trust-badge {
  font-size: 10.5px; font-weight: 600; color: #757575;
  background: #f5f5f5; border: 1px solid #e8e8e8;
  border-radius: 20px; padding: 4px 10px;
}

/* Footer */
.form-footer {
  margin-top: auto; padding-top: 12px;
  font-size: 11px; color: #bdbdbd; text-align: center;
  border-top: 1px solid #f0f0f0;
}
.form-footer a { color: #9e9e9e; text-decoration: none; }
.form-footer a:hover { color: #1b5e20; }
.pp-link {
  background: none; border: none; color: #9e9e9e;
  font-size: 11px; cursor: pointer; padding: 0; text-decoration: underline;
}
.pp-link:hover { color: #1b5e20; }

/* Privacy modal */
.pp-box  { max-width: 700px; width: 100%; }
.pp-body { padding: 20px 24px; max-height: 65vh; overflow-y: auto; display: flex; flex-direction: column; gap: 14px; }
.pp-version { font-size: 11px; color: #757575; background: #f5f5f5; padding: 6px 10px; border-radius: 4px; }
.pp-section { border-left: 3px solid #a5d6a7; padding-left: 12px; }
.pp-heading  { font-size: 13px; font-weight: 800; color: #2e7d32; margin-bottom: 4px; }
.pp-body p   { font-size: 12px; color: #616161; line-height: 1.7; }
.pp-list     { font-size: 12px; color: #616161; padding-left: 18px; line-height: 2; }

/* ── Responsive ── */
@media (max-width: 720px) {
  .login-wrap { grid-template-columns: 1fr; min-height: auto; }
  .login-left { display: none; }
  .login-right { padding: 32px 24px 24px; }
}
</style>
