-- ══════════════════════════════════════════════════════════════════════════════
-- Household Questionnaire V2 Updates
-- Date: 2026-04-30
-- Purpose: Add new fields from MIS Requirement questionnaire v2 comments.docx
-- ══════════════════════════════════════════════════════════════════════════════

USE mis_hits;

-- ─────────────────────────────────────────────────────────────────────────────
-- Part 4: Household Profile - New Fields
-- ─────────────────────────────────────────────────────────────────────────────

-- Q18: Differently abled (disability_category already exists from previous migration)

-- Q19: SHG Membership
ALTER TABLE household_master 
ADD COLUMN shg_membership ENUM('Yes','No') AFTER disability_category,
ADD COLUMN shg_role VARCHAR(50) AFTER shg_membership,
ADD COLUMN shg_loan_savings DECIMAL(12,2) AFTER shg_role,
ADD COLUMN shg_loan_bank DECIMAL(12,2) AFTER shg_loan_savings,
ADD COLUMN shg_loan_mfi DECIMAL(12,2) AFTER shg_loan_bank,
ADD COLUMN shg_loan_others DECIMAL(12,2) AFTER shg_loan_mfi,
ADD COLUMN loan_reason VARCHAR(200) AFTER shg_loan_others;

-- Q20: FPO Membership
ALTER TABLE household_master 
ADD COLUMN fpo_membership ENUM('Yes','No') AFTER loan_reason,
ADD COLUMN fpo_role VARCHAR(50) AFTER fpo_membership,
ADD COLUMN fpo_investment DECIMAL(12,2) AFTER fpo_role,
ADD COLUMN fpo_type VARCHAR(100) AFTER fpo_investment,
ADD COLUMN fpo_commodity TEXT AFTER fpo_type,
ADD COLUMN fpo_market_linkage TEXT AFTER fpo_commodity;

-- Q21: Gram Panchayat Elected Member
ALTER TABLE household_master 
ADD COLUMN gp_elected_member ENUM('Yes','No') AFTER fpo_market_linkage,
ADD COLUMN gp_membership_details VARCHAR(200) AFTER gp_elected_member;

-- Q22: Assets (Land/House)
ALTER TABLE household_master 
ADD COLUMN assets_ownership ENUM('Yes','No') AFTER gp_membership_details,
ADD COLUMN asset_type VARCHAR(50) AFTER assets_ownership,
ADD COLUMN land_type_detail VARCHAR(100) AFTER asset_type;

-- Q23: Government Schemes Benefit
ALTER TABLE household_master 
ADD COLUMN govt_schemes_benefit TEXT AFTER land_type_detail,
ADD COLUMN scheme_benefit_details VARCHAR(500) AFTER govt_schemes_benefit;

-- Q24: MSSRF Support Earlier
ALTER TABLE household_master 
ADD COLUMN mssrf_support_earlier ENUM('Yes','No') AFTER scheme_benefit_details,
ADD COLUMN mssrf_support_details VARCHAR(500) AFTER mssrf_support_earlier;

-- Q25: Other NGO Support
ALTER TABLE household_master 
ADD COLUMN other_ngo_support ENUM('Yes','No') AFTER mssrf_support_details,
ADD COLUMN ngo_support_details VARCHAR(500) AFTER other_ngo_support;

-- ─────────────────────────────────────────────────────────────────────────────
-- Part 10: Fishing/Aquaculture Details (NEW Section)
-- ─────────────────────────────────────────────────────────────────────────────

-- Q57-62: Fishing/Aquaculture
ALTER TABLE household_master 
ADD COLUMN fishing_involved ENUM('Yes','No') AFTER ngo_support_details,
ADD COLUMN fishing_type VARCHAR(200) AFTER fishing_involved,
ADD COLUMN boat_ownership VARCHAR(100) AFTER fishing_type,
ADD COLUMN boat_type VARCHAR(50) AFTER boat_ownership,
ADD COLUMN gps_in_boat ENUM('Yes','No') AFTER boat_type,
ADD COLUMN fishing_method VARCHAR(200) AFTER gps_in_boat,
ADD COLUMN fishing_frequency VARCHAR(100) AFTER fishing_method,
ADD COLUMN lean_fishing_period VARCHAR(100) AFTER fishing_frequency,
ADD COLUMN storage_facilities VARCHAR(200) AFTER lean_fishing_period;

-- ─────────────────────────────────────────────────────────────────────────────
-- Part 5: Household Members Profile - Expanded Fields
-- ─────────────────────────────────────────────────────────────────────────────

-- Add all Part-4 fields to household_members table as well
ALTER TABLE household_members 
ADD COLUMN differently_abled ENUM('Yes','No') DEFAULT 'No' AFTER monthly_income,
ADD COLUMN disability_category VARCHAR(200) AFTER differently_abled,
ADD COLUMN shg_membership ENUM('Yes','No') AFTER mobile_number,
ADD COLUMN shg_role VARCHAR(50) AFTER shg_membership,
ADD COLUMN shg_loan_savings DECIMAL(12,2) AFTER shg_role,
ADD COLUMN shg_loan_bank DECIMAL(12,2) AFTER shg_loan_savings,
ADD COLUMN shg_loan_mfi DECIMAL(12,2) AFTER shg_loan_bank,
ADD COLUMN shg_loan_others DECIMAL(12,2) AFTER shg_loan_mfi,
ADD COLUMN loan_reason VARCHAR(200) AFTER shg_loan_others,
ADD COLUMN fpo_membership ENUM('Yes','No') AFTER loan_reason,
ADD COLUMN fpo_role VARCHAR(50) AFTER fpo_membership,
ADD COLUMN fpo_investment DECIMAL(12,2) AFTER fpo_role,
ADD COLUMN fpo_type VARCHAR(100) AFTER fpo_investment,
ADD COLUMN fpo_commodity TEXT AFTER fpo_type,
ADD COLUMN fpo_market_linkage TEXT AFTER fpo_commodity,
ADD COLUMN gp_elected_member ENUM('Yes','No') AFTER fpo_market_linkage,
ADD COLUMN gp_membership_details VARCHAR(200) AFTER gp_elected_member,
ADD COLUMN assets_ownership ENUM('Yes','No') AFTER gp_membership_details,
ADD COLUMN asset_type VARCHAR(50) AFTER assets_ownership,
ADD COLUMN land_type_detail VARCHAR(100) AFTER asset_type,
ADD COLUMN govt_schemes_benefit TEXT AFTER land_type_detail,
ADD COLUMN scheme_benefit_details VARCHAR(500) AFTER govt_schemes_benefit,
ADD COLUMN mssrf_support_earlier ENUM('Yes','No') AFTER scheme_benefit_details,
ADD COLUMN mssrf_support_details VARCHAR(500) AFTER mssrf_support_earlier,
ADD COLUMN other_ngo_support ENUM('Yes','No') AFTER mssrf_support_details,
ADD COLUMN ngo_support_details VARCHAR(500) AFTER other_ngo_support;

-- ─────────────────────────────────────────────────────────────────────────────
-- Verification Query
-- ─────────────────────────────────────────────────────────────────────────────

SELECT 'Migration completed successfully!' AS status;

-- To verify new columns:
-- SHOW COLUMNS FROM household_master;
-- SHOW COLUMNS FROM household_members;
