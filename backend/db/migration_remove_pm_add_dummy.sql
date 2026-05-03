-- ============================================================
-- Migration: Remove Project Manager role + Add workflow test data
-- ============================================================

-- 1. Delete PM user
DELETE FROM users WHERE role = 'pm';

-- 2. Shrink users ENUM (remove pm)
ALTER TABLE users
  MODIFY COLUMN role ENUM('admin','enumerator','me','mis_reviewer','mis_head')
  DEFAULT 'enumerator';

-- 3. Remove pm from any route-guard references in projects table (no schema change needed)

-- ============================================================
-- 4. Add 15 test households at various workflow stages
--    All created by enumerator (id=3), spread across V01-V04
-- ============================================================

-- ── DRAFT (4 records) ──────────────────────────────────────────
INSERT INTO household_master
  (household_id, village_id, serial_no, enumerator_name, survey_date, consent_obtained,
   head_name, head_age, mobile, social_category, marital_status, education, occupation,
   monthly_income, differently_abled, shg_membership, fpo_membership, land_ownership,
   livestock_ownership, access_to_credit, fishing_involved,
   type_of_house, access_to_electricity, chronic_illness, health_insurance,
   female_headed_household, migration_status, gps_latitude, gps_longitude,
   state_name, district_name, block_name, village_name,
   workflow_status, created_by_user_id, status)
VALUES
('TN-V01-HH0010','V01',10,'Ravi Kumar','2026-01-10','Yes',
 'Annamalai P',52,'9876500010','OBC','Married','Secondary','Farming',
 '5000-10000','No','Yes','No','Yes',
 'No','No','No',
 'Semi-pucca','Yes','No','Yes',
 'No','Non-migrant',12.9145,80.2015,
 'Tamil Nadu','Chengalpattu','Chengalpattu','Perumbakkam',
 'draft',3,'Active'),

('TN-V02-HH0010','V02',10,'Ravi Kumar','2026-01-11','Yes',
 'Saranya V',34,'9876500011','SC','Married','Primary','Daily Wage',
 'Below 3000','No','Yes','No','No',
 'No','Yes','No',
 'Kutcha','Yes','Yes','No',
 'Yes','Non-migrant',12.9078,80.2291,
 'Tamil Nadu','Chengalpattu','Chengalpattu','Navalur',
 'draft',3,'Active'),

('TN-V03-HH0010','V03',10,'Ravi Kumar','2026-01-12','Yes',
 'Muthusamy K',61,'9876500012','ST','Widowed','No Formal Education','Agriculture Labour',
 'Below 3000','Yes','No','No','No',
 'No','No','No',
 'Kutcha','No','Yes','No',
 'Yes','Non-migrant',12.9210,80.0740,
 'Tamil Nadu','Kancheepuram','Kancheepuram','Mudichur',
 'draft',3,'Active'),

('TN-V04-HH0010','V04',10,'Ravi Kumar','2026-01-13','Yes',
 'Prabha Devi',28,'9876500013','General','Married','Graduate','Government Job',
 '15000-25000','No','No','Yes','No',
 'Yes','No','No',
 'Pucca','Yes','No','Yes',
 'No','Non-migrant',12.9635,79.9221,
 'Tamil Nadu','Vellore','Vellore','Vallam',
 'draft',3,'Active'),

-- ── SUBMITTED (4 records) ──────────────────────────────────────
('TN-V01-HH0011','V01',11,'Ravi Kumar','2026-01-15','Yes',
 'Senthil Raja',44,'9876500014','OBC','Married','Secondary','Fishing',
 '3000-5000','No','Yes','No','No',
 'No','Yes','Yes',
 'Semi-pucca','Yes','No','No',
 'No','Non-migrant',12.9148,80.2018,
 'Tamil Nadu','Chengalpattu','Chengalpattu','Perumbakkam',
 'submitted',3,'Active'),

('TN-V02-HH0011','V02',11,'Ravi Kumar','2026-01-16','Yes',
 'Kavitha M',38,'9876500015','SC','Married','Primary','Tailoring',
 '5000-10000','No','Yes','No','No',
 'No','No','No',
 'Pucca','Yes','No','Yes',
 'Yes','Non-migrant',12.9082,80.2295,
 'Tamil Nadu','Chengalpattu','Chengalpattu','Navalur',
 'submitted',3,'Active'),

('TN-V03-HH0011','V03',11,'Ravi Kumar','2026-01-17','Yes',
 'Jayaraj T',55,'9876500016','OBC','Married','Secondary','Farming',
 '5000-10000','No','Yes','Yes','Yes',
 'Yes','No','No',
 'Semi-pucca','Yes','No','No',
 'No','Migrant',12.9215,80.0743,
 'Tamil Nadu','Kancheepuram','Kancheepuram','Mudichur',
 'submitted',3,'Active'),

('TN-V04-HH0011','V04',11,'Ravi Kumar','2026-01-18','Yes',
 'Uma Maheswari',45,'9876500017','SC','Widowed','Secondary','Daily Wage',
 '3000-5000','No','Yes','No','No',
 'Yes','No','No',
 'Semi-pucca','Yes','Yes','No',
 'Yes','Non-migrant',12.9639,79.9225,
 'Tamil Nadu','Vellore','Vellore','Vallam',
 'submitted',3,'Active'),

-- ── UNDER REVIEW (2 records) ──────────────────────────────────
('TN-V01-HH0012','V01',12,'Ravi Kumar','2026-01-20','Yes',
 'Balasubramanian G',67,'9876500018','General','Married','Graduate','Retired',
 '10000-15000','Yes','No','No','Yes',
 'No','No','No',
 'Pucca','Yes','Yes','Yes',
 'No','Non-migrant',12.9151,80.2021,
 'Tamil Nadu','Chengalpattu','Chengalpattu','Perumbakkam',
 'under_review',3,'Active'),

('TN-V03-HH0012','V03',12,'Ravi Kumar','2026-01-21','Yes',
 'Sumathi Devi',33,'9876500019','ST','Married','Primary','Livestock Rearing',
 '3000-5000','No','Yes','No','No',
 'Yes','No','No',
 'Kutcha','No','No','No',
 'No','Non-migrant',12.9218,80.0745,
 'Tamil Nadu','Kancheepuram','Kancheepuram','Mudichur',
 'under_review',3,'Active'),

-- ── APPROVED (3 records) ──────────────────────────────────────
('TN-V01-HH0013','V01',13,'Ravi Kumar','2026-01-05','Yes',
 'Krishnamurthy R',58,'9876500020','OBC','Married','Secondary','Fishing',
 '5000-10000','No','Yes','No','No',
 'No','Yes','Yes',
 'Semi-pucca','Yes','No','No',
 'No','Non-migrant',12.9153,80.2023,
 'Tamil Nadu','Chengalpattu','Chengalpattu','Perumbakkam',
 'approved',3,'Active'),

('TN-V02-HH0012','V02',12,'Ravi Kumar','2026-01-06','Yes',
 'Selvi N',41,'9876500021','SC','Married','Primary','SHG Member',
 '5000-10000','No','Yes','No','No',
 'No','No','No',
 'Semi-pucca','Yes','No','Yes',
 'Yes','Non-migrant',12.9085,80.2298,
 'Tamil Nadu','Chengalpattu','Chengalpattu','Navalur',
 'approved',3,'Active'),

('TN-V04-HH0012','V04',12,'Ravi Kumar','2026-01-07','Yes',
 'Chandrasekaran A',49,'9876500022','OBC','Married','Graduate','Business',
 '15000-25000','No','No','Yes','Yes',
 'Yes','No','No',
 'Pucca','Yes','No','Yes',
 'No','Non-migrant',12.9641,79.9228,
 'Tamil Nadu','Vellore','Vellore','Vallam',
 'approved',3,'Active'),

-- ── RETURNED (2 records) ──────────────────────────────────────
('TN-V02-HH0013','V02',13,'Ravi Kumar','2026-01-22','Yes',
 'Meenatchi S',29,'9876500023','SC','Single','Secondary','Domestic Work',
 '3000-5000','No','Yes','No','No',
 'No','No','No',
 'Kutcha','Yes','No','No',
 'Yes','Non-migrant',12.9088,80.2301,
 'Tamil Nadu','Chengalpattu','Chengalpattu','Navalur',
 'returned',3,'Active'),

('TN-V04-HH0013','V04',13,'Ravi Kumar','2026-01-23','Yes',
 'Arulraj K',36,'9876500024','OBC','Married','Primary','Fishing',
 '5000-10000','No','No','No','No',
 'No','Yes','Yes',
 'Semi-pucca','Yes','No','No',
 'No','Non-migrant',12.9644,79.9231,
 'Tamil Nadu','Vellore','Vellore','Vallam',
 'returned',3,'Active');

-- 5. Set submitted_at for submitted/under_review/approved/returned records
UPDATE household_master SET submitted_at = DATE_SUB(NOW(), INTERVAL 5 DAY)
  WHERE household_id IN ('TN-V01-HH0011','TN-V02-HH0011','TN-V03-HH0011','TN-V04-HH0011');
UPDATE household_master SET submitted_at = DATE_SUB(NOW(), INTERVAL 3 DAY)
  WHERE household_id IN ('TN-V01-HH0012','TN-V03-HH0012');
UPDATE household_master SET submitted_at = DATE_SUB(NOW(), INTERVAL 10 DAY)
  WHERE household_id IN ('TN-V01-HH0013','TN-V02-HH0012','TN-V04-HH0012');
UPDATE household_master SET submitted_at = DATE_SUB(NOW(), INTERVAL 4 DAY)
  WHERE household_id IN ('TN-V02-HH0013','TN-V04-HH0013');

-- 6. Set reviewer fields for approved records
UPDATE household_master
  SET reviewed_by = 5, reviewed_at = DATE_SUB(NOW(), INTERVAL 7 DAY)
  WHERE household_id IN ('TN-V01-HH0013','TN-V02-HH0012','TN-V04-HH0012');

-- 7. Set reviewer + comment for returned records
UPDATE household_master
  SET reviewed_by = 5,
      reviewed_at = DATE_SUB(NOW(), INTERVAL 2 DAY),
      review_comment = 'GPS coordinates are missing. Please capture the GPS location at the household and resubmit.'
  WHERE household_id = 'TN-V02-HH0013';

UPDATE household_master
  SET reviewed_by = 5,
      reviewed_at = DATE_SUB(NOW(), INTERVAL 1 DAY),
      review_comment = 'Mobile number appears incorrect (only 9 digits). Please verify and correct before resubmitting.'
  WHERE household_id = 'TN-V04-HH0013';

-- 8. Add revision_log entries for the test records
INSERT INTO revision_log (household_id, changed_by_user_id, changed_by_name, user_role, action, created_at)
  SELECT household_id, 3, 'Field Enumerator', 'enumerator', 'CREATED', DATE_SUB(NOW(), INTERVAL 14 DAY)
  FROM household_master WHERE household_id IN (
    'TN-V01-HH0010','TN-V02-HH0010','TN-V03-HH0010','TN-V04-HH0010',
    'TN-V01-HH0011','TN-V02-HH0011','TN-V03-HH0011','TN-V04-HH0011',
    'TN-V01-HH0012','TN-V03-HH0012',
    'TN-V01-HH0013','TN-V02-HH0012','TN-V04-HH0012',
    'TN-V02-HH0013','TN-V04-HH0013'
  );

INSERT INTO revision_log (household_id, changed_by_user_id, changed_by_name, user_role, action, created_at)
  SELECT household_id, 3, 'Field Enumerator', 'enumerator', 'SUBMITTED', submitted_at
  FROM household_master WHERE submitted_at IS NOT NULL AND household_id IN (
    'TN-V01-HH0011','TN-V02-HH0011','TN-V03-HH0011','TN-V04-HH0011',
    'TN-V01-HH0012','TN-V03-HH0012',
    'TN-V01-HH0013','TN-V02-HH0012','TN-V04-HH0012',
    'TN-V02-HH0013','TN-V04-HH0013'
  );

INSERT INTO revision_log (household_id, changed_by_user_id, changed_by_name, user_role, action, comment, created_at)
VALUES
  ('TN-V01-HH0013', 5, 'MIS Reviewer', 'mis_reviewer', 'APPROVED', NULL, DATE_SUB(NOW(), INTERVAL 7 DAY)),
  ('TN-V02-HH0012', 5, 'MIS Reviewer', 'mis_reviewer', 'APPROVED', NULL, DATE_SUB(NOW(), INTERVAL 7 DAY)),
  ('TN-V04-HH0012', 5, 'MIS Reviewer', 'mis_reviewer', 'APPROVED', NULL, DATE_SUB(NOW(), INTERVAL 7 DAY)),
  ('TN-V02-HH0013', 5, 'MIS Reviewer', 'mis_reviewer', 'RETURNED',
   'GPS coordinates are missing. Please capture the GPS location at the household and resubmit.',
   DATE_SUB(NOW(), INTERVAL 2 DAY)),
  ('TN-V04-HH0013', 5, 'MIS Reviewer', 'mis_reviewer', 'RETURNED',
   'Mobile number appears incorrect (only 9 digits). Please verify and correct before resubmitting.',
   DATE_SUB(NOW(), INTERVAL 1 DAY));
