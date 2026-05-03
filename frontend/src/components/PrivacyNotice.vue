<template>
  <div class="pn-overlay" v-if="show">
    <div class="pn-box">
      <div class="pn-header">
        <span class="pn-shield">🛡️</span>
        <div>
          <div class="pn-title">Data Privacy Notice</div>
          <div class="pn-sub">Digital Personal Data Protection Act, 2023</div>
        </div>
      </div>
      <div class="pn-body">
        <p>
          MIS-HITS collects and processes household-level personal data on behalf of MSSRF for rural
          development and impact measurement. By using this system you confirm that:
        </p>
        <ul class="pn-list">
          <li>You are an authorised MSSRF field staff member or partner.</li>
          <li>You will collect household data only with the informed consent of the household head.</li>
          <li>You will not share, copy, or use the data for any purpose outside of MSSRF programmes.</li>
          <li>You understand that all your actions are logged for audit and compliance purposes.</li>
        </ul>
        <p style="margin-top:8px">
          For full details, see the
          <button class="pn-pp-link" @click="$emit('show-policy')">Privacy Policy</button>.
          Violations may result in disciplinary or legal action under DPDPA 2023.
        </p>
      </div>
      <div class="pn-footer">
        <label class="pn-check">
          <input type="checkbox" v-model="agreed"/>
          I have read and understood the data privacy obligations.
        </label>
        <button class="btn btn-primary" :disabled="!agreed" @click="accept">
          Accept & Continue
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
const emit = defineEmits(['show-policy'])

const NOTICE_KEY = 'mssrf-privacy-notice-v1'
const show  = ref(false)
const agreed = ref(false)

onMounted(() => {
  if (!localStorage.getItem(NOTICE_KEY)) show.value = true
})

function accept() {
  localStorage.setItem(NOTICE_KEY, new Date().toISOString())
  show.value = false
}
</script>

<style scoped>
.pn-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,.65);
  display: flex; align-items: center; justify-content: center;
  z-index: 9000; padding: 16px;
}
.pn-box {
  background: #fff; border-radius: 14px;
  max-width: 560px; width: 100%;
  box-shadow: 0 20px 60px rgba(0,0,0,.35);
  overflow: hidden;
}
.pn-header {
  display: flex; align-items: center; gap: 14px;
  background: linear-gradient(135deg, #1b5e20, #2e7d32);
  padding: 20px 24px; color: #fff;
}
.pn-shield { font-size: 34px; }
.pn-title  { font-size: 18px; font-weight: 800; }
.pn-sub    { font-size: 11px; color: rgba(255,255,255,.7); margin-top: 2px; }

.pn-body {
  padding: 20px 24px;
  font-size: 13px; color: #424242; line-height: 1.7;
}
.pn-list {
  padding-left: 18px; margin: 10px 0;
}
.pn-list li { margin-bottom: 4px; }
.pn-pp-link {
  background: none; border: none; color: #1b5e20;
  font-size: 13px; text-decoration: underline; cursor: pointer; padding: 0;
}

.pn-footer {
  padding: 14px 24px 20px;
  border-top: 1px solid #eee;
  display: flex; flex-direction: column; gap: 12px;
}
.pn-check {
  display: flex; align-items: flex-start; gap: 8px;
  font-size: 13px; color: #424242; cursor: pointer;
}
.pn-check input { margin-top: 2px; width: 15px; height: 15px; flex-shrink: 0; }
.btn:disabled { opacity: .45; cursor: not-allowed; }

@media (max-width: 600px) {
  .pn-box { border-radius: 10px; }
  .pn-body { padding: 16px; }
  .pn-footer { padding: 12px 16px 16px; }
}
</style>
