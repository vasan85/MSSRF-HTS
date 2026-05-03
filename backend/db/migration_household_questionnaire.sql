-- ============================================================
--  Household Master Migration - Complete Questionnaire Fields
--  Based on: MIS Requirement questionnaire.docx
-- ============================================================

USE mis_hits;

-- Drop existing household_master table to recreate with new structure
DROP TABLE IF EXISTS project_household_link;
DROP TABLE IF EXISTS household_master;
DROP TABLE IF EXISTS household_members;

-- ── Household Master (Main Table) ──────────────────────────────
CREATE TABLE household_master (
  household_id       VARCHAR(30) PRIMARY KEY,
  village_id         VARCHAR(10) NOT NULL,
  serial_no          INT NOT NULL,
  
  -- Part 1: Enumerator and Survey Details
  enumerator_name    VARCHAR(100),
  survey_date        DATE,
  
  -- Part 2: Consent
  consent_obtained   ENUM('Yes','No') DEFAULT 'Yes',
  
  -- Part 3: Geographical Details
  gps_latitude       DECIMAL(10,6),
  gps_longitude      DECIMAL(11,6),
  state_name         VARCHAR(100),
  district_name      VARCHAR(100),
  block_name         VARCHAR(100),
  village_name       VARCHAR(100),
  
  -- Part 4: Household Profile
  head_name          VARCHAR(100) NOT NULL,
  head_age           INT,
  mobile             VARCHAR(15) NOT NULL,
  social_category    ENUM('SC','ST','OBC','General','EWS','Others','Prefer not to say') NOT NULL,
  marital_status     ENUM('Married','Single','Widowed','Divorced','Separated','Prefer not to say'),
  education          VARCHAR(50),
  occupation         VARCHAR(100),
  occupation_other   VARCHAR(100),
  monthly_income     VARCHAR(50),
  monthly_income_exact DECIMAL(12,2),
  differently_abled  ENUM('Yes','No') DEFAULT 'No',
  disability_category VARCHAR(200),
  
  -- Part 6: Housing & Living Conditions
  type_of_house      ENUM('Kutcha','Semi-pucca','Pucca'),
  ownership_status   ENUM('Own','Rented','Lease','Other'),
  number_of_rooms    INT,
  type_of_roof       VARCHAR(50),
  type_of_floor      VARCHAR(50),
  access_to_electricity ENUM('Yes','No'),
  source_of_lighting VARCHAR(50),
  cooking_fuel       VARCHAR(50),
  separate_kitchen   ENUM('Yes','No'),
  
  -- Part 7: Water, Sanitation & Hygiene
  primary_water_source VARCHAR(50),
  distance_to_water  VARCHAR(50),
  water_availability VARCHAR(50),
  type_of_toilet_facility VARCHAR(50),
  type_of_toilet     VARCHAR(50),
  handwashing_facility ENUM('Yes','No'),
  use_of_soap        VARCHAR(50),
  solid_waste_disposal VARCHAR(50),
  
  -- Part 8: Health
  chronic_illness    ENUM('Yes','No'),
  chronic_illness_detail VARCHAR(200),
  nearest_health_facility VARCHAR(50),
  distance_to_health VARCHAR(50),
  health_insurance   ENUM('Yes','No'),
  health_insurance_scheme VARCHAR(100),
  pregnant_lactating ENUM('Yes','No'),
  children_under_5   INT DEFAULT 0,
  immunization_status VARCHAR(50),
  anganwadi_access   ENUM('Yes','No'),
  
  -- Part 8 (continued): Education
  children_attending_school VARCHAR(50),
  type_of_school     VARCHAR(50),
  dropout_cases      ENUM('Yes','No'),
  dropout_reason     VARCHAR(100),
  
  -- Part 9: Assets and Credits
  household_assets   TEXT,
  land_ownership     ENUM('Yes','No'),
  land_size_total    DECIMAL(10,2),
  irrigation_type    TEXT,
  residential_plot_size DECIMAL(10,2),
  land_size_other    DECIMAL(10,2),
  livestock_ownership ENUM('Yes','No'),
  livestock_types    TEXT,
  access_to_credit   ENUM('Yes','No'),
  credit_sources     TEXT,
  total_credit_amount DECIMAL(12,2),
  
  -- Part 10: Vulnerability Indicators
  female_headed_household ENUM('Yes','No'),
  migration_status   ENUM('Migrant','Non-migrant'),
  seasonal_migration ENUM('Yes','No'),
  observation_remarks TEXT,
  respondent_comments TEXT,
  
  -- System fields
  status             ENUM('Active','Inactive') DEFAULT 'Active',
  created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (village_id) REFERENCES village_master(village_id)
);

-- ── Household Members Profile (Part 5) ─────────────────────────
CREATE TABLE household_members (
  member_id          INT AUTO_INCREMENT PRIMARY KEY,
  household_id       VARCHAR(30) NOT NULL,
  member_name        VARCHAR(100) NOT NULL,
  age                INT,
  relationship_to_head VARCHAR(50),
  social_category    VARCHAR(50),
  marital_status     VARCHAR(50),
  education          VARCHAR(50),
  occupation         VARCHAR(100),
  monthly_income     DECIMAL(12,2),
  mobile_number      VARCHAR(15),
  created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (household_id) REFERENCES household_master(household_id) ON DELETE CASCADE
);

-- ── Re-create Project-Household Link ───────────────────────────
CREATE TABLE project_household_link (
  record_id          VARCHAR(10) PRIMARY KEY,
  project_id         VARCHAR(10) NOT NULL,
  household_id       VARCHAR(30) NOT NULL,
  village_id         VARCHAR(10),
  enrollment_date    DATE,
  benefit_type       VARCHAR(100),
  benefit_category   VARCHAR(100),
  monetary_value     DECIMAL(12,2) DEFAULT 0,
  service_quantity   INT DEFAULT 0,
  status             ENUM('Active','Pending','Partial','Closed') DEFAULT 'Active',
  remarks            TEXT,
  created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id)   REFERENCES project_master(project_id),
  FOREIGN KEY (household_id) REFERENCES household_master(household_id)
);

-- ============================================================
--  Clear old audit logs related to households
-- ============================================================
DELETE FROM audit_log WHERE module = 'Household';

