<template>
  <div>
    <div class="breadcrumb">
      Home › <RouterLink to="/households">Household Master</RouterLink> › <span>{{ isEdit ? 'Edit' : 'Add' }} Household</span>
    </div>
    <div class="page-header">
      <div>
        <div class="page-title">{{ isEdit ? 'Edit' : 'Add New' }} Household</div>
        <div class="page-sub">{{ isEdit ? 'Update household survey' : 'Complete household questionnaire' }}</div>
      </div>
      <RouterLink to="/households" class="btn btn-outline btn-sm">← Back to List</RouterLink>
    </div>

    <div class="alert alert-success" v-if="saved">✅ Household {{ isEdit ? 'updated' : 'saved' }} successfully!</div>
    <div class="alert alert-warning" v-if="savedOffline" style="background:#fef3c7;border-color:#f59e0b;color:#92400e">
      📵 No internet — data saved on this device. It will sync automatically when you reconnect.
    </div>
    <div class="alert alert-danger"  v-if="apiError">❌ {{ apiError }}</div>

    <!-- Workflow status banner -->
    <div v-if="isEdit && form.workflow_status" class="wf-status-banner" :class="'wf-' + form.workflow_status">
      <span class="wf-icon">{{ { draft:'📝', submitted:'📤', under_review:'🔍', approved:'✅', returned:'↩' }[form.workflow_status] }}</span>
      <span class="wf-text">
        <strong>{{ { draft:'Draft', submitted:'Submitted for Review', under_review:'Under Review', approved:'Approved', returned:'Returned for Clarification' }[form.workflow_status] }}</strong>
        <span v-if="form.workflow_status === 'returned' && form.review_comment"> — Reviewer note: <em>{{ form.review_comment }}</em></span>
        <span v-if="form.workflow_status === 'approved'"> — This record has been approved and is locked.</span>
      </span>
    </div>

    <div v-if="auth.isMISHead" class="alert alert-info">
      👔 You are in view-only mode. MIS Management Team cannot edit household records.
    </div>

    <!-- DPDPA Consent Modal — shown before new household form -->
    <ConsentModal
      :show="showConsentModal"
      @consent="onConsent"
      @decline="$router.push('/households')"
    />

    <div class="loading-center" v-if="loading"><div class="spinner spinner-lg"></div></div>

    <div class="card" v-else>
      <!-- Multi-Step Progress Bar -->
      <div class="stepper-container">
        <div class="stepper">
          <div 
            v-for="step in totalSteps" 
            :key="step" 
            class="stepper-item"
            :class="{ 
              'active': step === currentStep, 
              'completed': step < currentStep 
            }"
            @click="goToStep(step)"
          >
            <div class="stepper-circle">
              <span v-if="step < currentStep">✓</span>
              <span v-else>{{ step }}</span>
            </div>
            <div class="stepper-label">{{ stepTitles[step - 1] }}</div>
          </div>
        </div>
      </div>

      <!-- Household ID preview -->
      <div class="id-preview" v-if="!isEdit">
        <span>Household ID (Auto):</span>
        <span class="id-badge" style="font-size:13px">{{ form.household_id || 'Select village to generate' }}</span>
      </div>
      <div class="id-preview" v-else>
        <span>Household ID:</span>
        <span class="id-badge" style="font-size:13px">{{ form.household_id }}</span>
      </div>

      <!-- ════════ STEP 1: SURVEY INFORMATION ════════ -->
      <div v-show="currentStep === 1">
        <!-- ── PART 1: ENUMERATOR AND SURVEY DETAILS ── -->
        <div class="form-section">📝 Part 1: Enumerator and Survey Details</div>
      <div class="form-grid form-grid-3">
        <div class="form-group">
          <label class="form-label">Enumerator Name <span class="req">*</span></label>
          <input v-model="form.enumerator_name" type="text" class="form-input" readonly style="background:var(--grey-50);color:var(--grey-600);cursor:not-allowed" />
        </div>
        <div class="form-group">
          <label class="form-label">Survey Date <span class="req">*</span></label>
          <input v-model="form.survey_date" type="date" class="form-input" />
        </div>
      </div>

      <!-- ── PART 2: CONSENT ── -->
      <div class="form-section">✅ Part 2: Consent</div>
      <div class="form-grid form-grid-3">
        <div class="form-group">
          <label class="form-label">Consent Obtained <span class="req">*</span></label>
          <select v-model="form.consent_obtained" class="form-select">
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </select>
        </div>
      </div>

      <!-- ── PART 3: GEOGRAPHICAL DETAILS ── -->
      <div class="form-section">📍 Part 3: Geographical Details</div>
      <div class="form-grid">
        <div class="form-group" style="grid-column:1/-1">
          <div class="gps-bar">
            <div class="gps-status-wrap">
              <span v-if="gpsLoading" class="gps-status fetching">
                <span class="gps-spinner"></span> Fetching location…
              </span>
              <span v-else-if="gpsError" class="gps-status error">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {{ gpsError }}
              </span>
              <span v-else-if="form.gps_latitude && form.gps_longitude" class="gps-status ok">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                Location captured — edit below if needed
              </span>
              <span v-else class="gps-status idle">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                Location not yet fetched
              </span>
            </div>
            <button type="button" class="gps-btn" :disabled="gpsLoading" @click="fetchGPS">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
              {{ gpsLoading ? 'Fetching…' : (form.gps_latitude ? 'Refresh Location' : 'Get Location') }}
            </button>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">GPS Location (Latitude) <span class="req">*</span></label>
          <input v-model="form.gps_latitude" type="text" class="form-input" placeholder="e.g. 11.6234" />
        </div>
        <div class="form-group">
          <label class="form-label">GPS Location (Longitude) <span class="req">*</span></label>
          <input v-model="form.gps_longitude" type="text" class="form-input" placeholder="e.g. 78.1234" />
        </div>

        <!-- State -->
        <div class="form-group">
          <label class="form-label">State <span class="req">*</span></label>
          <select v-model="sel.state_id" class="form-select">
            <option value="">— Select State —</option>
            <option v-for="s in states" :key="s.state_id" :value="s.state_id">{{ s.state_name }}</option>
          </select>
        </div>

        <!-- District -->
        <div class="form-group">
          <label class="form-label">District <span class="req">*</span></label>
          <select v-model="sel.district_id" class="form-select" :disabled="!districts.length">
            <option value="">{{ sel.state_id ? (districtLoading ? 'Loading…' : '— Select District —') : '— Select State first —' }}</option>
            <option v-for="d in districts" :key="d.district_id" :value="d.district_id">{{ d.district_name }}</option>
          </select>
        </div>

        <!-- Block -->
        <div class="form-group">
          <label class="form-label">Block <span class="req">*</span></label>
          <select v-model="sel.block_id" class="form-select" :disabled="!blocks.length">
            <option value="">{{ sel.district_id ? (blockLoading ? 'Loading…' : '— Select Block —') : '— Select District first —' }}</option>
            <option v-for="b in blocks" :key="b.block_id" :value="b.block_id">{{ b.block_name }}</option>
          </select>
        </div>

        <!-- Village -->
        <div class="form-group">
          <label class="form-label">Village <span class="req">*</span></label>
          <select v-model="form.village_id" class="form-select" :disabled="isEdit || !villages.length">
            <option value="">{{ sel.block_id ? (villageLoading ? 'Loading…' : '— Select Village —') : '— Select Block first —' }}</option>
            <option v-for="v in villages" :key="v.village_id" :value="v.village_id">{{ v.village_name }}</option>
          </select>
        </div>
      </div>
      </div><!-- End Step 1 -->

      <!-- ════════ STEP 2: HOUSEHOLD PROFILE ════════ -->
      <div v-show="currentStep === 2">
      <!-- ── PART 4: HOUSEHOLD PROFILE ── -->
      <div class="form-section">👤 Part 4: Household Profile</div>
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label">Name of the Head of Household <span class="req">*</span></label>
          <input v-model="form.head_name" type="text" class="form-input" placeholder="Type full name with initial" />
        </div>
        <div class="form-group">
          <label class="form-label">Age <span class="req">*</span></label>
          <input v-model="form.head_age" type="number" class="form-input" placeholder="Numeric (max 3 digits)" max="999" />
        </div>
        <div class="form-group">
          <label class="form-label">Mobile Number (Aadhar Linked) <span class="req">*</span></label>
          <input v-model="form.mobile" type="text" class="form-input" placeholder="10-digit mobile" maxlength="10" />
        </div>
        <div class="form-group">
          <label class="form-label">Social Category <span class="req">*</span></label>
          <select v-model="form.social_category" class="form-select">
            <option value="">— Select —</option>
            <option>SC</option><option>ST</option><option>OBC</option>
            <option>General</option><option>EWS</option><option>Others</option>
            <option>Prefer not to say</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Marital Status <span class="req">*</span></label>
          <select v-model="form.marital_status" class="form-select">
            <option value="">— Select —</option>
            <option>Married</option><option>Single</option><option>Widowed</option>
            <option>Divorced</option><option>Separated</option><option>Prefer not to say</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Education <span class="req">*</span></label>
          <select v-model="form.education" class="form-select">
            <option value="">— Select —</option>
            <option>Illiterate to 9th std</option>
            <option>10th</option>
            <option>12th</option>
            <option>UG or Diploma</option>
            <option>PG</option>
            <option>PhD</option>
            <option>Others</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Occupation <span class="req">*</span></label>
          <select v-model="form.occupation" class="form-select">
            <option value="">— Select —</option>
            <option>Unemployed</option><option>Student</option><option>Home maker</option>
            <option>Daily wages</option><option>Private employee</option><option>Govt. employee</option>
            <option>Self-employed or business</option><option>Others</option>
          </select>
        </div>
        <div class="form-group" v-if="form.occupation === 'Self-employed or business' || form.occupation === 'Others'">
          <label class="form-label">If Self-employed/Others, Specify</label>
          <input v-model="form.occupation_other" type="text" class="form-input" placeholder="Type the response" />
        </div>
        <div class="form-group">
          <label class="form-label">Monthly Income <span class="req">*</span></label>
          <select v-model="form.monthly_income" class="form-select">
            <option value="">— Select —</option>
            <option>No income</option><option>Less than 10000</option>
            <option>10001 to 15000</option><option>15001 to 20000</option>
            <option>20001 to 25000</option><option>25001 to 30000</option>
            <option>More than 30000</option>
          </select>
        </div>
        <div class="form-group" v-if="form.monthly_income === 'More than 30000'">
          <label class="form-label">Exact Monthly Income (if more than 30000)</label>
          <input v-model="form.monthly_income_exact" type="number" class="form-input" placeholder="Type exact amount" />
        </div>
        <div class="form-group">
          <label class="form-label">Differently Abled <span class="req">*</span></label>
          <select v-model="form.differently_abled" class="form-select">
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </select>
        </div>
        <div class="form-group full" v-if="form.differently_abled === 'Yes'">
          <label class="form-label">If Yes, Specify the Disability Category (Multi-select)</label>
          <div class="checkbox-group">
            <label class="checkbox-label">
              <input type="checkbox" value="Locomotor or Physical disability" v-model="form.disability_categories" />
              <span>Locomotor or Physical disability</span>
            </label>
            <label class="checkbox-label">
              <input type="checkbox" value="Visual impairment" v-model="form.disability_categories" />
              <span>Visual impairment</span>
            </label>
            <label class="checkbox-label">
              <input type="checkbox" value="Hearing impairment" v-model="form.disability_categories" />
              <span>Hearing impairment</span>
            </label>
            <label class="checkbox-label">
              <input type="checkbox" value="Speech and language disability" v-model="form.disability_categories" />
              <span>Speech and language disability</span>
            </label>
            <label class="checkbox-label">
              <input type="checkbox" value="Intellectual disability" v-model="form.disability_categories" />
              <span>Intellectual disability</span>
            </label>
            <label class="checkbox-label">
              <input type="checkbox" value="Multiple disabilities" v-model="form.disability_categories" />
              <span>Multiple disabilities</span>
            </label>
            <label class="checkbox-label">
              <input type="checkbox" value="Other" v-model="form.disability_categories" />
              <span>Other (specify)</span>
            </label>
          </div>
        </div>
        <div class="form-group full" v-if="form.differently_abled === 'Yes' && form.disability_categories.includes('Other')">
          <label class="form-label">If Other, Please Specify</label>
          <input v-model="form.disability_category_other" type="text" class="form-input" 
                 placeholder="Specify other disability type" />
        </div>

        <!-- Q19: SHG Membership -->
        <div class="form-group">
          <label class="form-label">SHG Membership</label>
          <select v-model="form.shg_membership" class="form-select">
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </select>
        </div>
        <div class="form-group" v-if="form.shg_membership === 'Yes'">
          <label class="form-label">Your Role in SHG</label>
          <select v-model="form.shg_role" class="form-select">
            <option value="">— Select —</option>
            <option>Member</option><option>Leader</option>
            <option>Co-leader</option><option>Others</option>
          </select>
        </div>
        <div class="form-group" v-if="form.shg_membership === 'Yes'">
          <label class="form-label">Loan from SHG</label>
          <select v-model="form.shg_loan" class="form-select">
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </select>
        </div>
        <div class="form-group" v-if="form.shg_membership === 'Yes' && form.shg_loan === 'Yes'">
          <label class="form-label">Loan Amount (SHG-Savings) (₹)</label>
          <input v-model="form.shg_loan_savings" type="number" class="form-input" placeholder="Amount" />
        </div>
        <div class="form-group" v-if="form.shg_membership === 'Yes' && form.shg_loan === 'Yes'">
          <label class="form-label">Loan Amount (Bank) (₹)</label>
          <input v-model="form.shg_loan_bank" type="number" class="form-input" placeholder="Amount" />
        </div>
        <div class="form-group" v-if="form.shg_membership === 'Yes' && form.shg_loan === 'Yes'">
          <label class="form-label">Loan Amount (MFI) (₹)</label>
          <input v-model="form.shg_loan_mfi" type="number" class="form-input" placeholder="Amount" />
        </div>
        <div class="form-group" v-if="form.shg_membership === 'Yes' && form.shg_loan === 'Yes'">
          <label class="form-label">Loan Amount (Others) (₹)</label>
          <input v-model="form.shg_loan_others" type="number" class="form-input" placeholder="Amount" />
        </div>
        <div class="form-group full" v-if="form.shg_membership === 'Yes' && form.shg_loan === 'Yes'">
          <label class="form-label">Reason for Loan (applicable for all loans)</label>
          <input v-model="form.loan_reason" type="text" class="form-input" placeholder="Type the reason" />
        </div>

        <!-- Q20: FPO Membership -->
        <div class="form-group">
          <label class="form-label">FPO Membership</label>
          <select v-model="form.fpo_membership" class="form-select">
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </select>
        </div>
        <div class="form-group" v-if="form.fpo_membership === 'Yes'">
          <label class="form-label">Your Role in FPO</label>
          <select v-model="form.fpo_role" class="form-select">
            <option value="">— Select —</option>
            <option>Member</option><option>CEO</option>
            <option>BoD</option><option>Others</option>
          </select>
        </div>
        <div class="form-group" v-if="form.fpo_membership === 'Yes'">
          <label class="form-label">Investment Amount (₹)</label>
          <input v-model="form.fpo_investment" type="number" class="form-input" placeholder="Amount" />
        </div>
        <div class="form-group" v-if="form.fpo_membership === 'Yes'">
          <label class="form-label">Type of FPO</label>
          <select v-model="form.fpo_type" class="form-select">
            <option value="">— Select —</option>
            <option>Producer Company</option><option>Cooperative Society</option>
            <option>Section 8 Company</option><option>Trust or Society</option>
            <option>Others</option>
          </select>
        </div>
        <div class="form-group full" v-if="form.fpo_membership === 'Yes'">
          <label class="form-label">Main Commodity Handled by FPO (Multi-select)</label>
          <div class="checkbox-group">
            <label class="checkbox-label">
              <input type="checkbox" value="Cereals (Paddy, Wheat, Millets)" v-model="form.fpo_commodities" />
              <span>Cereals (Paddy, Wheat, Millets)</span>
            </label>
            <label class="checkbox-label">
              <input type="checkbox" value="Fruits & Vegetables" v-model="form.fpo_commodities" />
              <span>Fruits & Vegetables</span>
            </label>
            <label class="checkbox-label">
              <input type="checkbox" value="Spices" v-model="form.fpo_commodities" />
              <span>Spices</span>
            </label>
            <label class="checkbox-label">
              <input type="checkbox" value="Plantation crops (Tea, Coffee, Rubber)" v-model="form.fpo_commodities" />
              <span>Plantation crops (Tea, Coffee, Rubber)</span>
            </label>
            <label class="checkbox-label">
              <input type="checkbox" value="Livestock (Dairy, Goat, Poultry)" v-model="form.fpo_commodities" />
              <span>Livestock (Dairy, Goat, Poultry)</span>
            </label>
            <label class="checkbox-label">
              <input type="checkbox" value="Fisheries" v-model="form.fpo_commodities" />
              <span>Fisheries</span>
            </label>
            <label class="checkbox-label">
              <input type="checkbox" value="Non-Timber Forest Produce (NTFP)" v-model="form.fpo_commodities" />
              <span>Non-Timber Forest Produce (NTFP)</span>
            </label>
            <label class="checkbox-label">
              <input type="checkbox" value="Medicinal & Aromatic Plants" v-model="form.fpo_commodities" />
              <span>Medicinal & Aromatic Plants</span>
            </label>
            <label class="checkbox-label">
              <input type="checkbox" value="Other" v-model="form.fpo_commodities" />
              <span>Other (specify)</span>
            </label>
          </div>
        </div>
        <div class="form-group full" v-if="form.fpo_membership === 'Yes' && form.fpo_commodities.includes('Other')">
          <label class="form-label">If Other Commodity, Please Specify</label>
          <input v-model="form.fpo_commodity_other" type="text" class="form-input" 
                 placeholder="Specify other commodity" />
        </div>
        <div class="form-group full" v-if="form.fpo_membership === 'Yes'">
          <label class="form-label">Market Linkage (Multi-select)</label>
          <div class="checkbox-group">
            <label class="checkbox-label">
              <input type="checkbox" value="Local market (village)" v-model="form.fpo_market_linkages" />
              <span>Local market (village)</span>
            </label>
            <label class="checkbox-label">
              <input type="checkbox" value="Traders or middlemen" v-model="form.fpo_market_linkages" />
              <span>Traders or middlemen</span>
            </label>
            <label class="checkbox-label">
              <input type="checkbox" value="Farmer groups / cooperatives" v-model="form.fpo_market_linkages" />
              <span>Farmer groups / cooperatives</span>
            </label>
            <label class="checkbox-label">
              <input type="checkbox" value="Direct to consumers" v-model="form.fpo_market_linkages" />
              <span>Direct to consumers</span>
            </label>
            <label class="checkbox-label">
              <input type="checkbox" value="Institutional or organized markets" v-model="form.fpo_market_linkages" />
              <span>Institutional or organized markets</span>
            </label>
          </div>
        </div>

        <!-- Q21: GP Elected Member -->
        <div class="form-group">
          <label class="form-label">Elected Member of Gram Panchayat</label>
          <select v-model="form.gp_elected_member" class="form-select">
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </select>
        </div>
        <div class="form-group" v-if="form.gp_elected_member === 'Yes'">
          <label class="form-label">Specify Membership</label>
          <input v-model="form.gp_membership_details" type="text" class="form-input" 
                 placeholder="Type the membership role" />
        </div>

        <!-- Q22: Assets -->
        <div class="form-group">
          <label class="form-label">Assets</label>
          <select v-model="form.assets_ownership" class="form-select">
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </select>
        </div>
        <div class="form-group" v-if="form.assets_ownership === 'Yes'">
          <label class="form-label">Asset Type</label>
          <select v-model="form.asset_type" class="form-select">
            <option value="">— Select —</option>
            <option>Land</option><option>House</option>
          </select>
        </div>
        <div class="form-group" v-if="form.assets_ownership === 'Yes' && form.asset_type === 'Land'">
          <label class="form-label">Land Type</label>
          <select v-model="form.land_type_detail" class="form-select">
            <option value="">— Select —</option>
            <option>Agriculture</option><option>Residential</option><option>Others</option>
          </select>
        </div>

        <!-- Q23: Government Schemes -->
        <div class="form-group full">
          <label class="form-label">Government Schemes Benefitted (Multi-select)</label>
          <div class="checkbox-group">
            <label class="checkbox-label">
              <input type="checkbox" value="PMFBY (Crop insurance)" v-model="form.govt_schemes_benefits" />
              <span>PMFBY (Crop insurance)</span>
            </label>
            <label class="checkbox-label">
              <input type="checkbox" value="PMKSY (Irrigation support)" v-model="form.govt_schemes_benefits" />
              <span>PMKSY (Irrigation support)</span>
            </label>
            <label class="checkbox-label">
              <input type="checkbox" value="PMMSY (Fisheries development)" v-model="form.govt_schemes_benefits" />
              <span>PMMSY (Fisheries development)</span>
            </label>
            <label class="checkbox-label">
              <input type="checkbox" value="NRLM / TNSRLM (SHG & livelihood support)" v-model="form.govt_schemes_benefits" />
              <span>NRLM / TNSRLM (SHG & livelihood support)</span>
            </label>
            <label class="checkbox-label">
              <input type="checkbox" value="FPO Promotion Schemes (SFAC / NABARD / Central Sector)" v-model="form.govt_schemes_benefits" />
              <span>FPO Promotion Schemes (SFAC / NABARD / Central Sector)</span>
            </label>
            <label class="checkbox-label">
              <input type="checkbox" value="MGNREGA (Wage employment)" v-model="form.govt_schemes_benefits" />
              <span>MGNREGA (Wage employment)</span>
            </label>
            <label class="checkbox-label">
              <input type="checkbox" value="PDS (Ration / food security)" v-model="form.govt_schemes_benefits" />
              <span>PDS (Ration / food security)</span>
            </label>
            <label class="checkbox-label">
              <input type="checkbox" value="Kisan Credit Card (KCC)" v-model="form.govt_schemes_benefits" />
              <span>Kisan Credit Card (KCC)</span>
            </label>
            <label class="checkbox-label">
              <input type="checkbox" value="Ayushman Bharat or Health Insurance" v-model="form.govt_schemes_benefits" />
              <span>Ayushman Bharat or Health Insurance</span>
            </label>
            <label class="checkbox-label">
              <input type="checkbox" value="Other" v-model="form.govt_schemes_benefits" />
              <span>Other (specify)</span>
            </label>
            <label class="checkbox-label">
              <input type="checkbox" value="Not benefited from any scheme" v-model="form.govt_schemes_benefits" />
              <span>Not benefited from any scheme</span>
            </label>
          </div>
        </div>
        <div class="form-group full" v-if="form.govt_schemes_benefits.includes('Other')">
          <label class="form-label">If Other Scheme, Please Specify</label>
          <input v-model="form.govt_schemes_benefit_other" type="text" class="form-input" 
                 placeholder="Specify other scheme" />
        </div>
        <div class="form-group full" v-if="form.govt_schemes_benefits.length > 0 && !form.govt_schemes_benefits.includes('Not benefited from any scheme')">
          <label class="form-label">Please Specify the Benefit</label>
          <input v-model="form.scheme_benefit_details" type="text" class="form-input" 
                 placeholder="Type the benefit details" />
        </div>

        <!-- Q24: MSSRF Support -->
        <div class="form-group">
          <label class="form-label">Received Support from MSSRF Earlier</label>
          <select v-model="form.mssrf_support_earlier" class="form-select">
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </select>
        </div>
        <div class="form-group" v-if="form.mssrf_support_earlier === 'Yes'">
          <label class="form-label">Specify MSSRF Support</label>
          <input v-model="form.mssrf_support_details" type="text" class="form-input" 
                 placeholder="Type the response" />
        </div>

        <!-- Q25: Other NGO Support -->
        <div class="form-group">
          <label class="form-label">Received Support from Other NGOs</label>
          <select v-model="form.other_ngo_support" class="form-select">
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </select>
        </div>
        <div class="form-group" v-if="form.other_ngo_support === 'Yes'">
          <label class="form-label">Specify NGO Support</label>
          <input v-model="form.ngo_support_details" type="text" class="form-input" 
                 placeholder="Type the response" />
        </div>
      </div>
      </div><!-- End Step 2 -->

      <!-- ════════ STEP 3: HOUSEHOLD MEMBERS ════════ -->
      <div v-show="currentStep === 3">
      <!-- ── PART 5: HOUSEHOLD MEMBERS PROFILE ── -->
      <div class="form-section">👨‍👩‍👧‍👦 Part 5: Household Members Profile</div>
      
      <!-- Members Table -->
      <div v-if="form.members.length > 0" class="members-table-wrapper">
        <table class="members-table">
          <thead>
            <tr>
              <th>S.No</th>
              <th>Name</th>
              <th>Age</th>
              <th>Relationship to Head</th>
              <th>Social Category</th>
              <th>Marital Status</th>
              <th>Education</th>
              <th>Occupation</th>
              <th>Monthly Income</th>
              <th>Differently Abled</th>
              <th>Mobile Number</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(member, index) in form.members" :key="index">
              <td>{{ index + 1 }}</td>
              <td>{{ member.member_name }}</td>
              <td>{{ member.age }}</td>
              <td>{{ member.relationship_to_head }}</td>
              <td>{{ member.social_category }}</td>
              <td>{{ member.marital_status }}</td>
              <td>{{ member.education }}</td>
              <td>{{ member.occupation }}</td>
              <td>{{ member.monthly_income ? '₹' + member.monthly_income : '-' }}</td>
              <td>{{ member.differently_abled || 'No' }}</td>
              <td>{{ member.mobile_number || '-' }}</td>
              <td>
                <button @click="editMember(index)" class="btn-icon" title="Edit">✏️</button>
                <button @click="removeMember(index)" class="btn-icon" title="Delete">🗑️</button>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Additional Member Details Table -->
        <table class="members-table members-details-table" style="margin-top: 20px;">
          <thead>
            <tr>
              <th>S.No</th>
              <th>Membership in CBO<br>(SHG/FPO/GP/others)</th>
              <th>Role in the CBO</th>
              <th>Loan Amount</th>
              <th>Source of Loan</th>
              <th>Reason for Loan</th>
              <th>Assets<br>(Land/House)</th>
              <th>Schemes Benefitted</th>
              <th>Project Support<br>from MSSRF</th>
              <th>Project Support<br>from Other NGOs</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(member, index) in form.members" :key="'details-' + index">
              <td>{{ index + 1 }}</td>
              <td>
                <span v-if="member.shg_membership === 'Yes'">SHG</span>
                <span v-if="member.fpo_membership === 'Yes'">{{ member.shg_membership === 'Yes' ? ', ' : '' }}FPO</span>
                <span v-if="member.gp_elected_member === 'Yes'">{{ (member.shg_membership === 'Yes' || member.fpo_membership === 'Yes') ? ', ' : '' }}GP</span>
                <span v-if="member.shg_membership !== 'Yes' && member.fpo_membership !== 'Yes' && member.gp_elected_member !== 'Yes'">-</span>
              </td>
              <td>
                <div v-if="member.shg_role">SHG: {{ member.shg_role }}</div>
                <div v-if="member.fpo_role">FPO: {{ member.fpo_role }}</div>
                <div v-if="member.gp_membership_details">GP: {{ member.gp_membership_details }}</div>
                <span v-if="!member.shg_role && !member.fpo_role && !member.gp_membership_details">-</span>
              </td>
              <td>
                <div v-if="member.shg_loan === 'Yes' && (member.shg_loan_savings || member.shg_loan_bank || member.shg_loan_mfi || member.shg_loan_others)">
                  <div v-if="member.shg_loan_savings">Savings: ₹{{ member.shg_loan_savings }}</div>
                  <div v-if="member.shg_loan_bank">Bank: ₹{{ member.shg_loan_bank }}</div>
                  <div v-if="member.shg_loan_mfi">MFI: ₹{{ member.shg_loan_mfi }}</div>
                  <div v-if="member.shg_loan_others">Others: ₹{{ member.shg_loan_others }}</div>
                </div>
                <span v-else>-</span>
              </td>
              <td>
                <span v-if="member.shg_loan === 'Yes'">SHG</span>
                <span v-else>-</span>
              </td>
              <td>{{ member.loan_reason || '-' }}</td>
              <td>
                <span v-if="member.assets_ownership === 'Yes' && member.asset_type">{{ member.asset_type }}</span>
                <span v-if="member.assets_ownership === 'Yes' && member.asset_type === 'Land' && member.land_type_detail"> ({{ member.land_type_detail }})</span>
                <span v-if="member.assets_ownership !== 'Yes'">-</span>
              </td>
              <td>{{ member.govt_schemes_benefit || '-' }}</td>
              <td>
                <span v-if="member.mssrf_support_earlier === 'Yes'">{{ member.mssrf_support_details || 'Yes' }}</span>
                <span v-else>No</span>
              </td>
              <td>
                <span v-if="member.other_ngo_support === 'Yes'">{{ member.ngo_support_details || 'Yes' }}</span>
                <span v-else>No</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Add/Edit Member Form -->
      <div ref="memberFormRef" class="member-form" v-if="showMemberForm">
        <div class="form-section" style="background: var(--blue-pale); padding: 10px; margin-bottom: 12px; border-radius: 4px;">
          {{ editingMemberIndex !== null ? '✏️ Edit Member' : '➕ Add New Member' }}
        </div>
        
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">Name <span class="req">*</span></label>
            <input v-model="currentMember.member_name" type="text" class="form-input" placeholder="Full name" />
          </div>
          <div class="form-group">
            <label class="form-label">Age <span class="req">*</span></label>
            <input v-model="currentMember.age" type="number" class="form-input" placeholder="Age" max="120" />
          </div>
          <div class="form-group">
            <label class="form-label">Relationship to Head <span class="req">*</span></label>
            <select v-model="currentMember.relationship_to_head" class="form-select">
              <option value="">— Select —</option>
              <option>Self</option>
              <option>Spouse</option>
              <option>Son</option>
              <option>Daughter</option>
              <option>Father</option>
              <option>Mother</option>
              <option>Brother</option>
              <option>Sister</option>
              <option>Grandson</option>
              <option>Granddaughter</option>
              <option>Other</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Social Category</label>
            <select v-model="currentMember.social_category" class="form-select">
              <option value="">— Select —</option>
              <option>SC</option><option>ST</option><option>OBC</option>
              <option>General</option><option>EWS</option><option>Others</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Marital Status</label>
            <select v-model="currentMember.marital_status" class="form-select">
              <option value="">— Select —</option>
              <option>Married</option><option>Single</option><option>Widowed</option>
              <option>Divorced</option><option>Separated</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Education</label>
            <select v-model="currentMember.education" class="form-select">
              <option value="">— Select —</option>
              <option>Illiterate to 9th std</option>
              <option>10th</option>
              <option>12th</option>
              <option>UG or Diploma</option>
              <option>PG</option>
              <option>PhD</option>
              <option>Others</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Occupation</label>
            <input v-model="currentMember.occupation" type="text" class="form-input" 
                   placeholder="e.g., Student, Daily wages" />
          </div>
          <div class="form-group">
            <label class="form-label">Monthly Income (₹)</label>
            <input v-model="currentMember.monthly_income" type="number" class="form-input" placeholder="0" />
          </div>
          <div class="form-group">
            <label class="form-label">Mobile Number</label>
            <input v-model="currentMember.mobile_number" type="text" class="form-input" 
                   placeholder="10-digit mobile" maxlength="10" />
          </div>
          
          <!-- Disability Fields -->
          <div class="form-group">
            <label class="form-label">Differently Abled</label>
            <select v-model="currentMember.differently_abled" class="form-select">
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </div>
          <div class="form-group full" v-if="currentMember.differently_abled === 'Yes'">
            <label class="form-label">If Yes, Specify the Disability Category (Multi-select)</label>
            <div class="checkbox-group">
              <label class="checkbox-label">
                <input type="checkbox" value="Locomotor or Physical disability" v-model="currentMember.disability_categories" />
                <span>Locomotor or Physical disability</span>
              </label>
              <label class="checkbox-label">
                <input type="checkbox" value="Visual impairment" v-model="currentMember.disability_categories" />
                <span>Visual impairment</span>
              </label>
              <label class="checkbox-label">
                <input type="checkbox" value="Hearing impairment" v-model="currentMember.disability_categories" />
                <span>Hearing impairment</span>
              </label>
              <label class="checkbox-label">
                <input type="checkbox" value="Speech and language disability" v-model="currentMember.disability_categories" />
                <span>Speech and language disability</span>
              </label>
              <label class="checkbox-label">
                <input type="checkbox" value="Intellectual disability" v-model="currentMember.disability_categories" />
                <span>Intellectual disability</span>
              </label>
              <label class="checkbox-label">
                <input type="checkbox" value="Multiple disabilities" v-model="currentMember.disability_categories" />
                <span>Multiple disabilities</span>
              </label>
              <label class="checkbox-label">
                <input type="checkbox" value="Other" v-model="currentMember.disability_categories" />
                <span>Other (specify)</span>
              </label>
            </div>
          </div>
          <div class="form-group full" v-if="currentMember.differently_abled === 'Yes' && currentMember.disability_categories.includes('Other')">
            <label class="form-label">If Other, Please Specify</label>
            <input v-model="currentMember.disability_category_other" type="text" class="form-input" 
                   placeholder="Specify other disability type" />
          </div>
        </div>

        <!-- CBO Membership Section -->
        <div class="form-section" style="background: var(--green-pale); padding: 8px 12px; margin: 20px 0 12px 0; border-radius: 4px; font-size: 13px; font-weight: 600;">
          🏛️ Membership in CBOs (SHG/FPO/GP)
        </div>
        
        <div class="form-grid form-grid-3">
          <!-- SHG Membership -->
          <div class="form-group">
            <label class="form-label">SHG Membership</label>
            <select v-model="currentMember.shg_membership" class="form-select">
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </div>
          <div class="form-group" v-if="currentMember.shg_membership === 'Yes'">
            <label class="form-label">Your Role in SHG</label>
            <select v-model="currentMember.shg_role" class="form-select">
              <option value="">— Select —</option>
              <option>Member</option><option>Leader</option>
              <option>Co-leader</option><option>Others</option>
            </select>
          </div>
          <div class="form-group" v-if="currentMember.shg_membership === 'Yes'">
            <label class="form-label">Loan from SHG</label>
            <select v-model="currentMember.shg_loan" class="form-select">
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </div>
          <div class="form-group" v-if="currentMember.shg_membership === 'Yes' && currentMember.shg_loan === 'Yes'">
            <label class="form-label">Loan Amount (SHG-Savings) (₹)</label>
            <input v-model="currentMember.shg_loan_savings" type="number" class="form-input" placeholder="Amount" />
          </div>
          <div class="form-group" v-if="currentMember.shg_membership === 'Yes' && currentMember.shg_loan === 'Yes'">
            <label class="form-label">Loan Amount (Bank) (₹)</label>
            <input v-model="currentMember.shg_loan_bank" type="number" class="form-input" placeholder="Amount" />
          </div>
          <div class="form-group" v-if="currentMember.shg_membership === 'Yes' && currentMember.shg_loan === 'Yes'">
            <label class="form-label">Loan Amount (MFI) (₹)</label>
            <input v-model="currentMember.shg_loan_mfi" type="number" class="form-input" placeholder="Amount" />
          </div>
          <div class="form-group" v-if="currentMember.shg_membership === 'Yes' && currentMember.shg_loan === 'Yes'">
            <label class="form-label">Loan Amount (Others) (₹)</label>
            <input v-model="currentMember.shg_loan_others" type="number" class="form-input" placeholder="Amount" />
          </div>
          <div class="form-group full" v-if="currentMember.shg_membership === 'Yes' && currentMember.shg_loan === 'Yes'">
            <label class="form-label">Reason for Loan</label>
            <input v-model="currentMember.loan_reason" type="text" class="form-input" placeholder="Type the reason" />
          </div>

          <!-- FPO Membership -->
          <div class="form-group">
            <label class="form-label">FPO Membership</label>
            <select v-model="currentMember.fpo_membership" class="form-select">
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </div>
          <div class="form-group" v-if="currentMember.fpo_membership === 'Yes'">
            <label class="form-label">Your Role in FPO</label>
            <select v-model="currentMember.fpo_role" class="form-select">
              <option value="">— Select —</option>
              <option>Member</option><option>CEO</option>
              <option>BoD</option><option>Others</option>
            </select>
          </div>
          <div class="form-group" v-if="currentMember.fpo_membership === 'Yes'">
            <label class="form-label">Investment Amount (₹)</label>
            <input v-model="currentMember.fpo_investment" type="number" class="form-input" placeholder="Amount" />
          </div>
          <div class="form-group" v-if="currentMember.fpo_membership === 'Yes'">
            <label class="form-label">Type of FPO</label>
            <select v-model="currentMember.fpo_type" class="form-select">
              <option value="">— Select —</option>
              <option>Producer Company</option><option>Cooperative Society</option>
              <option>Section 8 Company</option><option>Trust or Society</option>
              <option>Others</option>
            </select>
          </div>
          <div class="form-group full" v-if="currentMember.fpo_membership === 'Yes'">
            <label class="form-label">Main Commodity Handled by FPO (Multi-select)</label>
            <div class="checkbox-group">
              <label class="checkbox-label">
                <input type="checkbox" value="Cereals (Paddy, Wheat, Millets)" v-model="currentMember.fpo_commodities" />
                <span>Cereals (Paddy, Wheat, Millets)</span>
              </label>
              <label class="checkbox-label">
                <input type="checkbox" value="Fruits & Vegetables" v-model="currentMember.fpo_commodities" />
                <span>Fruits & Vegetables</span>
              </label>
              <label class="checkbox-label">
                <input type="checkbox" value="Spices" v-model="currentMember.fpo_commodities" />
                <span>Spices</span>
              </label>
              <label class="checkbox-label">
                <input type="checkbox" value="Plantation crops (Tea, Coffee, Rubber)" v-model="currentMember.fpo_commodities" />
                <span>Plantation crops (Tea, Coffee, Rubber)</span>
              </label>
              <label class="checkbox-label">
                <input type="checkbox" value="Livestock (Dairy, Goat, Poultry)" v-model="currentMember.fpo_commodities" />
                <span>Livestock (Dairy, Goat, Poultry)</span>
              </label>
              <label class="checkbox-label">
                <input type="checkbox" value="Fisheries" v-model="currentMember.fpo_commodities" />
                <span>Fisheries</span>
              </label>
              <label class="checkbox-label">
                <input type="checkbox" value="Non-Timber Forest Produce (NTFP)" v-model="currentMember.fpo_commodities" />
                <span>Non-Timber Forest Produce (NTFP)</span>
              </label>
              <label class="checkbox-label">
                <input type="checkbox" value="Medicinal & Aromatic Plants" v-model="currentMember.fpo_commodities" />
                <span>Medicinal & Aromatic Plants</span>
              </label>
              <label class="checkbox-label">
                <input type="checkbox" value="Other" v-model="currentMember.fpo_commodities" />
                <span>Other (specify)</span>
              </label>
            </div>
          </div>
          <div class="form-group full" v-if="currentMember.fpo_membership === 'Yes' && currentMember.fpo_commodities.includes('Other')">
            <label class="form-label">If Other Commodity, Please Specify</label>
            <input v-model="currentMember.fpo_commodity_other" type="text" class="form-input" 
                   placeholder="Specify other commodity" />
          </div>
          <div class="form-group full" v-if="currentMember.fpo_membership === 'Yes'">
            <label class="form-label">Market Linkage (Multi-select)</label>
            <div class="checkbox-group">
              <label class="checkbox-label">
                <input type="checkbox" value="Local market (village)" v-model="currentMember.fpo_market_linkages" />
                <span>Local market (village)</span>
              </label>
              <label class="checkbox-label">
                <input type="checkbox" value="Traders or middlemen" v-model="currentMember.fpo_market_linkages" />
                <span>Traders or middlemen</span>
              </label>
              <label class="checkbox-label">
                <input type="checkbox" value="Farmer groups / cooperatives" v-model="currentMember.fpo_market_linkages" />
                <span>Farmer groups / cooperatives</span>
              </label>
              <label class="checkbox-label">
                <input type="checkbox" value="Direct to consumers" v-model="currentMember.fpo_market_linkages" />
                <span>Direct to consumers</span>
              </label>
              <label class="checkbox-label">
                <input type="checkbox" value="Institutional or organized markets" v-model="currentMember.fpo_market_linkages" />
                <span>Institutional or organized markets</span>
              </label>
            </div>
          </div>

          <!-- GP Membership -->
          <div class="form-group">
            <label class="form-label">Elected Member of Gram Panchayat</label>
            <select v-model="currentMember.gp_elected_member" class="form-select">
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </div>
          <div class="form-group" v-if="currentMember.gp_elected_member === 'Yes'">
            <label class="form-label">Specify Membership</label>
            <input v-model="currentMember.gp_membership_details" type="text" class="form-input" 
                   placeholder="Type the membership role" />
          </div>

          <!-- Assets -->
          <div class="form-group">
            <label class="form-label">Assets</label>
            <select v-model="currentMember.assets_ownership" class="form-select">
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </div>
          <div class="form-group" v-if="currentMember.assets_ownership === 'Yes'">
            <label class="form-label">Asset Type</label>
            <select v-model="currentMember.asset_type" class="form-select">
              <option value="">— Select —</option>
              <option>Land</option><option>House</option>
            </select>
          </div>
          <div class="form-group" v-if="currentMember.assets_ownership === 'Yes' && currentMember.asset_type === 'Land'">
            <label class="form-label">Land Type</label>
            <select v-model="currentMember.land_type_detail" class="form-select">
              <option value="">— Select —</option>
              <option>Agriculture</option><option>Residential</option><option>Others</option>
            </select>
          </div>

          <!-- Government Schemes -->
          <div class="form-group full">
            <label class="form-label">Government Schemes Benefitted (Multi-select)</label>
            <div class="checkbox-group">
              <label class="checkbox-label">
                <input type="checkbox" value="PMFBY (Crop insurance)" v-model="currentMember.govt_schemes_benefits" />
                <span>PMFBY (Crop insurance)</span>
              </label>
              <label class="checkbox-label">
                <input type="checkbox" value="PMKSY (Irrigation support)" v-model="currentMember.govt_schemes_benefits" />
                <span>PMKSY (Irrigation support)</span>
              </label>
              <label class="checkbox-label">
                <input type="checkbox" value="PMMSY (Fisheries development)" v-model="currentMember.govt_schemes_benefits" />
                <span>PMMSY (Fisheries development)</span>
              </label>
              <label class="checkbox-label">
                <input type="checkbox" value="NRLM / TNSRLM (SHG & livelihood support)" v-model="currentMember.govt_schemes_benefits" />
                <span>NRLM / TNSRLM (SHG & livelihood support)</span>
              </label>
              <label class="checkbox-label">
                <input type="checkbox" value="FPO Promotion Schemes (SFAC / NABARD / Central Sector)" v-model="currentMember.govt_schemes_benefits" />
                <span>FPO Promotion Schemes (SFAC / NABARD / Central Sector)</span>
              </label>
              <label class="checkbox-label">
                <input type="checkbox" value="MGNREGA (Wage employment)" v-model="currentMember.govt_schemes_benefits" />
                <span>MGNREGA (Wage employment)</span>
              </label>
              <label class="checkbox-label">
                <input type="checkbox" value="PDS (Ration / food security)" v-model="currentMember.govt_schemes_benefits" />
                <span>PDS (Ration / food security)</span>
              </label>
              <label class="checkbox-label">
                <input type="checkbox" value="Kisan Credit Card (KCC)" v-model="currentMember.govt_schemes_benefits" />
                <span>Kisan Credit Card (KCC)</span>
              </label>
              <label class="checkbox-label">
                <input type="checkbox" value="Ayushman Bharat or Health Insurance" v-model="currentMember.govt_schemes_benefits" />
                <span>Ayushman Bharat or Health Insurance</span>
              </label>
              <label class="checkbox-label">
                <input type="checkbox" value="Other" v-model="currentMember.govt_schemes_benefits" />
                <span>Other (specify)</span>
              </label>
              <label class="checkbox-label">
                <input type="checkbox" value="Not benefited from any scheme" v-model="currentMember.govt_schemes_benefits" />
                <span>Not benefited from any scheme</span>
              </label>
            </div>
          </div>
          <div class="form-group full" v-if="currentMember.govt_schemes_benefits.includes('Other')">
            <label class="form-label">If Other Scheme, Please Specify</label>
            <input v-model="currentMember.govt_schemes_benefit_other" type="text" class="form-input" 
                   placeholder="Specify other scheme" />
          </div>
          <div class="form-group full" v-if="currentMember.govt_schemes_benefits.length > 0 && !currentMember.govt_schemes_benefits.includes('Not benefited from any scheme')">
            <label class="form-label">Please Specify the Benefit</label>
            <input v-model="currentMember.scheme_benefit_details" type="text" class="form-input" 
                   placeholder="Type the benefit details" />
          </div>

          <!-- MSSRF Support -->
          <div class="form-group">
            <label class="form-label">Received Support from MSSRF Earlier</label>
            <select v-model="currentMember.mssrf_support_earlier" class="form-select">
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </div>
          <div class="form-group" v-if="currentMember.mssrf_support_earlier === 'Yes'">
            <label class="form-label">Specify MSSRF Support</label>
            <input v-model="currentMember.mssrf_support_details" type="text" class="form-input" 
                   placeholder="Type the response" />
          </div>

          <!-- Other NGO Support -->
          <div class="form-group">
            <label class="form-label">Received Support from Other NGOs</label>
            <select v-model="currentMember.other_ngo_support" class="form-select">
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </div>
          <div class="form-group" v-if="currentMember.other_ngo_support === 'Yes'">
            <label class="form-label">Specify NGO Support</label>
            <input v-model="currentMember.ngo_support_details" type="text" class="form-input" 
                   placeholder="Type the response" />
          </div>
        </div>

        <div class="form-actions" style="margin-top: 12px;">
          <button @click="cancelMemberForm" class="btn btn-outline btn-sm">Cancel</button>
          <button @click="saveMember" class="btn btn-primary btn-sm">
            {{ editingMemberIndex !== null ? 'Update Member' : 'Add Member' }}
          </button>
        </div>
      </div>

      <!-- Add Member Button -->
      <button v-if="!showMemberForm" @click="openMemberForm" class="btn btn-outline btn-sm btn-add-member" style="margin-bottom: 20px;">
        ➕ Add Household Member
      </button>
      </div><!-- End Step 3 -->

      <!-- ════════ STEP 4: HOUSING & LIVING ════════ -->
      <div v-show="currentStep === 4">
      <!-- ── PART 6: HOUSING & LIVING CONDITIONS ── -->
      <div class="form-section">🏠 Part 6: Housing & Living Conditions</div>
      <div class="form-grid form-grid-3">
        <div class="form-group">
          <label class="form-label">Type of House <span class="req">*</span></label>
          <select v-model="form.type_of_house" class="form-select">
            <option value="">— Select —</option>
            <option>Kutcha</option><option>Semi-pucca</option><option>Pucca</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Ownership Status <span class="req">*</span></label>
          <select v-model="form.ownership_status" class="form-select">
            <option value="">— Select —</option>
            <option>Own</option><option>Rented</option><option>Lease</option><option>Other</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Number of Rooms <span class="req">*</span></label>
          <input v-model="form.number_of_rooms" type="number" class="form-input" placeholder="Numeric" />
        </div>
        <div class="form-group">
          <label class="form-label">Type of Roof <span class="req">*</span></label>
          <select v-model="form.type_of_roof" class="form-select">
            <option value="">— Select —</option>
            <option>Thatch</option><option>Tile</option><option>Concrete</option>
            <option>Metal sheet</option><option>Other</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Type of Floor <span class="req">*</span></label>
          <select v-model="form.type_of_floor" class="form-select">
            <option value="">— Select —</option>
            <option>Mud</option><option>Cement</option><option>Tile</option><option>Other</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Access to Electricity <span class="req">*</span></label>
          <select v-model="form.access_to_electricity" class="form-select">
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Source of Lighting <span class="req">*</span></label>
          <select v-model="form.source_of_lighting" class="form-select">
            <option value="">— Select —</option>
            <option>Electricity</option><option>Solar</option><option>Kerosene</option><option>Other</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Cooking Fuel <span class="req">*</span></label>
          <select v-model="form.cooking_fuel" class="form-select">
            <option value="">— Select —</option>
            <option>LPG</option><option>Firewood</option><option>Kerosene</option>
            <option>Electricity</option><option>Biogas</option><option>Other</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Separate Kitchen Available <span class="req">*</span></label>
          <select v-model="form.separate_kitchen" class="form-select">
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </select>
        </div>
      </div>
      </div><!-- End Step 4 -->

      <!-- ════════ STEP 5: WATER & SANITATION ════════ -->
      <div v-show="currentStep === 5">
      <!-- ── PART 7: WATER, SANITATION & HYGIENE ── -->
      <div class="form-section">💧 Part 7: Water, Sanitation & Hygiene</div>
      <div class="form-grid form-grid-3">
        <div class="form-group">
          <label class="form-label">Primary Source of Drinking Water <span class="req">*</span></label>
          <select v-model="form.primary_water_source" class="form-select">
            <option value="">— Select —</option>
            <option>Piped water</option><option>Borewell</option><option>Open well</option>
            <option>River</option><option>Tanker</option><option>Other</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Distance to Water Source <span class="req">*</span></label>
          <select v-model="form.distance_to_water" class="form-select">
            <option value="">— Select —</option>
            <option>Within premises</option><option>&lt;500m</option>
            <option>500m-1km</option><option>&gt;1km</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Availability of Water <span class="req">*</span></label>
          <select v-model="form.water_availability" class="form-select">
            <option value="">— Select —</option>
            <option>Regular</option><option>Irregular</option><option>Seasonal</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Type of Toilet Facility <span class="req">*</span></label>
          <select v-model="form.type_of_toilet_facility" class="form-select">
            <option value="">— Select —</option>
            <option>Individual toilet</option><option>Shared toilet</option><option>Open defecation</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Type of Toilet</label>
          <select v-model="form.type_of_toilet" class="form-select">
            <option value="">— Select —</option>
            <option>Flush</option><option>Pit</option><option>Septic tank</option><option>Other</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Handwashing Facility Available <span class="req">*</span></label>
          <select v-model="form.handwashing_facility" class="form-select">
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Use of Soap for Handwashing <span class="req">*</span></label>
          <select v-model="form.use_of_soap" class="form-select">
            <option value="">— Select —</option>
            <option>Always</option><option>Sometimes</option><option>Rarely</option><option>Never</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Solid Waste Disposal Method <span class="req">*</span></label>
          <select v-model="form.solid_waste_disposal" class="form-select">
            <option value="">— Select —</option>
            <option>Collection</option><option>Burning</option><option>Dumping</option><option>Composting</option>
          </select>
        </div>
      </div>
      </div><!-- End Step 5 -->

      <!-- ════════ STEP 6: HEALTH & EDUCATION ════════ -->
      <div v-show="currentStep === 6">
      <!-- ── PART 8: HEALTH ── -->
      <div class="form-section">🏥 Part 8: Health</div>
      <div class="form-grid form-grid-3">
        <div class="form-group">
          <label class="form-label">Any Member with Chronic Illness <span class="req">*</span></label>
          <select v-model="form.chronic_illness" class="form-select">
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </select>
        </div>
        <div class="form-group full" v-if="form.chronic_illness === 'Yes'">
          <label class="form-label">If Yes, Specify</label>
          <input v-model="form.chronic_illness_detail" type="text" class="form-input" placeholder="Type details" />
        </div>
        <div class="form-group">
          <label class="form-label">Access to Nearest Health Facility <span class="req">*</span></label>
          <select v-model="form.nearest_health_facility" class="form-select">
            <option value="">— Select —</option>
            <option>PHC</option><option>Private clinic</option><option>Hospital</option><option>None</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Distance to Health Facility <span class="req">*</span></label>
          <select v-model="form.distance_to_health" class="form-select">
            <option value="">— Select —</option>
            <option>&lt;1 km</option><option>1-5 km</option><option>&gt;5 km</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Health Insurance Coverage <span class="req">*</span></label>
          <select v-model="form.health_insurance" class="form-select">
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </select>
        </div>
        <div class="form-group" v-if="form.health_insurance === 'Yes'">
          <label class="form-label">If Yes, Scheme Name</label>
          <select v-model="form.health_insurance_scheme" class="form-select">
            <option value="">— Select —</option>
            <option>Ayushman Bharat</option>
            <option>State scheme</option>
            <option>Private</option>
            <option>Other</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Pregnant/Lactating Women in Household</label>
          <select v-model="form.pregnant_lactating" class="form-select">
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Children Under 5 Years</label>
          <input v-model="form.children_under_5" type="number" class="form-input" placeholder="Numeric" />
        </div>
        <div class="form-group">
          <label class="form-label">Immunization Status of Children</label>
          <select v-model="form.immunization_status" class="form-select">
            <option value="">— Select —</option>
            <option>Fully</option><option>Partially</option><option>Not immunized</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Access to Anganwadi Services</label>
          <select v-model="form.anganwadi_access" class="form-select">
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </select>
        </div>
      </div>

      <!-- ── PART 8 (CONTINUED): EDUCATION ── -->
      <div class="form-section">📚 Part 8: Education</div>
      <div class="form-grid form-grid-3">
        <div class="form-group">
          <label class="form-label">Children Currently Attending School</label>
          <select v-model="form.children_attending_school" class="form-select">
            <option value="">— Select —</option>
            <option>All</option><option>Some</option><option>None</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Type of School</label>
          <select v-model="form.type_of_school" class="form-select">
            <option value="">— Select —</option>
            <option>Government</option><option>Private</option><option>Both</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Dropout Cases in Household</label>
          <select v-model="form.dropout_cases" class="form-select">
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </select>
        </div>
        <div class="form-group" v-if="form.dropout_cases === 'Yes'">
          <label class="form-label">If Yes, Reason</label>
          <select v-model="form.dropout_reason" class="form-select">
            <option value="">— Select —</option>
            <option>Financial</option><option>Distance</option><option>Work</option>
            <option>Marriage</option><option>Other</option>
          </select>
        </div>
      </div>
      </div><!-- End Step 6 -->

      <!-- ════════ STEP 7: ASSETS & LIVELIHOOD ════════ -->
      <div v-show="currentStep === 7">
      <!-- ── PART 9: ASSETS AND CREDITS ── -->
      <div class="form-section">💰 Part 9: Assets and Credits</div>
      <div class="form-grid form-grid-3">
        <div class="form-group full">
          <label class="form-label">Household Assets</label>
          <div class="checkbox-group">
            <label class="checkbox-label">
              <input type="checkbox" value="TV" v-model="form.household_assets" />
              <span>TV</span>
            </label>
            <label class="checkbox-label">
              <input type="checkbox" value="Refrigerator" v-model="form.household_assets" />
              <span>Refrigerator</span>
            </label>
            <label class="checkbox-label">
              <input type="checkbox" value="Vehicle" v-model="form.household_assets" />
              <span>Vehicle</span>
            </label>
            <label class="checkbox-label">
              <input type="checkbox" value="Mobile" v-model="form.household_assets" />
              <span>Mobile</span>
            </label>
            <label class="checkbox-label">
              <input type="checkbox" value="Computer" v-model="form.household_assets" />
              <span>Computer</span>
            </label>
            <label class="checkbox-label">
              <input type="checkbox" value="Other" v-model="form.household_assets" />
              <span>Other (specify)</span>
            </label>
          </div>
          <input v-if="form.household_assets.includes('Other')" 
                 v-model="form.household_asset_other" 
                 type="text" class="form-input" 
                 placeholder="Specify other asset" style="margin-top: 0.5rem;" />
        </div>
        <div class="form-group">
          <label class="form-label">Land Ownership</label>
          <select v-model="form.land_ownership" class="form-select">
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </select>
        </div>
        <div class="form-group" v-if="form.land_ownership === 'Yes'">
          <label class="form-label">Land Size (Acres)</label>
          <input v-model="form.land_size_total" type="number" step="0.01" class="form-input" placeholder="Acres" />
        </div>
        <div class="form-group full" v-if="form.land_ownership === 'Yes'">
          <label class="form-label">If Agriculture Land, Type of Irrigation (Multi-select)</label>
          <div class="checkbox-group">
            <label class="checkbox-label">
              <input type="checkbox" value="Rainfed" v-model="form.irrigation_types" />
              <span>Rainfed</span>
            </label>
            <label class="checkbox-label">
              <input type="checkbox" value="Borewell" v-model="form.irrigation_types" />
              <span>Borewell</span>
            </label>
            <label class="checkbox-label">
              <input type="checkbox" value="Open well" v-model="form.irrigation_types" />
              <span>Open well</span>
            </label>
            <label class="checkbox-label">
              <input type="checkbox" value="Canal irrigation" v-model="form.irrigation_types" />
              <span>Canal irrigation</span>
            </label>
            <label class="checkbox-label">
              <input type="checkbox" value="Tank irrigation" v-model="form.irrigation_types" />
              <span>Tank irrigation</span>
            </label>
            <label class="checkbox-label">
              <input type="checkbox" value="Drip irrigation" v-model="form.irrigation_types" />
              <span>Drip irrigation</span>
            </label>
            <label class="checkbox-label">
              <input type="checkbox" value="Sprinkler irrigation" v-model="form.irrigation_types" />
              <span>Sprinkler irrigation</span>
            </label>
            <label class="checkbox-label">
              <input type="checkbox" value="River lift irrigation" v-model="form.irrigation_types" />
              <span>River lift irrigation</span>
            </label>
            <label class="checkbox-label">
              <input type="checkbox" value="Farm pond" v-model="form.irrigation_types" />
              <span>Farm pond</span>
            </label>
            <label class="checkbox-label">
              <input type="checkbox" value="Other" v-model="form.irrigation_types" />
              <span>Other (specify)</span>
            </label>
          </div>
          <input v-if="form.irrigation_types.includes('Other')" 
                 v-model="form.irrigation_other" 
                 type="text" class="form-input" 
                 placeholder="Specify other irrigation type" style="margin-top: 0.5rem;" />
        </div>
        <div class="form-group" v-if="form.land_ownership === 'Yes'">
          <label class="form-label">Residential Plot Size (Acres)</label>
          <input v-model="form.residential_plot_size" type="number" step="0.01" class="form-input" placeholder="Acres" />
        </div>
        <div class="form-group">
          <label class="form-label">Livestock Ownership</label>
          <select v-model="form.livestock_ownership" class="form-select">
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </select>
        </div>
        <div class="form-group full" v-if="form.livestock_ownership === 'Yes'">
          <label class="form-label">If Yes, Specify Types (Multi-select, including no. of livestock)</label>
          <div class="checkbox-group">
            <label class="checkbox-label">
              <input type="checkbox" value="Cow" v-model="form.livestock_types" />
              <span>Cow</span>
            </label>
            <label class="checkbox-label">
              <input type="checkbox" value="Goat" v-model="form.livestock_types" />
              <span>Goat</span>
            </label>
            <label class="checkbox-label">
              <input type="checkbox" value="Poultry" v-model="form.livestock_types" />
              <span>Poultry</span>
            </label>
            <label class="checkbox-label">
              <input type="checkbox" value="Other" v-model="form.livestock_types" />
              <span>Others (specify)</span>
            </label>
          </div>
          <input v-if="form.livestock_types.includes('Other')" 
                 v-model="form.livestock_other" 
                 type="text" class="form-input" 
                 placeholder="Specify other livestock (include numbers)" style="margin-top: 0.5rem;" />
        </div>
      </div>
      </div><!-- End Step 7 -->

      <!-- ════════ STEP 8: FISHING/AQUACULTURE ════════ -->
      <div v-show="currentStep === 8">
      <!-- ── PART 11: FISHING/AQUACULTURE DETAILS ── -->
      <div class="form-section">🐟 Part 11: Fishing/Aquaculture Details</div>
      <div class="form-grid form-grid-3">
        <!-- Q57: Fishing Involved -->
        <div class="form-group">
          <label class="form-label">Does Anyone in Your HH Involved in Fisheries?</label>
          <div class="radio-group">
            <label class="radio-label">
              <input type="radio" value="Yes" v-model="form.fishing_involved" />
              <span>Yes</span>
            </label>
            <label class="radio-label">
              <input type="radio" value="No" v-model="form.fishing_involved" />
              <span>No</span>
            </label>
          </div>
        </div>

        <!-- Show remaining questions only if fishing_involved === 'Yes' -->
        <template v-if="form.fishing_involved === 'Yes'">
          <!-- Q58: Type of Fishing -->
          <div class="form-group full">
            <label class="form-label">Type of Fishing</label>
            <div class="checkbox-group">
              <label class="checkbox-label">
                <input type="checkbox" value="Marine" v-model="form.fishing_types" />
                <span>Marine</span>
              </label>
              <label class="checkbox-label">
                <input type="checkbox" value="Inland" v-model="form.fishing_types" />
                <span>Inland</span>
              </label>
              <label class="checkbox-label">
                <input type="checkbox" value="Aquaculture" v-model="form.fishing_types" />
                <span>Aquaculture</span>
              </label>
            </div>
          </div>

          <!-- Q58.1: Boat Ownership (show only if Marine is selected) -->
          <div class="form-group full" v-if="form.fishing_types.includes('Marine')">
            <label class="form-label">If Marine, Boat Ownership</label>
            <div class="radio-group">
              <label class="radio-label">
                <input type="radio" value="Own Boat" v-model="form.boat_ownership" />
                <span>Own Boat</span>
              </label>
              <label class="radio-label">
                <input type="radio" value="Fishing Worker" v-model="form.boat_ownership" />
                <span>Fishing Worker</span>
              </label>
              <label class="radio-label">
                <input type="radio" value="Leased or Shared Boat" v-model="form.boat_ownership" />
                <span>Leased or Shared Boat</span>
              </label>
              <label class="radio-label">
                <input type="radio" value="Not Applicable" v-model="form.boat_ownership" />
                <span>Not Applicable</span>
              </label>
            </div>
          </div>

          <!-- Q58.1.1: Type of Boat -->
          <div class="form-group" v-if="form.boat_ownership === 'Own Boat' || form.boat_ownership === 'Leased or Shared Boat'">
            <label class="form-label">Type of Boat</label>
            <select v-model="form.boat_type" class="form-select">
              <option value="">— Select —</option>
              <option>Motorized</option>
              <option>Mechanical</option>
              <option>Non-motorized</option>
            </select>
          </div>

          <!-- Q58.1.2: GPS in Boat -->
          <div class="form-group" v-if="form.boat_ownership === 'Own Boat' || form.boat_ownership === 'Leased or Shared Boat'">
            <label class="form-label">GPS in the Boat?</label>
            <div class="radio-group">
              <label class="radio-label">
                <input type="radio" value="Yes" v-model="form.gps_in_boat" />
                <span>Yes</span>
              </label>
              <label class="radio-label">
                <input type="radio" value="No" v-model="form.gps_in_boat" />
                <span>No</span>
              </label>
            </div>
          </div>

          <!-- Q59: Fishing Method -->
          <div class="form-group full">
            <label class="form-label">Fishing Method</label>
            <div class="checkbox-group">
              <label class="checkbox-label">
                <input type="checkbox" value="Net fishing" v-model="form.fishing_methods" />
                <span>Net fishing</span>
              </label>
              <label class="checkbox-label">
                <input type="checkbox" value="Line fishing" v-model="form.fishing_methods" />
                <span>Line fishing</span>
              </label>
              <label class="checkbox-label">
                <input type="checkbox" value="Trap fishing" v-model="form.fishing_methods" />
                <span>Trap fishing</span>
              </label>
              <label class="checkbox-label">
                <input type="checkbox" value="Culture-based farming" v-model="form.fishing_methods" />
                <span>Culture-based farming</span>
              </label>
            </div>
          </div>

          <!-- Q60: Fishing Frequency -->
          <div class="form-group full">
            <label class="form-label">Fishing Frequency (in a month)</label>
            <div class="radio-group">
              <label class="radio-label">
                <input type="radio" value="0–5 days" v-model="form.fishing_frequency" />
                <span>0–5 days</span>
              </label>
              <label class="radio-label">
                <input type="radio" value="6–10 days" v-model="form.fishing_frequency" />
                <span>6–10 days</span>
              </label>
              <label class="radio-label">
                <input type="radio" value="11–20 days" v-model="form.fishing_frequency" />
                <span>11–20 days</span>
              </label>
              <label class="radio-label">
                <input type="radio" value="21–25 days" v-model="form.fishing_frequency" />
                <span>21–25 days</span>
              </label>
              <label class="radio-label">
                <input type="radio" value="More than 25 days" v-model="form.fishing_frequency" />
                <span>More than 25 days</span>
              </label>
            </div>
          </div>

          <!-- Q61: Lean Fishing Period -->
          <div class="form-group full">
            <label class="form-label">Lean / No-Fishing Period</label>
            <div class="radio-group">
              <label class="radio-label">
                <input type="radio" value="No lean period" v-model="form.lean_fishing_period" />
                <span>No lean period</span>
              </label>
              <label class="radio-label">
                <input type="radio" value="Less than 2 months" v-model="form.lean_fishing_period" />
                <span>Less than 2 months</span>
              </label>
              <label class="radio-label">
                <input type="radio" value="2–4 months" v-model="form.lean_fishing_period" />
                <span>2–4 months</span>
              </label>
              <label class="radio-label">
                <input type="radio" value="More than 4 months" v-model="form.lean_fishing_period" />
                <span>More than 4 months</span>
              </label>
              <label class="radio-label">
                <input type="radio" value="Not applicable" v-model="form.lean_fishing_period" />
                <span>Not applicable</span>
              </label>
            </div>
          </div>

          <!-- Q62: Storage Facilities -->
          <div class="form-group full">
            <label class="form-label">Storage / Ice Facilities</label>
            <div class="checkbox-group">
              <label class="checkbox-label">
                <input type="checkbox" value="No storage facility" v-model="form.storage_facilities" />
                <span>No storage facility</span>
              </label>
              <label class="checkbox-label">
                <input type="checkbox" value="Basic storage (baskets / temporary containers)" v-model="form.storage_facilities" />
                <span>Basic storage (baskets / temporary containers)</span>
              </label>
              <label class="checkbox-label">
                <input type="checkbox" value="Ice box or insulated container" v-model="form.storage_facilities" />
                <span>Ice box or insulated container</span>
              </label>
              <label class="checkbox-label">
                <input type="checkbox" value="Access to community ice storage facility" v-model="form.storage_facilities" />
                <span>Access to community ice storage facility</span>
              </label>
              <label class="checkbox-label">
                <input type="checkbox" value="Cold storage or refrigeration unit" v-model="form.storage_facilities" />
                <span>Cold storage or refrigeration unit</span>
              </label>
            </div>
          </div>

          <!-- Q62.1: Storage Ownership (show only if storage facilities exist) -->
          <div class="form-group full" v-if="form.storage_facilities.length > 0 && !(form.storage_facilities.length === 1 && form.storage_facilities.includes('No storage facility'))">
            <label class="form-label">Storage Ownership</label>
            <div class="checkbox-group">
              <label class="checkbox-label">
                <input type="checkbox" value="Not applicable" v-model="form.storage_ownership" />
                <span>Not applicable</span>
              </label>
              <label class="checkbox-label">
                <input type="checkbox" value="Owned individually" v-model="form.storage_ownership" />
                <span>Owned individually</span>
              </label>
              <label class="checkbox-label">
                <input type="checkbox" value="Shared (group/cooperative)" v-model="form.storage_ownership" />
                <span>Shared (group/cooperative)</span>
              </label>
              <label class="checkbox-label">
                <input type="checkbox" value="Rented or paid access" v-model="form.storage_ownership" />
                <span>Rented or paid access</span>
              </label>
              <label class="checkbox-label">
                <input type="checkbox" value="Government or project-supported access" v-model="form.storage_ownership" />
                <span>Government or project-supported access</span>
              </label>
            </div>
          </div>
        </template>
      </div>
      </div><!-- End Step 8 -->

      <!-- ════════ STEP 9: VULNERABILITY & OBSERVATIONS ════════ -->
      <div v-show="currentStep === 9">
      <!-- ── PART 10: VULNERABILITY INDICATORS ── -->
      <div class="form-section">⚠️ Part 10: Vulnerability Indicators and Enumerator's Observation</div>
      <div class="form-grid form-grid-3">
        <div class="form-group">
          <label class="form-label">Female-Headed Household</label>
          <select v-model="form.female_headed_household" class="form-select">
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Migration Status</label>
          <select v-model="form.migration_status" class="form-select">
            <option value="Migrant">Migrant</option>
            <option value="Non-migrant">Non-migrant</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Seasonal Migration</label>
          <select v-model="form.seasonal_migration" class="form-select">
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </select>
        </div>
        <div class="form-group full">
          <label class="form-label">Observation Remarks</label>
          <textarea v-model="form.observation_remarks" class="form-input" rows="3" 
                    placeholder="Type any specific observations"></textarea>
        </div>
        <div class="form-group full">
          <label class="form-label">Any Other Comments from Respondent</label>
          <textarea v-model="form.respondent_comments" class="form-input" rows="3" 
                    placeholder="Type respondent comments"></textarea>
        </div>
      </div>
      </div><!-- End Step 9 -->

      <!-- Step Navigation -->
      <div class="step-navigation">
        <button 
          v-if="currentStep > 1" 
          @click="prevStep" 
          class="btn btn-outline"
        >
          ← Previous
        </button>
        <div class="step-indicator">
          Step {{ currentStep }} of {{ totalSteps }}
        </div>
        <button 
          @click="saveDraft" 
          class="btn btn-outline-secondary"
          :disabled="saving"
          title="Save your progress and continue later"
        >
          <span v-if="saving" class="spinner" style="width:14px;height:14px;border-width:2px"></span>
          <span v-else>💾 Save as Draft</span>
        </button>
        <button 
          v-if="currentStep < totalSteps" 
          @click="nextStep" 
          class="btn btn-primary"
        >
          Next →
        </button>
        <button 
          v-if="currentStep === totalSteps" 
          @click="submit" 
          class="btn btn-primary" 
          :disabled="saving"
        >
          <span v-if="saving" class="spinner" style="width:14px;height:14px;border-width:2px"></span>
          <span v-else>{{ isEdit ? '💾 Update Household' : '💾 Save Household' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import api from '../api'
import { useAuthStore } from '../stores/auth'
import { saveOfflineForm } from '../utils/offlineDB'
import { useOfflineSync } from '../composables/useOfflineSync'
import ConsentModal from '../components/ConsentModal.vue'

const route  = useRoute()
const router = useRouter()
const isEdit = computed(() => !!route.params.id)
const auth   = useAuthStore()

// GPS state
const gpsLoading = ref(false)
const gpsError   = ref('')

function fetchGPS() {
  if (!navigator.geolocation) {
    gpsError.value = 'Geolocation not supported by this browser'
    return
  }
  gpsLoading.value = true
  gpsError.value = ''
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      form.value.gps_latitude  = pos.coords.latitude.toFixed(6)
      form.value.gps_longitude = pos.coords.longitude.toFixed(6)
      gpsLoading.value = false
    },
    (err) => {
      const msgs = {
        1: 'Location permission denied. Enter coordinates manually.',
        2: 'Position unavailable. Enter coordinates manually.',
        3: 'Location request timed out. Enter coordinates manually.',
      }
      gpsError.value = msgs[err.code] || 'Could not get location.'
      gpsLoading.value = false
    },
    { enableHighAccuracy: true, timeout: 10000 }
  )
}

const loading        = ref(true)
const saving         = ref(false)
const saved          = ref(false)
const savedOffline   = ref(false)
const apiError       = ref('')
const { isOnline, refreshPendingCount } = useOfflineSync()

// DPDPA consent
const showConsentModal = ref(false)
const consentData      = ref(null)   // { language, method, version }

function onConsent(data) {
  consentData.value      = data
  showConsentModal.value = false
  // Store in form so it goes with POST payload
  form.value.consent_given    = true
  form.value.consent_language = data.language
  form.value.consent_method   = data.method
  form.value.consent_version  = data.version
}
const districtLoading= ref(false)
const blockLoading   = ref(false)
const villageLoading = ref(false)

const states    = ref([])
const districts = ref([])
const blocks    = ref([])
const villages  = ref([])

const sel = ref({ state_id: '', district_id: '', block_id: '' })

// Multi-step form state
const currentStep = ref(1)
const totalSteps = 9

// Reset everything when navigating to the new-entry route
watch(() => route.params.id, (newId) => {
  if (!newId) {
    form.value = getBlankForm()
    sel.value = { state_id: '', district_id: '', block_id: '' }
    currentStep.value = 1
    districts.value = []
    blocks.value = []
    villages.value = []
    apiError.value = ''
    saved.value = false
    gpsError.value = ''
    fetchGPS()
  }
})

const stepTitles = [
  'Survey Information',
  'Household Profile',
  'Household Members',
  'Housing & Living',
  'Water & Sanitation',
  'Health & Education',
  'Assets & Livelihood',
  'Fishing/Aquaculture',
  'Vulnerability & Observations'
]

// Member management state
const showMemberForm = ref(false)
const editingMemberIndex = ref(null)
const memberFormRef = ref(null)
const currentMember = ref({
  member_name: '', age: null, relationship_to_head: '',
  social_category: '', marital_status: '', education: '',
  occupation: '', monthly_income: null, mobile_number: '',
  // New v2 fields for members
  differently_abled: 'No', disability_categories: [], disability_category_other: '',
  shg_membership: 'No', shg_role: '', shg_loan: 'No',
  shg_loan_savings: null, shg_loan_bank: null, shg_loan_mfi: null, shg_loan_others: null,
  loan_reason: '',
  fpo_membership: 'No', fpo_role: '', fpo_investment: null,
  fpo_type: '', fpo_commodities: [], fpo_commodity_other: '', fpo_market_linkages: [],
  gp_elected_member: 'No', gp_membership_details: '',
  assets_ownership: 'No', asset_type: '', land_type_detail: '',
  govt_schemes_benefits: [], govt_schemes_benefit_other: '', scheme_benefit_details: '',
  mssrf_support_earlier: 'No', mssrf_support_details: '',
  other_ngo_support: 'No', ngo_support_details: ''
})

function getBlankForm() {
  return {
    household_id: '', village_id: '', serial_no: 1,
    // Part 1
    enumerator_name: auth.user?.name || '', survey_date: new Date().toISOString().split('T')[0],
    // Part 2
    consent_obtained: 'Yes',
    // Part 3
    gps_latitude: '', gps_longitude: '',
    state_name: '', district_name: '', block_name: '', village_name: '',
    // Part 4: Household Profile
    head_name: '', head_age: null, mobile: '',
    social_category: '', marital_status: '', education: '', occupation: '',
    occupation_other: '', monthly_income: '', monthly_income_exact: null,
    differently_abled: 'No', disability_categories: [], disability_category_other: '',
    // SHG / FPO / GP
    shg_membership: 'No', shg_role: '', shg_loan: 'No',
    shg_loan_savings: null, shg_loan_bank: null, shg_loan_mfi: null, shg_loan_others: null,
    loan_reason: '',
    fpo_membership: 'No', fpo_role: '', fpo_investment: null,
    fpo_type: '', fpo_commodities: [], fpo_commodity_other: '', fpo_market_linkages: [],
    gp_elected_member: 'No', gp_membership_details: '',
    assets_ownership: 'No', asset_type: '', land_type_detail: '',
    govt_schemes_benefits: [], govt_schemes_benefit_other: '', scheme_benefit_details: '',
    mssrf_support_earlier: 'No', mssrf_support_details: '',
    other_ngo_support: 'No', ngo_support_details: '',
    // Part 6: Housing
    type_of_house: '', ownership_status: '', number_of_rooms: null,
    type_of_roof: '', type_of_floor: '', access_to_electricity: 'No',
    source_of_lighting: '', cooking_fuel: '', separate_kitchen: 'No',
    // Part 7: Water & Sanitation
    primary_water_source: '', distance_to_water: '', water_availability: '',
    type_of_toilet_facility: '', type_of_toilet: '', handwashing_facility: 'No',
    use_of_soap: '', solid_waste_disposal: '',
    // Part 8: Health
    chronic_illness: 'No', chronic_illness_detail: '',
    nearest_health_facility: '', distance_to_health: '',
    health_insurance: 'No', health_insurance_scheme: '',
    pregnant_lactating: 'No', children_under_5: 0,
    immunization_status: '', anganwadi_access: 'No',
    // Part 8: Education
    children_attending_school: '', type_of_school: '',
    dropout_cases: 'No', dropout_reason: '',
    // Part 9: Assets
    household_assets: [], household_asset_other: '',
    land_ownership: 'No', land_size_total: null,
    irrigation_types: [], irrigation_other: '',
    residential_plot_size: null, land_size_other: null,
    livestock_ownership: 'No', livestock_types: [], livestock_other: '',
    // Part 10: Vulnerability
    female_headed_household: 'No', migration_status: '',
    seasonal_migration: 'No', observation_remarks: '', respondent_comments: '',
    // Part 11: Fishing/Aquaculture
    fishing_involved: 'No', fishing_types: [], boat_ownership: '',
    boat_type: '', gps_in_boat: 'No', fishing_methods: [],
    fishing_frequency: '', lean_fishing_period: '', storage_facilities: [], storage_ownership: [],
    // Members
    members: [],
    status: 'Active',
    saved_step: 1,
  }
}

const form = ref(getBlankForm())

// ── Watchers for cascading dropdowns ──────────────────────────
watch(() => sel.value.state_id, async (newStateId) => {
  sel.value.district_id = ''
  sel.value.block_id    = ''
  form.value.village_id = ''
  districts.value = []
  blocks.value    = []
  villages.value  = []

  if (!newStateId) return
  districtLoading.value = true
  try {
    const { data } = await api.get('/masters/districts', { params: { state_id: newStateId } })
    districts.value = data
  } catch (e) {
    console.error('Load districts error:', e.message)
  } finally {
    districtLoading.value = false
  }
})

watch(() => sel.value.district_id, async (newDistrictId) => {
  sel.value.block_id    = ''
  form.value.village_id = ''
  blocks.value   = []
  villages.value = []

  if (!newDistrictId) return
  blockLoading.value = true
  try {
    const { data } = await api.get('/masters/blocks', { params: { district_id: newDistrictId } })
    blocks.value = data
  } catch (e) {
    console.error('Load blocks error:', e.message)
  } finally {
    blockLoading.value = false
  }
})

watch(() => sel.value.block_id, async (newBlockId) => {
  form.value.village_id = ''
  villages.value = []

  if (!newBlockId) return
  villageLoading.value = true
  try {
    const { data } = await api.get('/masters/villages', { params: { block_id: newBlockId } })
    villages.value = data
  } catch (e) {
    console.error('Load villages error:', e.message)
  } finally {
    villageLoading.value = false
  }
})

watch(() => form.value.village_id, async (newVillageId) => {
  if (!newVillageId || isEdit.value) return
  try {
    const { data } = await api.get(`/households/next-id/${newVillageId}`)
    form.value.household_id = data.household_id
    form.value.serial_no    = data.serial_no
  } catch (e) {
    console.error('Next ID error:', e.message)
  }
})

// Watch fishing_types - clear boat fields if Marine is deselected
watch(() => form.value.fishing_types, (newTypes) => {
  if (!newTypes.includes('Marine')) {
    form.value.boat_ownership = ''
    form.value.boat_type = ''
    form.value.gps_in_boat = 'No'
  }
})

// Watch boat_ownership - clear boat type and GPS if not Own/Leased
watch(() => form.value.boat_ownership, (newValue) => {
  if (newValue !== 'Own Boat' && newValue !== 'Leased or Shared Boat') {
    form.value.boat_type = ''
    form.value.gps_in_boat = 'No'
  }
})

// Watch fishing_involved - clear all fishing fields if changed to No
watch(() => form.value.fishing_involved, (newValue) => {
  if (newValue === 'No') {
    form.value.fishing_types = []
    form.value.boat_ownership = ''
    form.value.boat_type = ''
    form.value.gps_in_boat = 'No'
    form.value.fishing_methods = []
    form.value.fishing_frequency = ''
    form.value.lean_fishing_period = ''
    form.value.storage_facilities = []
    form.value.storage_ownership = []
  }
})

// Watch storage_facilities - clear ownership if no valid storage
watch(() => form.value.storage_facilities, (newFacilities) => {
  if (newFacilities.length === 0 || 
      (newFacilities.length === 1 && newFacilities.includes('No storage facility'))) {
    form.value.storage_ownership = []
  }
})

// ── Multi-Step Navigation ─────────────────────────────────────
function goToStep(step) {
  if (step >= 1 && step <= totalSteps) {
    currentStep.value = step
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

function nextStep() {
  if (validateCurrentStep()) {
    if (currentStep.value < totalSteps) {
      currentStep.value++
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }
}

function prevStep() {
  if (currentStep.value > 1) {
    currentStep.value--
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

function validateCurrentStep() {
  apiError.value = ''
  
  // Step 1: Survey Information
  if (currentStep.value === 1) {
    if (!form.value.enumerator_name) {
      apiError.value = 'Enumerator name is required'
      return false
    }
    if (!form.value.survey_date) {
      apiError.value = 'Survey date is required'
      return false
    }
    if (!form.value.village_id) {
      apiError.value = 'Please select village'
      return false
    }
  }
  
  // Step 2: Household Profile
  if (currentStep.value === 2) {
    if (!form.value.head_name) {
      apiError.value = 'Head of household name is required'
      return false
    }
    if (!form.value.mobile) {
      apiError.value = 'Mobile number is required'
      return false
    }
    if (!form.value.social_category) {
      apiError.value = 'Social category is required'
      return false
    }
  }
  
  return true
}

// ── Member Management Functions ────────────────────────────────
function openMemberForm() {
  showMemberForm.value = true
  editingMemberIndex.value = null
  currentMember.value = {
    member_name: '', age: null, relationship_to_head: '',
    social_category: '', marital_status: '', education: '',
    occupation: '', monthly_income: null, mobile_number: '',
    differently_abled: 'No', disability_categories: [], disability_category_other: '',
    shg_membership: 'No', shg_role: '', shg_loan: 'No',
    shg_loan_savings: null, shg_loan_bank: null, shg_loan_mfi: null, shg_loan_others: null,
    loan_reason: '',
    fpo_membership: 'No', fpo_role: '', fpo_investment: null,
    fpo_type: '', fpo_commodities: [], fpo_commodity_other: '', fpo_market_linkages: [],
    gp_elected_member: 'No', gp_membership_details: '',
    assets_ownership: 'No', asset_type: '', land_type_detail: '',
    govt_schemes_benefits: [], govt_schemes_benefit_other: '', scheme_benefit_details: '',
    mssrf_support_earlier: 'No', mssrf_support_details: '',
    other_ngo_support: 'No', ngo_support_details: ''
  }
  // Scroll to form after it renders
  nextTick(() => {
    if (memberFormRef.value) {
      memberFormRef.value.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  })
}

function editMember(index) {
  showMemberForm.value = true
  editingMemberIndex.value = index
  currentMember.value = { ...form.value.members[index] }
  
  // Ensure all array fields are initialized (backward compatibility)
  if (!Array.isArray(currentMember.value.disability_categories)) {
    currentMember.value.disability_categories = []
  }
  if (!currentMember.value.disability_category_other) {
    currentMember.value.disability_category_other = ''
  }
  if (!Array.isArray(currentMember.value.fpo_commodities)) {
    currentMember.value.fpo_commodities = []
  }
  if (!currentMember.value.fpo_commodity_other) {
    currentMember.value.fpo_commodity_other = ''
  }
  if (!Array.isArray(currentMember.value.fpo_market_linkages)) {
    currentMember.value.fpo_market_linkages = []
  }
  if (!Array.isArray(currentMember.value.govt_schemes_benefits)) {
    currentMember.value.govt_schemes_benefits = []
  }
  if (!currentMember.value.govt_schemes_benefit_other) {
    currentMember.value.govt_schemes_benefit_other = ''
  }
  
  // Scroll to form after it renders
  nextTick(() => {
    if (memberFormRef.value) {
      memberFormRef.value.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  })
}

function removeMember(index) {
  if (confirm('Are you sure you want to remove this member?')) {
    form.value.members.splice(index, 1)
  }
}

function saveMember() {
  // Validate required fields
  if (!currentMember.value.member_name) {
    apiError.value = 'Member name is required'
    return
  }
  if (!currentMember.value.age) {
    apiError.value = 'Member age is required'
    return
  }
  if (!currentMember.value.relationship_to_head) {
    apiError.value = 'Relationship to head is required'
    return
  }

  apiError.value = ''

  if (editingMemberIndex.value !== null) {
    // Update existing member
    form.value.members[editingMemberIndex.value] = { ...currentMember.value }
  } else {
    // Add new member
    form.value.members.push({ ...currentMember.value })
  }

  cancelMemberForm()
}

function cancelMemberForm() {
  showMemberForm.value = false
  editingMemberIndex.value = null
  currentMember.value = {
    member_name: '', age: null, relationship_to_head: '',
    social_category: '', marital_status: '', education: '',
    occupation: '', monthly_income: null, mobile_number: '',
    differently_abled: 'No', disability_categories: [], disability_category_other: '',
    shg_membership: 'No', shg_role: '', shg_loan: 'No',
    shg_loan_savings: null, shg_loan_bank: null, shg_loan_mfi: null, shg_loan_others: null,
    loan_reason: '',
    fpo_membership: 'No', fpo_role: '', fpo_investment: null,
    fpo_type: '', fpo_commodities: [], fpo_commodity_other: '', fpo_market_linkages: [],
    gp_elected_member: 'No', gp_membership_details: '',
    assets_ownership: 'No', asset_type: '', land_type_detail: '',
    govt_schemes_benefits: [], govt_schemes_benefit_other: '', scheme_benefit_details: '',
    mssrf_support_earlier: 'No', mssrf_support_details: '',
    other_ngo_support: 'No', ngo_support_details: ''
  }
}

// ── Save as Draft ──────────────────────────────────────────────
async function saveDraft() {
  apiError.value = ''
  saved.value = false

  // Minimal validation for draft - only household ID fields
  if (!form.value.village_id) {
    apiError.value = 'Please select a village before saving as draft'
    return
  }

  // Set status and current step
  form.value.status = 'Draft'
  form.value.saved_step = currentStep.value

  // Convert disability_categories array to comma-separated string for database
  const draftData = { ...form.value }
  if (Array.isArray(draftData.disability_categories)) {
    let categories = draftData.disability_categories.filter(c => c !== 'Other').join(', ')
    if (draftData.disability_categories.includes('Other') && draftData.disability_category_other) {
      categories += (categories ? ', ' : '') + 'Other (' + draftData.disability_category_other + ')'
    }
    draftData.disability_category = categories
    delete draftData.disability_categories
    delete draftData.disability_category_other
  }

  // Convert FPO commodities array to comma-separated string
  if (Array.isArray(draftData.fpo_commodities)) {
    let commodities = draftData.fpo_commodities.filter(c => c !== 'Other').join(', ')
    if (draftData.fpo_commodities.includes('Other') && draftData.fpo_commodity_other) {
      commodities += (commodities ? ', ' : '') + 'Other (' + draftData.fpo_commodity_other + ')'
    }
    draftData.fpo_commodity = commodities
    delete draftData.fpo_commodities
    delete draftData.fpo_commodity_other
  }

  // Convert FPO market linkages array to comma-separated string
  if (Array.isArray(draftData.fpo_market_linkages)) {
    draftData.fpo_market_linkage = draftData.fpo_market_linkages.join(', ')
    delete draftData.fpo_market_linkages
  }

  // Convert govt schemes benefits array to comma-separated string
  if (Array.isArray(draftData.govt_schemes_benefits)) {
    let schemes = draftData.govt_schemes_benefits.filter(s => s !== 'Other').join(', ')
    if (draftData.govt_schemes_benefits.includes('Other') && draftData.govt_schemes_benefit_other) {
      schemes += (schemes ? ', ' : '') + 'Other (' + draftData.govt_schemes_benefit_other + ')'
    }
    draftData.govt_schemes_benefit = schemes
    delete draftData.govt_schemes_benefits
    delete draftData.govt_schemes_benefit_other
  }

  // Convert household assets array to comma-separated string
  if (Array.isArray(draftData.household_assets)) {
    let assets = draftData.household_assets.filter(a => a !== 'Other').join(', ')
    if (draftData.household_assets.includes('Other') && draftData.household_asset_other) {
      assets += (assets ? ', ' : '') + 'Other (' + draftData.household_asset_other + ')'
    }
    draftData.household_assets = assets
    delete draftData.household_asset_other
  }

  // Convert irrigation types array to comma-separated string
  if (Array.isArray(draftData.irrigation_types)) {
    let irrigation = draftData.irrigation_types.filter(i => i !== 'Other').join(', ')
    if (draftData.irrigation_types.includes('Other') && draftData.irrigation_other) {
      irrigation += (irrigation ? ', ' : '') + 'Other (' + draftData.irrigation_other + ')'
    }
    draftData.irrigation_type = irrigation
    delete draftData.irrigation_types
    delete draftData.irrigation_other
  }

  // Convert livestock types array to comma-separated string
  if (Array.isArray(draftData.livestock_types)) {
    let livestock = draftData.livestock_types.filter(l => l !== 'Other').join(', ')
    if (draftData.livestock_types.includes('Other') && draftData.livestock_other) {
      livestock += (livestock ? ', ' : '') + 'Other (' + draftData.livestock_other + ')'
    }
    draftData.livestock_types = livestock
    delete draftData.livestock_other
  }

  // Convert fishing types array to comma-separated string
  if (Array.isArray(draftData.fishing_types)) {
    draftData.fishing_type = draftData.fishing_types.join(', ')
    delete draftData.fishing_types
  }

  // Convert fishing methods array to comma-separated string
  if (Array.isArray(draftData.fishing_methods)) {
    draftData.fishing_method = draftData.fishing_methods.join(', ')
    delete draftData.fishing_methods
  }

  // Convert storage facilities array to comma-separated string
  if (Array.isArray(draftData.storage_facilities)) {
    draftData.storage_facilities = draftData.storage_facilities.join(', ')
  }

  // Convert storage ownership array to comma-separated string
  if (Array.isArray(draftData.storage_ownership)) {
    draftData.storage_ownership = draftData.storage_ownership.join(', ')
  }

  // Convert member disability categories similarly
  if (draftData.members && Array.isArray(draftData.members)) {
    draftData.members = draftData.members.map(member => {
      const m = { ...member }
      
      // Convert disability categories
      if (Array.isArray(m.disability_categories)) {
        let categories = m.disability_categories.filter(c => c !== 'Other').join(', ')
        if (m.disability_categories.includes('Other') && m.disability_category_other) {
          categories += (categories ? ', ' : '') + 'Other (' + m.disability_category_other + ')'
        }
        m.disability_category = categories
        delete m.disability_categories
        delete m.disability_category_other
      }
      
      // Convert FPO commodities
      if (Array.isArray(m.fpo_commodities)) {
        let commodities = m.fpo_commodities.filter(c => c !== 'Other').join(', ')
        if (m.fpo_commodities.includes('Other') && m.fpo_commodity_other) {
          commodities += (commodities ? ', ' : '') + 'Other (' + m.fpo_commodity_other + ')'
        }
        m.fpo_commodity = commodities
        delete m.fpo_commodities
        delete m.fpo_commodity_other
      }
      
      // Convert FPO market linkages
      if (Array.isArray(m.fpo_market_linkages)) {
        m.fpo_market_linkage = m.fpo_market_linkages.join(', ')
        delete m.fpo_market_linkages
      }
      
      // Convert govt schemes benefits
      if (Array.isArray(m.govt_schemes_benefits)) {
        let schemes = m.govt_schemes_benefits.filter(s => s !== 'Other').join(', ')
        if (m.govt_schemes_benefits.includes('Other') && m.govt_schemes_benefit_other) {
          schemes += (schemes ? ', ' : '') + 'Other (' + m.govt_schemes_benefit_other + ')'
        }
        m.govt_schemes_benefit = schemes
        delete m.govt_schemes_benefits
        delete m.govt_schemes_benefit_other
      }
      
      return m
    })
  }

  saving.value = true
  try {
    if (isEdit.value) {
      await api.put(`/households/${route.params.id}`, draftData)
      saved.value = true
      setTimeout(() => { saved.value = false }, 3000)
    } else {
      const { data } = await api.post('/households', draftData)
      saved.value = true
      setTimeout(() => { router.push(`/households/${data.household_id}/edit`) }, 1500)
    }
  } catch (err) {
    if (!isOnline.value || err.code === 'ERR_NETWORK') {
      // Save to IndexedDB for later sync
      await saveOfflineForm({ ...draftData, isEdit: isEdit.value, household_id: route.params.id || null })
      await refreshPendingCount()
      savedOffline.value = true
      setTimeout(() => { savedOffline.value = false }, 4000)
    } else {
      apiError.value = err.response?.data?.message || 'Failed to save draft'
    }
  } finally {
    saving.value = false
  }
}

// ── Submit ─────────────────────────────────────────────────────
async function submit() {
  apiError.value = ''
  saved.value    = false

  const required = [
    ['enumerator_name', 'Enumerator Name'],
    ['survey_date', 'Survey Date'],
    ['consent_obtained', 'Consent'],
    ['village_id', 'Village'],
    ['head_name', 'Head of Household Name'],
    ['head_age', 'Age'],
    ['mobile', 'Mobile Number'],
    ['social_category', 'Social Category'],
    ['marital_status', 'Marital Status'],
    ['education', 'Education'],
    ['occupation', 'Occupation'],
    ['monthly_income', 'Monthly Income'],
  ]
  
  for (const [field, label] of required) {
    if (!form.value[field]) {
      apiError.value = `${label} is required`
      return
    }
  }

  // Set status to Active when submitting
  form.value.status = 'Active'
  form.value.saved_step = totalSteps

  // Convert disability_categories array to comma-separated string for database
  const submitData = { ...form.value }
  if (Array.isArray(submitData.disability_categories)) {
    let categories = submitData.disability_categories.filter(c => c !== 'Other').join(', ')
    if (submitData.disability_categories.includes('Other') && submitData.disability_category_other) {
      categories += (categories ? ', ' : '') + 'Other (' + submitData.disability_category_other + ')'
    }
    submitData.disability_category = categories
    delete submitData.disability_categories
    delete submitData.disability_category_other
  }

  // Convert FPO commodities array to comma-separated string
  if (Array.isArray(submitData.fpo_commodities)) {
    let commodities = submitData.fpo_commodities.filter(c => c !== 'Other').join(', ')
    if (submitData.fpo_commodities.includes('Other') && submitData.fpo_commodity_other) {
      commodities += (commodities ? ', ' : '') + 'Other (' + submitData.fpo_commodity_other + ')'
    }
    submitData.fpo_commodity = commodities
    delete submitData.fpo_commodities
    delete submitData.fpo_commodity_other
  }

  // Convert FPO market linkages array to comma-separated string
  if (Array.isArray(submitData.fpo_market_linkages)) {
    submitData.fpo_market_linkage = submitData.fpo_market_linkages.join(', ')
    delete submitData.fpo_market_linkages
  }

  // Convert govt schemes benefits array to comma-separated string
  if (Array.isArray(submitData.govt_schemes_benefits)) {
    let schemes = submitData.govt_schemes_benefits.filter(s => s !== 'Other').join(', ')
    if (submitData.govt_schemes_benefits.includes('Other') && submitData.govt_schemes_benefit_other) {
      schemes += (schemes ? ', ' : '') + 'Other (' + submitData.govt_schemes_benefit_other + ')'
    }
    submitData.govt_schemes_benefit = schemes
    delete submitData.govt_schemes_benefits
    delete submitData.govt_schemes_benefit_other
  }

  // Convert household assets array to comma-separated string
  if (Array.isArray(submitData.household_assets)) {
    let assets = submitData.household_assets.filter(a => a !== 'Other').join(', ')
    if (submitData.household_assets.includes('Other') && submitData.household_asset_other) {
      assets += (assets ? ', ' : '') + 'Other (' + submitData.household_asset_other + ')'
    }
    submitData.household_assets = assets
    delete submitData.household_asset_other
  }

  // Convert irrigation types array to comma-separated string
  if (Array.isArray(submitData.irrigation_types)) {
    let irrigation = submitData.irrigation_types.filter(i => i !== 'Other').join(', ')
    if (submitData.irrigation_types.includes('Other') && submitData.irrigation_other) {
      irrigation += (irrigation ? ', ' : '') + 'Other (' + submitData.irrigation_other + ')'
    }
    submitData.irrigation_type = irrigation
    delete submitData.irrigation_types
    delete submitData.irrigation_other
  }

  // Convert livestock types array to comma-separated string
  if (Array.isArray(submitData.livestock_types)) {
    let livestock = submitData.livestock_types.filter(l => l !== 'Other').join(', ')
    if (submitData.livestock_types.includes('Other') && submitData.livestock_other) {
      livestock += (livestock ? ', ' : '') + 'Other (' + submitData.livestock_other + ')'
    }
    submitData.livestock_types = livestock
    delete submitData.livestock_other
  }

  // Convert fishing types array to comma-separated string
  if (Array.isArray(submitData.fishing_types)) {
    submitData.fishing_type = submitData.fishing_types.join(', ')
    delete submitData.fishing_types
  }

  // Convert fishing methods array to comma-separated string
  if (Array.isArray(submitData.fishing_methods)) {
    submitData.fishing_method = submitData.fishing_methods.join(', ')
    delete submitData.fishing_methods
  }

  // Convert storage facilities array to comma-separated string
  if (Array.isArray(submitData.storage_facilities)) {
    submitData.storage_facilities = submitData.storage_facilities.join(', ')
  }

  // Convert storage ownership array to comma-separated string
  if (Array.isArray(submitData.storage_ownership)) {
    submitData.storage_ownership = submitData.storage_ownership.join(', ')
  }

  // Convert member disability categories similarly
  if (submitData.members && Array.isArray(submitData.members)) {
    submitData.members = submitData.members.map(member => {
      const m = { ...member }
      
      // Convert disability categories
      if (Array.isArray(m.disability_categories)) {
        let categories = m.disability_categories.filter(c => c !== 'Other').join(', ')
        if (m.disability_categories.includes('Other') && m.disability_category_other) {
          categories += (categories ? ', ' : '') + 'Other (' + m.disability_category_other + ')'
        }
        m.disability_category = categories
        delete m.disability_categories
        delete m.disability_category_other
      }
      
      // Convert FPO commodities
      if (Array.isArray(m.fpo_commodities)) {
        let commodities = m.fpo_commodities.filter(c => c !== 'Other').join(', ')
        if (m.fpo_commodities.includes('Other') && m.fpo_commodity_other) {
          commodities += (commodities ? ', ' : '') + 'Other (' + m.fpo_commodity_other + ')'
        }
        m.fpo_commodity = commodities
        delete m.fpo_commodities
        delete m.fpo_commodity_other
      }
      
      // Convert FPO market linkages
      if (Array.isArray(m.fpo_market_linkages)) {
        m.fpo_market_linkage = m.fpo_market_linkages.join(', ')
        delete m.fpo_market_linkages
      }
      
      // Convert govt schemes benefits
      if (Array.isArray(m.govt_schemes_benefits)) {
        let schemes = m.govt_schemes_benefits.filter(s => s !== 'Other').join(', ')
        if (m.govt_schemes_benefits.includes('Other') && m.govt_schemes_benefit_other) {
          schemes += (schemes ? ', ' : '') + 'Other (' + m.govt_schemes_benefit_other + ')'
        }
        m.govt_schemes_benefit = schemes
        delete m.govt_schemes_benefits
        delete m.govt_schemes_benefit_other
      }
      
      return m
    })
  }

  saving.value = true
  try {
    if (isEdit.value) {
      await api.put(`/households/${route.params.id}`, submitData)
    } else {
      await api.post('/households', submitData)
    }
    saved.value = true
    setTimeout(() => router.push('/households'), 1200)
  } catch (e) {
    if (!isOnline.value || e.code === 'ERR_NETWORK') {
      await saveOfflineForm({ ...submitData, isEdit: isEdit.value, household_id: route.params.id || null })
      await refreshPendingCount()
      savedOffline.value = true
      setTimeout(() => { savedOffline.value = false }, 4000)
    } else {
      apiError.value = e.response?.data?.message || 'Save failed. Please try again.'
    }
  } finally {
    saving.value = false
  }
}

// ── Mount ─────────────────────────────────────────────────────
onMounted(async () => {
  try {
    const { data: st } = await api.get('/masters/states')
    states.value = st
  } catch (e) {
    console.error('Load states error:', e.message)
    apiError.value = 'Could not load states. Please check your connection and refresh the page.'
  }

  if (isEdit.value) {
    try {
      const { data } = await api.get(`/households/${route.params.id}`)
      Object.assign(form.value, data)

      // Parse disability_category string back to array
      if (data.disability_category) {
        const categories = []
        let other = ''
        const parts = data.disability_category.split(',').map(p => p.trim())
        parts.forEach(part => {
          if (part.startsWith('Other (') && part.endsWith(')')) {
            categories.push('Other')
            other = part.substring(7, part.length - 1)
          } else if (part && part !== 'Other') {
            categories.push(part)
          } else if (part === 'Other') {
            categories.push('Other')
          }
        })
        form.value.disability_categories = categories
        form.value.disability_category_other = other
      }

      // Parse FPO commodity string back to array
      if (data.fpo_commodity) {
        const commodities = []
        let other = ''
        const parts = data.fpo_commodity.split(',').map(p => p.trim())
        parts.forEach(part => {
          if (part.startsWith('Other (') && part.endsWith(')')) {
            commodities.push('Other')
            other = part.substring(7, part.length - 1)
          } else if (part && part !== 'Other') {
            commodities.push(part)
          } else if (part === 'Other') {
            commodities.push('Other')
          }
        })
        form.value.fpo_commodities = commodities
        form.value.fpo_commodity_other = other
      } else {
        form.value.fpo_commodities = []
        form.value.fpo_commodity_other = ''
      }

      // Parse FPO market linkage string back to array
      if (data.fpo_market_linkage) {
        form.value.fpo_market_linkages = data.fpo_market_linkage.split(',').map(p => p.trim()).filter(p => p)
      } else {
        form.value.fpo_market_linkages = []
      }

      // Parse govt schemes benefit string back to array
      if (data.govt_schemes_benefit) {
        const schemes = []
        let other = ''
        const parts = data.govt_schemes_benefit.split(',').map(p => p.trim())
        parts.forEach(part => {
          if (part.startsWith('Other (') && part.endsWith(')')) {
            schemes.push('Other')
            other = part.substring(7, part.length - 1)
          } else if (part && part !== 'Other') {
            schemes.push(part)
          } else if (part === 'Other') {
            schemes.push('Other')
          }
        })
        form.value.govt_schemes_benefits = schemes
        form.value.govt_schemes_benefit_other = other
      } else {
        form.value.govt_schemes_benefits = []
        form.value.govt_schemes_benefit_other = ''
      }

      // Parse household_assets string back to array
      if (data.household_assets) {
        const assets = []
        let other = ''
        const parts = data.household_assets.split(',').map(p => p.trim())
        parts.forEach(part => {
          if (part.startsWith('Other (') && part.endsWith(')')) {
            assets.push('Other')
            other = part.substring(7, part.length - 1)
          } else if (part && part !== 'Other') {
            assets.push(part)
          } else if (part === 'Other') {
            assets.push('Other')
          }
        })
        form.value.household_assets = assets
        form.value.household_asset_other = other
      } else {
        form.value.household_assets = []
        form.value.household_asset_other = ''
      }

      // Parse irrigation_type string back to array
      if (data.irrigation_type) {
        const types = []
        let other = ''
        const parts = data.irrigation_type.split(',').map(p => p.trim())
        parts.forEach(part => {
          if (part.startsWith('Other (') && part.endsWith(')')) {
            types.push('Other')
            other = part.substring(7, part.length - 1)
          } else if (part && part !== 'Other') {
            types.push(part)
          } else if (part === 'Other') {
            types.push('Other')
          }
        })
        form.value.irrigation_types = types
        form.value.irrigation_other = other
      } else {
        form.value.irrigation_types = []
        form.value.irrigation_other = ''
      }

      // Parse livestock_types string back to array
      if (data.livestock_types) {
        const livestock = []
        let other = ''
        const parts = data.livestock_types.split(',').map(p => p.trim())
        parts.forEach(part => {
          if (part.startsWith('Other (') && part.endsWith(')')) {
            livestock.push('Other')
            other = part.substring(7, part.length - 1)
          } else if (part && part !== 'Other') {
            livestock.push(part)
          } else if (part === 'Other') {
            livestock.push('Other')
          }
        })
        form.value.livestock_types = livestock
        form.value.livestock_other = other
      } else {
        form.value.livestock_types = []
        form.value.livestock_other = ''
      }

      // Parse fishing_type string back to array
      if (data.fishing_type) {
        form.value.fishing_types = data.fishing_type.split(',').map(p => p.trim()).filter(p => p)
      } else {
        form.value.fishing_types = []
      }

      // Parse fishing_method string back to array
      if (data.fishing_method) {
        form.value.fishing_methods = data.fishing_method.split(',').map(p => p.trim()).filter(p => p)
      } else {
        form.value.fishing_methods = []
      }

      // Parse storage_facilities string back to array
      if (data.storage_facilities) {
        form.value.storage_facilities = data.storage_facilities.split(',').map(p => p.trim()).filter(p => p)
      } else {
        form.value.storage_facilities = []
      }

      // Parse storage_ownership string back to array
      if (data.storage_ownership) {
        form.value.storage_ownership = data.storage_ownership.split(',').map(p => p.trim()).filter(p => p)
      } else {
        form.value.storage_ownership = []
      }

      // Parse member disability categories similarly
      if (data.members && Array.isArray(data.members)) {
        form.value.members = data.members.map(member => {
          const m = { ...member }
          
          // Parse disability categories
          if (member.disability_category) {
            const categories = []
            let other = ''
            const parts = member.disability_category.split(',').map(p => p.trim())
            parts.forEach(part => {
              if (part.startsWith('Other (') && part.endsWith(')')) {
                categories.push('Other')
                other = part.substring(7, part.length - 1)
              } else if (part && part !== 'Other') {
                categories.push(part)
              } else if (part === 'Other') {
                categories.push('Other')
              }
            })
            m.disability_categories = categories
            m.disability_category_other = other
          } else {
            m.disability_categories = []
            m.disability_category_other = ''
          }
          
          // Parse FPO commodity
          if (member.fpo_commodity) {
            const commodities = []
            let other = ''
            const parts = member.fpo_commodity.split(',').map(p => p.trim())
            parts.forEach(part => {
              if (part.startsWith('Other (') && part.endsWith(')')) {
                commodities.push('Other')
                other = part.substring(7, part.length - 1)
              } else if (part && part !== 'Other') {
                commodities.push(part)
              } else if (part === 'Other') {
                commodities.push('Other')
              }
            })
            m.fpo_commodities = commodities
            m.fpo_commodity_other = other
          } else {
            m.fpo_commodities = []
            m.fpo_commodity_other = ''
          }
          
          // Parse FPO market linkage
          if (member.fpo_market_linkage) {
            m.fpo_market_linkages = member.fpo_market_linkage.split(',').map(p => p.trim()).filter(p => p)
          } else {
            m.fpo_market_linkages = []
          }
          
          // Parse govt schemes benefit
          if (member.govt_schemes_benefit) {
            const schemes = []
            let other = ''
            const parts = member.govt_schemes_benefit.split(',').map(p => p.trim())
            parts.forEach(part => {
              if (part.startsWith('Other (') && part.endsWith(')')) {
                schemes.push('Other')
                other = part.substring(7, part.length - 1)
              } else if (part && part !== 'Other') {
                schemes.push(part)
              } else if (part === 'Other') {
                schemes.push('Other')
              }
            })
            m.govt_schemes_benefits = schemes
            m.govt_schemes_benefit_other = other
          } else {
            m.govt_schemes_benefits = []
            m.govt_schemes_benefit_other = ''
          }
          
          return m
        })
      }

      // Restore the saved step if it's a draft
      if (data.status === 'Draft' && data.saved_step) {
        currentStep.value = data.saved_step
      }

      // Hydrate cascading selects
      const { data: allVillages } = await api.get('/masters/villages')
      const matchedVillage = allVillages.find(v => v.village_id === data.village_id)

      if (matchedVillage) {
        sel.value.state_id = matchedVillage.state_id
        await new Promise(resolve => setTimeout(resolve, 300))
        sel.value.district_id = matchedVillage.district_id
        await new Promise(resolve => setTimeout(resolve, 300))
        sel.value.block_id = matchedVillage.block_id
        await new Promise(resolve => setTimeout(resolve, 300))
        form.value.village_id = matchedVillage.village_id
      }
    } catch (e) {
      console.error('Load household error:', e.message)
      apiError.value = 'Failed to load household data: ' + e.message
    }
  }

  // Auto-fetch GPS for new entries
  if (!isEdit.value) {
    fetchGPS()
  }

  loading.value = false

  // DPDPA: show consent modal for new household entries (not edits, not MIS Head view-only)
  if (!isEdit.value && !auth.isMISHead) {
    showConsentModal.value = true
  }
})
</script>

<style scoped>
/* Workflow status banners */
.wf-status-banner { display:flex;align-items:flex-start;gap:10px;padding:12px 16px;border-radius:8px;margin-bottom:12px;border:1.5px solid;font-size:13px; }
.wf-icon { font-size:18px;flex:0 0 auto; }
.wf-draft        { background:#f5f5f5;  border-color:#bdbdbd;  color:#616161; }
.wf-submitted    { background:#e3f2fd;  border-color:#90caf9;  color:#0277bd; }
.wf-under_review { background:#fff8e1;  border-color:#ffe082;  color:#e65100; }
.wf-approved     { background:#e8f5e9;  border-color:#a5d6a7;  color:#1b5e20; }
.wf-returned     { background:#fff3e0;  border-color:#ffcc80;  color:#e65100; }

/* GPS bar */
.gps-bar { display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 14px;background:var(--grey-50,#f9fafb);border:1px solid var(--grey-200,#e5e7eb);border-radius:8px; }
.gps-status-wrap { flex:1; }
.gps-status { display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:500; }
.gps-status.ok { color:#2e7d32; }
.gps-status.error { color:#c62828; }
.gps-status.fetching { color:#0277bd; }
.gps-status.idle { color:var(--grey-500,#6b7280); }
.gps-spinner { display:inline-block;width:11px;height:11px;border:2px solid #bde0ff;border-top-color:#0277bd;border-radius:50%;animation:spin .7s linear infinite; }
@keyframes spin { to { transform:rotate(360deg); } }
.gps-btn { display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:600;padding:6px 14px;height:32px;background:#fff;border:1px solid var(--primary,#2e7d32);color:var(--primary,#2e7d32);border-radius:6px;cursor:pointer;white-space:nowrap;transition:all .15s; }
.gps-btn:hover:not(:disabled) { background:var(--primary,#2e7d32);color:#fff; }
.gps-btn:disabled { opacity:.6;cursor:not-allowed; }

.id-preview { display:flex;align-items:center;gap:12px;padding:11px 14px;background:var(--green-pale);border-radius:6px;margin-bottom:14px;font-size:12px;font-weight:700;color:var(--grey-700); }
.form-grid-3 { grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); }
.full { grid-column: 1 / -1; }
textarea.form-input { resize: vertical; font-family: inherit; }

/* Checkbox Group Styles */
.checkbox-group {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 10px;
  padding: 12px;
  background: var(--grey-50);
  border-radius: 6px;
  border: 1px solid var(--grey-200);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 13px;
  font-weight: 500;
  color: var(--grey-700);
  border: 1px solid transparent;
}

.checkbox-label:hover {
  background: var(--green-pale);
  border-color: var(--green);
}

.checkbox-label input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: var(--green);
}

.checkbox-label input[type="checkbox"]:checked + span {
  color: var(--green-dark);
  font-weight: 600;
}

/* Radio Group Styles */
.radio-group {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding: 12px;
  background: var(--grey-50);
  border-radius: 6px;
  border: 1px solid var(--grey-200);
}

.radio-label {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 13px;
  font-weight: 500;
  color: var(--grey-700);
  border: 1px solid transparent;
  white-space: nowrap;
}

.radio-label:hover {
  background: var(--green-pale);
  border-color: var(--green);
}

.radio-label input[type="radio"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: var(--green);
}

.radio-label input[type="radio"]:checked + span {
  color: var(--green-dark);
  font-weight: 600;
}

/* Multi-Step Stepper Styles */
.stepper-container {
  margin-bottom: 30px;
  padding: 20px;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  border-radius: 8px;
}

.stepper {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  position: relative;
  max-width: 100%;
  overflow-x: auto;
}

.stepper-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  position: relative;
  cursor: pointer;
  transition: all 0.3s ease;
}

.stepper-item:not(:last-child)::after {
  content: '';
  position: absolute;
  top: 20px;
  left: 60%;
  width: calc(100% - 40px);
  height: 2px;
  background: var(--grey-300);
  z-index: 0;
}

.stepper-item.completed:not(:last-child)::after {
  background: var(--primary);
}

.stepper-circle {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: white;
  border: 2px solid var(--grey-300);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 16px;
  color: var(--grey-500);
  z-index: 1;
  transition: all 0.3s ease;
  margin-bottom: 8px;
}

.stepper-item.active .stepper-circle {
  background: var(--primary);
  border-color: var(--primary);
  color: white;
  transform: scale(1.15);
  box-shadow: 0 4px 12px rgba(0, 122, 255, 0.3);
}

.stepper-item.completed .stepper-circle {
  background: var(--success);
  border-color: var(--success);
  color: white;
}

.stepper-label {
  font-size: 11px;
  text-align: center;
  color: var(--grey-600);
  font-weight: 500;
  max-width: 100px;
  line-height: 1.3;
}

.stepper-item.active .stepper-label {
  color: var(--primary);
  font-weight: 700;
}

.stepper-item.completed .stepper-label {
  color: var(--success);
}

/* Step Navigation */
.step-navigation {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 30px;
  padding-top: 20px;
  border-top: 2px solid var(--grey-200);
  gap: 15px;
}

.step-indicator {
  flex: 1;
  text-align: center;
  font-weight: 600;
  font-size: 14px;
  color: var(--grey-600);
  padding: 8px 16px;
  background: var(--grey-100);
  border-radius: 20px;
}

/* Member Table Styles */
.members-table-wrapper {
  overflow-x: auto;
  margin-bottom: 16px;
  -webkit-overflow-scrolling: touch;
  border-radius: 6px;
}

.members-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  background: white;
  border: 1px solid var(--grey-200);
  border-radius: 6px;
  overflow: hidden;
}

.members-table th {
  background: var(--grey-100);
  padding: 10px 8px;
  text-align: left;
  font-weight: 600;
  border-bottom: 2px solid var(--grey-300);
  white-space: nowrap;
}

.members-table td {
  padding: 10px 8px;
  border-bottom: 1px solid var(--grey-200);
}

.members-table tbody tr:hover {
  background: var(--grey-50);
}

.members-table tbody tr:last-child td {
  border-bottom: none;
}

.members-details-table {
  margin-top: 20px;
  background: var(--grey-50);
}

.members-details-table th {
  background: var(--green-pale);
  font-size: 11px;
  line-height: 1.3;
  vertical-align: middle;
  text-align: center;
}

.members-details-table td {
  font-size: 12px;
  vertical-align: top;
  line-height: 1.4;
}

.members-details-table td div {
  margin: 2px 0;
}

.members-details-table td div:first-child {
  margin-top: 0;
}

.members-details-table td div:last-child {
  margin-bottom: 0;
}

.members-details-table td span {
  display: block;
}

.btn-icon {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  padding: 4px 6px;
  margin: 0 2px;
  transition: transform 0.2s;
}

.btn-icon:hover {
  transform: scale(1.2);
}

.member-form {
  background: var(--grey-50);
  padding: 16px;
  border-radius: 6px;
  margin-bottom: 20px;
  border: 2px solid var(--primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* ═══════════════════════════════════════════════════════════════════════════════
   RESPONSIVE DESIGN - Mobile First Approach
   ═══════════════════════════════════════════════════════════════════════════════ */

/* Base Mobile Styles (< 640px) */
@media (max-width: 639px) {
  /* Page Header */
  .page-header {
    flex-direction: column;
    align-items: flex-start !important;
    gap: 12px;
  }

  .page-title {
    font-size: 20px !important;
  }

  .page-sub {
    font-size: 13px !important;
  }

  /* Breadcrumb */
  .breadcrumb {
    font-size: 11px;
    padding: 8px 12px !important;
    overflow-x: auto;
    white-space: nowrap;
  }

  /* Card Padding */
  .card {
    padding: 12px !important;
    margin: 12px 0 !important;
  }

  /* Stepper - Horizontal Scroll on Mobile */
  .stepper-container {
    padding: 12px 8px;
    margin-bottom: 20px;
    overflow-x: auto;
  }

  .stepper {
    min-width: 800px; /* Force horizontal scroll for all steps */
    gap: 8px;
  }

  .stepper-item {
    min-width: 90px;
  }

  .stepper-circle {
    width: 32px;
    height: 32px;
    font-size: 14px;
  }

  .stepper-label {
    font-size: 9px;
    max-width: 80px;
  }

  .stepper-item:not(:last-child)::after {
    top: 16px;
  }

  /* ID Preview */
  .id-preview {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
    padding: 10px 12px;
    font-size: 11px;
  }

  /* Form Sections */
  .form-section {
    font-size: 14px !important;
    padding: 10px 12px !important;
    margin-bottom: 12px !important;
  }

  /* Form Grid - Single Column on Mobile */
  .form-grid,
  .form-grid-3 {
    grid-template-columns: 1fr !important;
    gap: 12px !important;
  }

  /* Form Labels and Inputs */
  .form-label {
    font-size: 13px !important;
  }

  .form-input,
  .form-select,
  textarea.form-input {
    font-size: 14px !important;
    padding: 10px 12px !important;
  }

  /* Buttons */
  .btn {
    padding: 10px 16px !important;
    font-size: 13px !important;
    width: 100%;
    justify-content: center;
  }

  .btn-sm {
    padding: 8px 12px !important;
    font-size: 12px !important;
  }

  /* Step Navigation */
  .step-navigation {
    flex-direction: column;
    gap: 10px;
  }

  .step-navigation .btn {
    width: 100%;
  }

  .step-indicator {
    width: 100%;
    font-size: 12px;
    padding: 6px 12px;
  }

  /* Members Table - Card View on Mobile */
  .members-table-wrapper {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .members-table {
    font-size: 11px;
    min-width: 700px; /* Force horizontal scroll */
  }

  .members-table th,
  .members-table td {
    padding: 8px 6px;
  }

  /* Member Form */
  .member-form {
    padding: 12px;
  }

  /* Alerts */
  .alert {
    font-size: 13px !important;
    padding: 10px 12px !important;
  }

  /* Add Member Button */
  .btn-add-member {
    width: 100%;
    margin-bottom: 15px;
  }
}

/* Tablet Styles (640px - 1023px) */
@media (min-width: 640px) and (max-width: 1023px) {
  /* Page Header */
  .page-header {
    gap: 15px;
  }

  .page-title {
    font-size: 22px !important;
  }

  /* Card Padding */
  .card {
    padding: 20px !important;
  }

  /* Stepper - Compact on Tablet */
  .stepper-container {
    padding: 16px 12px;
  }

  .stepper {
    gap: 10px;
  }

  .stepper-item {
    min-width: 100px;
  }

  .stepper-circle {
    width: 36px;
    height: 36px;
    font-size: 15px;
  }

  .stepper-label {
    font-size: 10px;
    max-width: 90px;
  }

  .stepper-item:not(:last-child)::after {
    top: 18px;
  }

  /* Form Grid - 2 Columns on Tablet */
  .form-grid,
  .form-grid-3 {
    grid-template-columns: repeat(2, 1fr) !important;
    gap: 16px !important;
  }

  /* Full width items still span all columns */
  .full {
    grid-column: 1 / -1 !important;
  }

  /* Form Labels and Inputs */
  .form-label {
    font-size: 13px !important;
  }

  .form-input,
  .form-select,
  textarea.form-input {
    font-size: 14px !important;
  }

  /* Step Navigation */
  .step-navigation {
    gap: 12px;
  }

  .step-indicator {
    font-size: 13px;
  }

  /* Members Table */
  .members-table {
    font-size: 12px;
  }

  .members-table th,
  .members-table td {
    padding: 9px 7px;
  }
}

/* Desktop Styles (1024px and above) */
@media (min-width: 1024px) {
  /* Stepper - Full Display */
  .stepper-container {
    padding: 20px;
  }

  .stepper {
    gap: 15px;
  }

  .stepper-label {
    font-size: 11px;
    max-width: 100px;
  }

  /* Form Grid - 3 Columns on Desktop */
  .form-grid {
    grid-template-columns: repeat(2, 1fr) !important;
    gap: 18px !important;
  }

  .form-grid-3 {
    grid-template-columns: repeat(3, 1fr) !important;
    gap: 18px !important;
  }

  /* Hover Effects for Desktop */
  .stepper-item:hover .stepper-circle {
    transform: scale(1.05);
  }

  .btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
}

/* Large Desktop (1440px and above) */
@media (min-width: 1440px) {
  .card {
    max-width: 1400px;
    margin-left: auto;
    margin-right: auto;
  }

  .stepper-label {
    font-size: 12px;
    max-width: 120px;
  }
}

/* Extra Small Mobile (< 375px) */
@media (max-width: 374px) {
  .page-title {
    font-size: 18px !important;
  }

  .page-sub {
    font-size: 12px !important;
  }

  .stepper-circle {
    width: 28px;
    height: 28px;
    font-size: 12px;
  }

  .stepper-label {
    font-size: 8px;
    max-width: 70px;
  }

  .form-section {
    font-size: 13px !important;
    padding: 8px 10px !important;
  }

  .form-label {
    font-size: 12px !important;
  }

  .btn {
    font-size: 12px !important;
    padding: 8px 12px !important;
  }
}

/* Landscape Mobile Optimization */
@media (max-width: 900px) and (orientation: landscape) {
  .stepper-container {
    padding: 10px 8px;
  }

  .stepper-circle {
    width: 30px;
    height: 30px;
    font-size: 13px;
  }

  .stepper-label {
    font-size: 9px;
  }

  .card {
    padding: 15px !important;
  }
}

/* Print Styles */
@media print {
  .breadcrumb,
  .page-header .btn,
  .stepper-container,
  .step-navigation,
  .btn-add-member,
  .btn-icon {
    display: none !important;
  }

  .card {
    box-shadow: none !important;
    border: 1px solid #ccc;
  }

  .form-grid,
  .form-grid-3 {
    grid-template-columns: repeat(2, 1fr) !important;
  }

  .members-table {
    font-size: 10px;
  }
}

/* Utility: Hide scrollbar but keep functionality */
.stepper-container::-webkit-scrollbar {
  height: 4px;
}

.stepper-container::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 2px;
}

.stepper-container::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 2px;
}

.stepper-container::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.3);
}

/* Touch-friendly tap targets for mobile */
@media (max-width: 1023px) {
  .stepper-item,
  .btn,
  .btn-icon,
  select,
  input[type="radio"],
  input[type="checkbox"] {
    min-height: 44px; /* iOS recommendation */
  }

  .form-input,
  .form-select {
    min-height: 44px;
  }
}
</style>
