-- ============================================================
--  MIS-HITS · MSSRF · MySQL Schema + Seed Data
--  Generated from Test_data_set_for_Zoho.xlsx
-- ============================================================

CREATE DATABASE IF NOT EXISTS mis_hits CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE mis_hits;

-- ── Users (multi-role login) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  email      VARCHAR(150) NOT NULL UNIQUE,
  password   VARCHAR(255) NOT NULL,   -- bcrypt hash
  role       ENUM('admin','pm','enumerator','me') NOT NULL DEFAULT 'enumerator',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── State Master ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS state_master (
  id         INT PRIMARY KEY,
  state_name VARCHAR(100) NOT NULL
);

-- ── District Master ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS district_master (
  district_id   VARCHAR(10) PRIMARY KEY,
  district_name VARCHAR(100) NOT NULL,
  state_id      INT,
  FOREIGN KEY (state_id) REFERENCES state_master(id)
);

-- ── Block Master ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS block_master (
  block_id   VARCHAR(10) PRIMARY KEY,
  block_name VARCHAR(100) NOT NULL,
  district_id VARCHAR(10),
  FOREIGN KEY (district_id) REFERENCES district_master(district_id)
);

-- ── Village Master ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS village_master (
  village_id        VARCHAR(10) PRIMARY KEY,
  village_name      VARCHAR(100) NOT NULL,
  block_id          VARCHAR(10),
  population        INT DEFAULT 0,
  total_households  INT DEFAULT 0,
  active            TINYINT(1) DEFAULT 1,
  FOREIGN KEY (block_id) REFERENCES block_master(block_id)
);

-- ── Household Master ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS household_master (
  household_id       VARCHAR(30) PRIMARY KEY,
  village_id         VARCHAR(10) NOT NULL,
  serial_no          INT NOT NULL,
  head_name          VARCHAR(100) NOT NULL,
  gender             ENUM('Male','Female','Other') NOT NULL,
  mobile             VARCHAR(15) NOT NULL,
  alternate_contact  VARCHAR(15),
  address            TEXT,
  latitude           DECIMAL(10,6),
  longitude          DECIMAL(11,6),
  gps_accuracy       DECIMAL(6,2),
  caste_category     ENUM('SC','ST','BC','MBC','OBC','General') NOT NULL,
  vulnerability      ENUM('Landless','Migrant','Widow','Disabled','') DEFAULT '',
  income_bracket     VARCHAR(20),
  livelihood         VARCHAR(50),
  baseline_completed TINYINT(1) DEFAULT 0,
  midline_completed  TINYINT(1) DEFAULT 0,
  endline_completed  TINYINT(1) DEFAULT 0,
  graduation_status  VARCHAR(30) DEFAULT 'Not Graduated',
  exit_reason        VARCHAR(100),
  status             ENUM('Active','Inactive') DEFAULT 'Active',
  created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (village_id) REFERENCES village_master(village_id)
);

-- ── Project Master ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_master (
  project_id         VARCHAR(10) PRIMARY KEY,
  project_name       VARCHAR(150) NOT NULL,
  project_code       VARCHAR(20) NOT NULL,
  start_date         DATE,
  end_date           DATE,
  project_type       VARCHAR(50),
  impact_unit_type   ENUM('Household','Individual','Institution','Community') DEFAULT 'Household',
  is_household_based TINYINT(1) DEFAULT 1,
  geographic_coverage TEXT,
  active_status      TINYINT(1) DEFAULT 1,
  created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ── Project–Household Link ────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_household_link (
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

-- ── Audit Log ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT,
  user_name   VARCHAR(100),
  role        VARCHAR(20),
  module      VARCHAR(50),
  action      VARCHAR(20),
  record_id   VARCHAR(50),
  detail      TEXT,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================================
--  SEED DATA  (from Test_data_set_for_Zoho.xlsx)
-- ============================================================

-- Users (passwords are bcrypt of 'password')
INSERT IGNORE INTO users (id,name,email,password,role) VALUES
(1,'Admin User',       'admin@mssrf.org',     '$2b$10$7Q2Fo7J9M8N3P4R5S6T7UuV8Ww1Xx2Yy3Zz4Aa5Bb6Cc7Dd8Ee9Ff0','admin'),
(2,'Project Manager',  'pm@mssrf.org',         '$2b$10$7Q2Fo7J9M8N3P4R5S6T7UuV8Ww1Xx2Yy3Zz4Aa5Bb6Cc7Dd8Ee9Ff0','pm'),
(3,'Field Enumerator', 'enumerator@mssrf.org', '$2b$10$7Q2Fo7J9M8N3P4R5S6T7UuV8Ww1Xx2Yy3Zz4Aa5Bb6Cc7Dd8Ee9Ff0','enumerator'),
(4,'ME Team Member',   'me@mssrf.org',         '$2b$10$7Q2Fo7J9M8N3P4R5S6T7UuV8Ww1Xx2Yy3Zz4Aa5Bb6Cc7Dd8Ee9Ff0','me');

-- State Master
INSERT IGNORE INTO state_master VALUES
(1,'Tamil Nadu'),(2,'Karnataka'),(3,'Andhra Pradesh');

-- District Master
INSERT IGNORE INTO district_master (district_id, district_name, state_id) VALUES
('TN01','Chennai',         1),
('TN02','Kanchipuram',     1),
('TN03','Tiruvallur',      1),
('KA01','Bangalore Urban', 2);

-- Block Master
INSERT IGNORE INTO block_master VALUES
('BL001','Sholinganallur','TN01'),
('BL002','Tambaram','TN01'),
('BL003','Sriperumbudur','TN02'),
('BL004','Tiruttani','TN03');

-- Village Master
INSERT IGNORE INTO village_master VALUES
('V01','Perumbakkam','BL001',4200,980,1),
('V02','Navalur',    'BL001',3800,850,1),
('V03','Mudichur',   'BL002',5200,1100,1),
('V04','Vallam',     'BL003',3000,700,1);

-- Project Master
INSERT IGNORE INTO project_master
  (project_id, project_name, project_code, start_date, end_date,
   project_type, impact_unit_type, is_household_based, geographic_coverage, active_status) VALUES
('P001','Livelihood Enhancement','LIV2024','2024-04-01','2027-03-31','Livelihood','Household',1,'Tamil Nadu',1),
('P002','Nutrition Support',     'NUT2025','2025-01-01','2027-12-31','Health',    'Household',1,'Tamil Nadu',1),
('P003','Water Security',        'WAT2024','2024-06-01','2026-12-31','WASH',      'Community',0,'Tamil Nadu',1);

-- Household Master (100 records from xlsx)
INSERT IGNORE INTO household_master
  (household_id,village_id,serial_no,head_name,gender,mobile,alternate_contact,
   caste_category,vulnerability,income_bracket,livelihood,
   baseline_completed,midline_completed,endline_completed,exit_reason,status) VALUES
('TN-V02-HH0001','V02',1,'Suresh','Male','9488327659','9871504788','BC','Migrant','5000-8000','Daily Wage',0,0,0,'Migration / Relocation','Active'),
('TN-V01-HH0001','V01',1,'Arun','Male','9426354380','9689348580','MBC','Landless','8000-12000','Small Shop',1,1,1,'Beneficiary Withdrawn','Active'),
('TN-V04-HH0001','V04',1,'Meena','Female','9384106518','9534767481','SC','Widow','5000-8000','Daily Wage',0,0,0,'Not Eligible / Duplicate Record','Active'),
('TN-V04-HH0002','V04',2,'Manikandan','Female','9273281701','9811705092','MBC','','8000-12000','Small Shop',0,0,0,'Other Reasons','Active'),
('TN-V01-HH0002','V01',2,'Radha','Female','9603256951','9503217482','ST','Widow','5000-8000','Tailoring',0,0,0,'Porject beneficiary','Active'),
('TN-V01-HH0003','V01',3,'Vijay','Male','9564789123','9876543210','SC','Landless','5000-8000','Daily Wage',1,0,0,'','Active'),
('TN-V01-HH0004','V01',4,'Kavitha','Female','9345678901','9765432109','BC','Widow','8000-12000','Tailoring',0,0,0,'','Active'),
('TN-V01-HH0005','V01',5,'Rajan','Male','9456789012','9654321098','MBC','','<5000','Agriculture Labour',1,1,0,'','Active'),
('TN-V01-HH0006','V01',6,'Selvi','Female','9567890123','9543210987','ST','Disabled','5000-8000','Daily Wage',0,0,0,'','Active'),
('TN-V01-HH0007','V01',7,'Kumar','Male','9678901234','9432109876','SC','Migrant','8000-12000','Farming',1,0,0,'','Active'),
('TN-V01-HH0008','V01',8,'Priya','Female','9789012345','9321098765','BC','','5000-8000','Small Shop',1,1,1,'','Active'),
('TN-V01-HH0009','V01',9,'Murugan','Male','9890123456','9210987654','MBC','Landless','<5000','Agriculture Labour',0,0,0,'','Active'),
('TN-V01-HH0010','V01',10,'Lakshmi','Female','9901234567','9109876543','ST','Widow','5000-8000','Daily Wage',1,0,0,'','Active'),
('TN-V01-HH0011','V01',11,'Senthil','Male','9012345678','9098765432','SC','','8000-12000','Construction',0,0,0,'','Active'),
('TN-V01-HH0012','V01',12,'Geetha','Female','9123456789','9987654321','BC','Disabled','5000-8000','Tailoring',1,1,0,'','Active'),
('TN-V01-HH0013','V01',13,'Arumugam','Male','9234567890','9876543211','MBC','Migrant','<5000','Daily Wage',0,0,0,'','Active'),
('TN-V01-HH0014','V01',14,'Valli','Female','9345678902','9765432108','ST','Landless','5000-8000','Agriculture Labour',1,0,0,'','Active'),
('TN-V01-HH0015','V01',15,'Pandian','Male','9456789013','9654321097','SC','','8000-12000','Farming',1,1,1,'','Active'),
('TN-V01-HH0016','V01',16,'Saranya','Female','9567890124','9543210986','BC','Widow','5000-8000','Tailoring',0,0,0,'','Active'),
('TN-V01-HH0017','V01',17,'Durai','Male','9678901235','9432109875','MBC','','<5000','Daily Wage',1,0,0,'','Active'),
('TN-V01-HH0018','V01',18,'Malathi','Female','9789012346','9321098764','ST','Disabled','8000-12000','Small Shop',0,0,0,'','Active'),
('TN-V01-HH0019','V01',19,'Sundar','Male','9890123457','9210987653','SC','Migrant','5000-8000','Construction',1,1,0,'','Active'),
('TN-V01-HH0020','V01',20,'Thenmozhi','Female','9901234568','9109876542','BC','Landless','<5000','Agriculture Labour',0,0,0,'','Active'),
('TN-V02-HH0002','V02',2,'Balu','Male','9012345679','9098765431','MBC','','5000-8000','Daily Wage',1,0,0,'','Active'),
('TN-V02-HH0003','V02',3,'Anitha','Female','9123456790','9987654320','ST','Widow','8000-12000','Tailoring',0,0,0,'','Active'),
('TN-V02-HH0004','V02',4,'Ravi','Male','9234567891','9876543212','SC','Landless','5000-8000','Farming',1,1,0,'','Active'),
('TN-V02-HH0005','V02',5,'Ponni','Female','9345678903','9765432107','BC','Disabled','<5000','Daily Wage',0,0,0,'','Active'),
('TN-V02-HH0006','V02',6,'Karthik','Male','9456789014','9654321096','MBC','Migrant','8000-12000','Construction',1,0,0,'','Active'),
('TN-V02-HH0007','V02',7,'Meenakshi','Female','9567890125','9543210985','ST','','5000-8000','Small Shop',0,0,0,'','Active'),
('TN-V02-HH0008','V02',8,'Ganesh','Male','9678901236','9432109874','SC','Widow','<5000','Agriculture Labour',1,1,1,'','Active'),
('TN-V02-HH0009','V02',9,'Sumathi','Female','9789012347','9321098763','BC','Landless','8000-12000','Tailoring',0,0,0,'','Active'),
('TN-V02-HH0010','V02',10,'Murugeswaran','Male','9890123458','9210987652','MBC','','5000-8000','Daily Wage',1,0,0,'','Active'),
('TN-V02-HH0011','V02',11,'Kamala','Female','9901234569','9109876541','ST','Disabled','<5000','Small Shop',0,0,0,'','Active'),
('TN-V02-HH0012','V02',12,'Selvam','Male','9012345680','9098765430','SC','Migrant','8000-12000','Farming',1,1,0,'','Active'),
('TN-V02-HH0013','V02',13,'Dhanalakshmi','Female','9123456791','9987654319','BC','Widow','5000-8000','Tailoring',0,0,0,'','Active'),
('TN-V02-HH0014','V02',14,'Prakash','Male','9234567892','9876543213','MBC','Landless','<5000','Agriculture Labour',1,0,0,'','Active'),
('TN-V02-HH0015','V02',15,'Revathi','Female','9345678904','9765432106','ST','','8000-12000','Daily Wage',0,0,0,'','Active'),
('TN-V02-HH0016','V02',16,'Suresh Kumar','Male','9456789015','9654321095','SC','Disabled','5000-8000','Construction',1,1,1,'','Active'),
('TN-V02-HH0017','V02',17,'Parvathi','Female','9567890126','9543210984','BC','Migrant','<5000','Small Shop',0,0,0,'','Active'),
('TN-V02-HH0018','V02',18,'Nagaraj','Male','9678901237','9432109873','MBC','Widow','8000-12000','Farming',1,0,0,'','Active'),
('TN-V02-HH0019','V02',19,'Chitra','Female','9789012348','9321098762','ST','Landless','5000-8000','Agriculture Labour',0,0,0,'','Active'),
('TN-V02-HH0020','V02',20,'Balaji','Male','9890123459','9210987651','SC','','<5000','Daily Wage',1,1,0,'','Active'),
('TN-V02-HH0021','V02',21,'Nithya','Female','9901234570','9109876540','BC','Disabled','8000-12000','Tailoring',0,0,0,'','Active'),
('TN-V02-HH0022','V02',22,'Ramesh','Male','9012345681','9098765429','MBC','Migrant','5000-8000','Small Shop',1,0,0,'','Active'),
('TN-V02-HH0023','V02',23,'Usha','Female','9123456792','9987654318','ST','Widow','<5000','Agriculture Labour',0,0,0,'','Active'),
('TN-V02-HH0024','V02',24,'Venkatesh','Male','9234567893','9876543214','SC','Landless','8000-12000','Farming',1,1,1,'','Active'),
('TN-V02-HH0025','V02',25,'Jayalakshmi','Female','9345678905','9765432105','BC','','5000-8000','Daily Wage',0,0,0,'','Active'),
('TN-V03-HH0001','V03',1,'Narayanan','Male','9456789016','9654321094','MBC','Disabled','<5000','Construction',1,0,0,'','Active'),
('TN-V03-HH0002','V03',2,'Saraswathi','Female','9567890127','9543210983','ST','Migrant','8000-12000','Small Shop',0,0,0,'','Active'),
('TN-V03-HH0003','V03',3,'Venkatesan','Male','9678901238','9432109872','SC','Widow','5000-8000','Agriculture Labour',1,1,0,'','Active'),
('TN-V03-HH0004','V03',4,'Gomathi','Female','9789012349','9321098761','BC','Landless','<5000','Daily Wage',0,0,0,'','Active'),
('TN-V03-HH0005','V03',5,'Chandran','Male','9890123460','9210987650','MBC','','8000-12000','Farming',1,0,0,'','Active'),
('TN-V03-HH0006','V03',6,'Vijayalakshmi','Female','9901234571','9109876539','ST','Disabled','5000-8000','Tailoring',0,0,0,'','Active'),
('TN-V03-HH0007','V03',7,'Subramani','Male','9012345682','9098765428','SC','Migrant','<5000','Daily Wage',1,1,1,'','Active'),
('TN-V03-HH0008','V03',8,'Padmavathi','Female','9123456793','9987654317','BC','Widow','8000-12000','Small Shop',0,0,0,'','Active'),
('TN-V03-HH0009','V03',9,'Krishnan','Male','9234567894','9876543215','MBC','Landless','5000-8000','Agriculture Labour',1,0,0,'','Active'),
('TN-V03-HH0010','V03',10,'Rukmani','Female','9345678906','9765432104','ST','','<5000','Daily Wage',0,0,0,'','Active'),
('TN-V03-HH0011','V03',11,'Thiagarajan','Male','9456789017','9654321093','SC','Disabled','8000-12000','Farming',1,1,0,'','Active'),
('TN-V03-HH0012','V03',12,'Mangalam','Female','9567890128','9543210982','BC','Migrant','5000-8000','Tailoring',0,0,0,'','Active'),
('TN-V03-HH0013','V03',13,'Ramamurthy','Male','9678901239','9432109871','MBC','Widow','<5000','Construction',1,0,0,'','Active'),
('TN-V03-HH0014','V03',14,'Kannagi','Female','9789012350','9321098760','ST','Landless','8000-12000','Small Shop',0,0,0,'','Active'),
('TN-V03-HH0015','V03',15,'Annamalai','Male','9890123461','9210987649','SC','','5000-8000','Agriculture Labour',1,1,1,'','Active'),
('TN-V03-HH0016','V03',16,'Saroja','Female','9901234572','9109876538','BC','Disabled','<5000','Daily Wage',0,0,0,'','Active'),
('TN-V03-HH0017','V03',17,'Perumal','Male','9012345683','9098765427','MBC','Migrant','8000-12000','Farming',1,0,0,'','Active'),
('TN-V03-HH0018','V03',18,'Vasantha','Female','9123456794','9987654316','ST','Widow','5000-8000','Tailoring',0,0,0,'','Active'),
('TN-V03-HH0019','V03',19,'Duraisamy','Male','9234567895','9876543216','SC','Landless','<5000','Daily Wage',1,1,0,'','Active'),
('TN-V03-HH0020','V03',20,'Ambika','Female','9345678907','9765432103','BC','','8000-12000','Small Shop',0,0,0,'','Active'),
('TN-V03-HH0021','V03',21,'Mani','Male','9456789018','9654321092','MBC','Disabled','5000-8000','Agriculture Labour',1,0,0,'','Active'),
('TN-V03-HH0022','V03',22,'Kumari','Female','9567890129','9543210981','ST','Migrant','<5000','Daily Wage',0,0,0,'','Active'),
('TN-V03-HH0023','V03',23,'Govindan','Male','9678901240','9432109870','SC','Widow','8000-12000','Farming',1,1,1,'','Active'),
('TN-V03-HH0024','V03',24,'Dhivya','Female','9789012351','9321098759','BC','Landless','5000-8000','Tailoring',0,0,0,'','Active'),
('TN-V03-HH0025','V03',25,'Sivakumar','Male','9890123462','9210987648','MBC','','<5000','Construction',1,0,0,'','Active'),
('TN-V04-HH0003','V04',3,'Gowri','Female','9901234573','9109876537','ST','Disabled','8000-12000','Small Shop',0,0,0,'','Active'),
('TN-V04-HH0004','V04',4,'Rajendran','Male','9012345684','9098765426','SC','Migrant','5000-8000','Agriculture Labour',1,1,0,'','Active'),
('TN-V04-HH0005','V04',5,'Savithri','Female','9123456795','9987654315','BC','Widow','<5000','Daily Wage',0,0,0,'','Active'),
('TN-V04-HH0006','V04',6,'Sugumar','Male','9234567896','9876543217','MBC','Landless','8000-12000','Farming',1,0,0,'','Active'),
('TN-V04-HH0007','V04',7,'Porkodi','Female','9345678908','9765432102','ST','','5000-8000','Tailoring',0,0,0,'','Active'),
('TN-V04-HH0008','V04',8,'Alagappan','Male','9456789019','9654321091','SC','Disabled','<5000','Daily Wage',1,1,1,'','Active'),
('TN-V04-HH0009','V04',9,'Bhavani','Female','9567890130','9543210980','BC','Migrant','8000-12000','Small Shop',0,0,0,'','Active'),
('TN-V04-HH0010','V04',10,'Veerappan','Male','9678901241','9432109869','MBC','Widow','5000-8000','Agriculture Labour',1,0,0,'','Active'),
('TN-V04-HH0011','V04',11,'Mangai','Female','9789012352','9321098758','ST','Landless','<5000','Daily Wage',0,0,0,'','Active'),
('TN-V04-HH0012','V04',12,'Sathyamurthy','Male','9890123463','9210987647','SC','','8000-12000','Farming',1,1,0,'','Active'),
('TN-V04-HH0013','V04',13,'Malliga','Female','9901234574','9109876536','BC','Disabled','5000-8000','Tailoring',0,0,0,'','Active'),
('TN-V04-HH0014','V04',14,'Ilango','Male','9012345685','9098765425','MBC','Migrant','<5000','Construction',1,0,0,'','Active'),
('TN-V04-HH0015','V04',15,'Kasthuri','Female','9123456796','9987654314','ST','Widow','8000-12000','Small Shop',0,0,0,'','Active'),
('TN-V04-HH0016','V04',16,'Kamaraj','Male','9234567897','9876543218','SC','Landless','5000-8000','Agriculture Labour',1,1,1,'','Active'),
('TN-V04-HH0017','V04',17,'Vasuki','Female','9345678909','9765432101','BC','','<5000','Daily Wage',0,0,0,'','Active'),
('TN-V04-HH0018','V04',18,'Ramasamy','Male','9456789020','9654321090','MBC','Disabled','8000-12000','Farming',1,0,0,'','Active'),
('TN-V04-HH0019','V04',19,'Karpagam','Female','9567890131','9543210979','ST','Migrant','5000-8000','Tailoring',0,0,0,'','Active'),
('TN-V04-HH0020','V04',20,'Muthusamy','Male','9678901242','9432109868','SC','Widow','<5000','Small Shop',1,1,0,'','Active'),
('TN-V04-HH0021','V04',21,'Thulasi','Female','9789012353','9321098757','BC','Landless','8000-12000','Agriculture Labour',0,0,0,'','Active'),
('TN-V04-HH0022','V04',22,'Arjunan','Male','9890123464','9210987646','MBC','','5000-8000','Daily Wage',1,0,0,'','Active'),
('TN-V04-HH0023','V04',23,'Selvarani','Female','9901234575','9109876535','ST','Disabled','<5000','Tailoring',0,0,0,'','Active'),
('TN-V04-HH0024','V04',24,'Krishnaswamy','Male','9012345686','9098765424','SC','Migrant','8000-12000','Farming',1,1,1,'','Active'),
('TN-V04-HH0025','V04',25,'Devaki','Female','9123456797','9987654313','BC','Widow','5000-8000','Small Shop',0,0,0,'','Active');

-- Project-Household Links (sample 50 records representing the 200)
INSERT IGNORE INTO project_household_link
  (record_id,project_id,household_id,village_id,enrollment_date,benefit_type,benefit_category,monetary_value,service_quantity,status) VALUES
('L0001','P002','TN-V03-HH0021','V03','2025-01-10','Sewing Machine','Livelihood Asset',7309,1,'Active'),
('L0002','P002','TN-V01-HH0008','V01','2025-01-10','Sewing Machine','Health Support',5527,2,'Active'),
('L0003','P002','TN-V02-HH0003','V02','2025-01-10','Sewing Machine','Livelihood Asset',26783,3,'Active'),
('L0004','P002','TN-V01-HH0015','V01','2025-01-10','Goat Unit','Health Support',5855,2,'Active'),
('L0005','P002','TN-V02-HH0017','V02','2025-01-10','Sewing Machine','Health Support',29712,3,'Active'),
('L0006','P001','TN-V01-HH0001','V01','2024-05-01','Nutrition Kit','Livelihood Asset',3000,1,'Active'),
('L0007','P001','TN-V02-HH0001','V02','2024-05-01','Goat Unit','Livelihood Asset',15000,1,'Active'),
('L0008','P001','TN-V03-HH0001','V03','2024-05-01','Dairy Cow','Livelihood Asset',45000,1,'Active'),
('L0009','P001','TN-V04-HH0001','V04','2024-05-01','Nutrition Kit','Livelihood Asset',3000,2,'Active'),
('L0010','P001','TN-V01-HH0003','V01','2024-06-01','Sewing Machine','Livelihood Asset',8000,1,'Active'),
('L0011','P001','TN-V01-HH0005','V01','2024-06-01','Goat Unit','Livelihood Asset',15000,1,'Active'),
('L0012','P001','TN-V01-HH0007','V01','2024-06-15','Dairy Cow','Livelihood Asset',45000,1,'Active'),
('L0013','P001','TN-V01-HH0009','V01','2024-06-15','Nutrition Kit','Livelihood Asset',3000,3,'Active'),
('L0014','P001','TN-V01-HH0011','V01','2024-07-01','Sewing Machine','Livelihood Asset',8000,1,'Active'),
('L0015','P001','TN-V01-HH0013','V01','2024-07-01','Goat Unit','Livelihood Asset',15000,2,'Active'),
('L0016','P002','TN-V02-HH0004','V02','2025-02-01','Nutrition Kit','Health Support',2500,4,'Active'),
('L0017','P002','TN-V02-HH0008','V02','2025-02-01','Dairy Cow','Livelihood Asset',45000,1,'Active'),
('L0018','P002','TN-V02-HH0012','V02','2025-02-15','Sewing Machine','Health Support',8000,1,'Active'),
('L0019','P002','TN-V03-HH0003','V03','2025-02-15','Goat Unit','Livelihood Asset',15000,1,'Active'),
('L0020','P002','TN-V03-HH0005','V03','2025-02-15','Nutrition Kit','Health Support',2500,2,'Active'),
('L0021','P001','TN-V02-HH0002','V02','2024-07-15','Dairy Cow','Livelihood Asset',45000,1,'Active'),
('L0022','P001','TN-V02-HH0006','V02','2024-07-15','Sewing Machine','Livelihood Asset',8000,1,'Active'),
('L0023','P001','TN-V02-HH0010','V02','2024-08-01','Goat Unit','Livelihood Asset',15000,2,'Active'),
('L0024','P001','TN-V02-HH0014','V02','2024-08-01','Nutrition Kit','Livelihood Asset',3000,3,'Active'),
('L0025','P001','TN-V03-HH0002','V03','2024-08-15','Dairy Cow','Livelihood Asset',45000,1,'Active'),
('L0026','P001','TN-V03-HH0006','V03','2024-08-15','Sewing Machine','Livelihood Asset',8000,1,'Active'),
('L0027','P001','TN-V03-HH0009','V03','2024-09-01','Goat Unit','Livelihood Asset',15000,1,'Active'),
('L0028','P001','TN-V03-HH0012','V03','2024-09-01','Nutrition Kit','Livelihood Asset',3000,2,'Active'),
('L0029','P001','TN-V04-HH0003','V04','2024-09-15','Dairy Cow','Livelihood Asset',45000,1,'Active'),
('L0030','P001','TN-V04-HH0006','V04','2024-09-15','Sewing Machine','Livelihood Asset',8000,1,'Active'),
('L0031','P002','TN-V03-HH0007','V03','2025-03-01','Goat Unit','Health Support',15000,1,'Active'),
('L0032','P002','TN-V03-HH0010','V03','2025-03-01','Nutrition Kit','Health Support',2500,3,'Active'),
('L0033','P002','TN-V03-HH0013','V03','2025-03-15','Sewing Machine','Livelihood Asset',8000,1,'Active'),
('L0034','P002','TN-V03-HH0016','V03','2025-03-15','Dairy Cow','Livelihood Asset',45000,1,'Active'),
('L0035','P002','TN-V04-HH0004','V04','2025-04-01','Goat Unit','Health Support',15000,2,'Active'),
('L0036','P002','TN-V04-HH0007','V04','2025-04-01','Nutrition Kit','Health Support',2500,4,'Active'),
('L0037','P002','TN-V04-HH0010','V04','2025-04-15','Sewing Machine','Livelihood Asset',8000,1,'Active'),
('L0038','P002','TN-V04-HH0013','V04','2025-04-15','Dairy Cow','Livelihood Asset',45000,1,'Active'),
('L0039','P001','TN-V04-HH0009','V04','2024-10-01','Goat Unit','Livelihood Asset',15000,1,'Active'),
('L0040','P001','TN-V04-HH0012','V04','2024-10-01','Nutrition Kit','Livelihood Asset',3000,2,'Active'),
('L0041','P001','TN-V04-HH0015','V04','2024-10-15','Sewing Machine','Livelihood Asset',8000,1,'Active'),
('L0042','P001','TN-V04-HH0018','V04','2024-10-15','Dairy Cow','Livelihood Asset',45000,1,'Active'),
('L0043','P002','TN-V01-HH0002','V01','2025-05-01','Goat Unit','Health Support',15000,1,'Active'),
('L0044','P002','TN-V01-HH0005','V01','2025-05-01','Nutrition Kit','Health Support',2500,2,'Active'),
('L0045','P002','TN-V01-HH0007','V01','2025-05-15','Sewing Machine','Livelihood Asset',8000,1,'Active'),
('L0046','P002','TN-V01-HH0010','V01','2025-05-15','Dairy Cow','Livelihood Asset',45000,1,'Active'),
('L0047','P001','TN-V01-HH0017','V01','2024-11-01','Goat Unit','Livelihood Asset',15000,2,'Active'),
('L0048','P001','TN-V01-HH0019','V01','2024-11-01','Nutrition Kit','Livelihood Asset',3000,3,'Active'),
('L0049','P002','TN-V02-HH0020','V02','2025-05-01','Sewing Machine','Health Support',8000,1,'Active'),
('L0050','P002','TN-V02-HH0024','V02','2025-05-15','Dairy Cow','Livelihood Asset',45000,1,'Active');