<template>
  <div class="modal-overlay" v-if="show">
    <div class="modal-box consent-box">
      <div class="consent-header">
        <div class="consent-shield">🛡️</div>
        <div>
          <div class="modal-title">Informed Consent Declaration</div>
          <div class="consent-sub">Digital Personal Data Protection Act, 2023 (DPDPA) — Section 6</div>
        </div>
      </div>

      <div class="modal-body">
        <!-- Language selector -->
        <div class="consent-lang-row">
          <label class="form-label">Consent Language</label>
          <select v-model="language" class="form-select" style="max-width:200px">
            <option>English</option>
            <option>Tamil</option>
            <option>Hindi</option>
            <option>Telugu</option>
            <option>Kannada</option>
            <option>Malayalam</option>
            <option>Odia</option>
            <option>Bengali</option>
          </select>
        </div>

        <!-- Consent text -->
        <div class="consent-scroll">
          <p class="consent-intro">
            Before collecting household data, you must read the following to the household head
            in their preferred language and obtain their consent.
          </p>

          <div class="consent-block">
            <div class="cb-title">📋 What data we collect</div>
            <p>We are collecting information about your household including: family composition, income, housing conditions, access to health and education services, land and livestock ownership, participation in government schemes, and geographic location.</p>
          </div>

          <div class="consent-block">
            <div class="cb-title">🎯 Why we collect it</div>
            <p>This data is collected by M.S. Swaminathan Research Foundation (MSSRF) to understand the socioeconomic condition of households and to measure the impact of rural development programmes. It helps plan better interventions for your community.</p>
          </div>

          <div class="consent-block">
            <div class="cb-title">🔒 How we protect it</div>
            <p>Your data is stored securely and accessed only by authorised MSSRF staff. It will not be sold or shared with third parties. Individual household data will not be published — only aggregated statistics will be used in reports.</p>
          </div>

          <div class="consent-block">
            <div class="cb-title">📅 How long we keep it</div>
            <p>Data will be retained for the duration of the programme (up to 7 years) and then securely archived or deleted as per our data retention policy.</p>
          </div>

          <div class="consent-block">
            <div class="cb-title">⚖️ Your rights</div>
            <p>You have the right to: access your data, request corrections, withdraw consent, or request erasure of personal information at any time by contacting MSSRF at <strong>mis@mssrf.org</strong>.</p>
          </div>

          <div class="consent-block">
            <div class="cb-title">✋ Voluntary participation</div>
            <p>Participation is completely voluntary. You may refuse to answer any question or stop the survey at any time without consequence.</p>
          </div>
        </div>

        <!-- Consent method -->
        <div class="consent-method-row">
          <label class="form-label">Consent obtained by</label>
          <div class="method-chips">
            <label v-for="m in methods" :key="m.value" class="method-chip" :class="{ active: method === m.value }">
              <input type="radio" :value="m.value" v-model="method" hidden/>
              {{ m.label }}
            </label>
          </div>
        </div>

        <!-- Checkbox -->
        <label class="consent-check-row" :class="{ error: checkError }">
          <input type="checkbox" v-model="confirmed" @change="checkError = false"/>
          <span>
            I confirm that I have read the above consent statement to the household head in
            <strong>{{ language }}</strong>, they have understood it, and have given
            <strong>{{ method }}</strong> consent to participate in this survey.
          </span>
        </label>
        <div class="consent-err" v-if="checkError">Please confirm consent before proceeding.</div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-outline" @click="$emit('decline')">Cancel Survey</button>
        <button class="btn btn-primary" @click="proceed">
          ✅ Consent Recorded — Proceed
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

defineProps({ show: Boolean })
const emit = defineEmits(['consent', 'decline'])

const language   = ref('Tamil')
const method     = ref('verbal')
const confirmed  = ref(false)
const checkError = ref(false)

const methods = [
  { value: 'verbal',   label: '🗣️ Verbal' },
  { value: 'written',  label: '✍️ Written' },
  { value: 'thumbprint', label: '👍 Thumbprint' },
]

function proceed() {
  if (!confirmed.value) { checkError.value = true; return }
  emit('consent', { language: language.value, method: method.value, version: 'v1.0' })
}
</script>

<style scoped>
.consent-box { max-width: 660px; width: 100%; }

.consent-header {
  display: flex; align-items: center; gap: 14px;
  padding: 20px 24px 16px;
  background: linear-gradient(135deg, #1b5e20, #2e7d32);
  color: white; border-radius: 12px 12px 0 0;
}
.consent-shield { font-size: 32px; }
.modal-title    { font-size: 17px; font-weight: 800; color: #fff; }
.consent-sub    { font-size: 11px; color: rgba(255,255,255,.7); margin-top: 2px; }

.modal-body  { padding: 18px 24px; max-height: 70vh; overflow-y: auto; display: flex; flex-direction: column; gap: 14px; }

.consent-lang-row { display: flex; align-items: center; gap: 12px; }
.consent-lang-row .form-label { white-space: nowrap; margin: 0; }

.consent-scroll { display: flex; flex-direction: column; gap: 10px; }
.consent-intro  { font-size: 13px; color: var(--grey-700); background: var(--blue-pale); border-left: 3px solid var(--blue); padding: 10px 12px; border-radius: 4px; }

.consent-block  { background: var(--grey-50); border: 1px solid var(--grey-200); border-radius: 8px; padding: 12px 14px; }
.cb-title       { font-size: 12px; font-weight: 800; color: var(--grey-700); margin-bottom: 5px; }
.consent-block p { font-size: 12px; color: var(--grey-700); line-height: 1.6; }

.consent-method-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.consent-method-row .form-label { white-space: nowrap; margin: 0; }
.method-chips { display: flex; gap: 8px; flex-wrap: wrap; }
.method-chip  { padding: 6px 14px; border: 1.5px solid var(--grey-300); border-radius: 20px; font-size: 12px; cursor: pointer; transition: all .15s; }
.method-chip.active { border-color: var(--green); background: var(--green-pale); color: var(--green); font-weight: 700; }

.consent-check-row {
  display: flex; align-items: flex-start; gap: 10px; cursor: pointer;
  background: var(--green-pale); border: 1.5px solid var(--green-light);
  border-radius: 8px; padding: 12px 14px; font-size: 13px; color: var(--grey-800);
}
.consent-check-row.error { border-color: var(--red); background: var(--red-pale); }
.consent-check-row input { margin-top: 2px; width: 16px; height: 16px; flex-shrink: 0; }
.consent-err { font-size: 12px; color: var(--red); }

.modal-footer { display: flex; justify-content: flex-end; gap: 10px; padding: 14px 24px; border-top: 1px solid var(--grey-200); }

@media (max-width: 600px) {
  .consent-box { border-radius: 0; max-width: 100%; }
  .modal-body  { max-height: 65vh; padding: 14px 16px; }
  .modal-footer { flex-direction: column; }
  .modal-footer .btn { width: 100%; }
}
</style>
