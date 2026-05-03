-- ═══════════════════════════════════════════════════════════════════════════════
-- Tamil Nadu Administrative Divisions - Complete Update
-- Follows existing ID pattern: Districts=TN###, Blocks=BL###, Villages=V###
-- ═══════════════════════════════════════════════════════════════════════════════

USE mis_hits;

-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 1: Insert/Update all 38 Districts of Tamil Nadu (alphabetically sorted)
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO district_master (district_id, district_name, state_id) VALUES
('TN001', 'Ariyalur', 1),
('TN002', 'Chengalpattu', 1),
('TN003', 'Chennai', 1),
('TN004', 'Coimbatore', 1),
('TN005', 'Cuddalore', 1),
('TN006', 'Dharmapuri', 1),
('TN007', 'Dindigul', 1),
('TN008', 'Erode', 1),
('TN009', 'Kallakurichi', 1),
('TN010', 'Kancheepuram', 1),
('TN011', 'Kanyakumari', 1),
('TN012', 'Karur', 1),
('TN013', 'Krishnagiri', 1),
('TN014', 'Madurai', 1),
('TN015', 'Mayiladuthurai', 1),
('TN016', 'Nagapattinam', 1),
('TN017', 'Namakkal', 1),
('TN018', 'Nilgiris', 1),
('TN019', 'Perambalur', 1),
('TN020', 'Pudukkottai', 1),
('TN021', 'Ramanathapuram', 1),
('TN022', 'Ranipet', 1),
('TN023', 'Salem', 1),
('TN024', 'Sivagangai', 1),
('TN025', 'Tenkasi', 1),
('TN026', 'Thanjavur', 1),
('TN027', 'Theni', 1),
('TN028', 'Thoothukudi', 1),
('TN029', 'Tiruchirappalli', 1),
('TN030', 'Tirunelveli', 1),
('TN031', 'Tirupathur', 1),
('TN032', 'Tiruppur', 1),
('TN033', 'Tiruvallur', 1),
('TN034', 'Tiruvannamalai', 1),
('TN035', 'Tiruvarur', 1),
('TN036', 'Vellore', 1),
('TN037', 'Viluppuram', 1),
('TN038', 'Virudhunagar', 1)
ON DUPLICATE KEY UPDATE district_name = VALUES(district_name);

-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 2: Insert Blocks/Taluks for major districts
-- ═══════════════════════════════════════════════════════════════════════════════

-- Chennai District Blocks
INSERT INTO block_master (block_id, block_name, district_id) VALUES
('BL101', 'Madhavaram', 'TN003'),
('BL102', 'Thiruvottriyur', 'TN003'),
('BL103', 'Ambattur', 'TN003'),
('BL104', 'Maduravoyal', 'TN003'),
('BL105', 'Alandur', 'TN003'),
('BL106', 'Sholinganallur', 'TN003'),
('BL107', 'Perungudi', 'TN003')
ON DUPLICATE KEY UPDATE block_name = VALUES(block_name);

-- Coimbatore District Blocks
INSERT INTO block_master (block_id, block_name, district_id) VALUES
('BL201', 'Coimbatore North', 'TN004'),
('BL202', 'Coimbatore South', 'TN004'),
('BL203', 'Pollachi', 'TN004'),
('BL204', 'Mettupalayam', 'TN004'),
('BL205', 'Sulur', 'TN004'),
('BL206', 'Anaimalai', 'TN004'),
('BL207', 'Valparai', 'TN004')
ON DUPLICATE KEY UPDATE block_name = VALUES(block_name);

-- Madurai District Blocks
INSERT INTO block_master (block_id, block_name, district_id) VALUES
('BL301', 'Madurai East', 'TN014'),
('BL302', 'Madurai North', 'TN014'),
('BL303', 'Madurai South', 'TN014'),
('BL304', 'Madurai West', 'TN014'),
('BL305', 'Melur', 'TN014'),
('BL306', 'Usilampatti', 'TN014'),
('BL307', 'Tirumangalam', 'TN014')
ON DUPLICATE KEY UPDATE block_name = VALUES(block_name);

-- Salem District Blocks
INSERT INTO block_master (block_id, block_name, district_id) VALUES
('BL401', 'Salem', 'TN023'),
('BL402', 'Salem West', 'TN023'),
('BL403', 'Attur', 'TN023'),
('BL404', 'Mettur', 'TN023'),
('BL405', 'Sankagiri', 'TN023'),
('BL406', 'Omalur', 'TN023'),
('BL407', 'Yercaud', 'TN023')
ON DUPLICATE KEY UPDATE block_name = VALUES(block_name);

-- Dharmapuri District Blocks
INSERT INTO block_master (block_id, block_name, district_id) VALUES
('BL501', 'Dharmapuri', 'TN006'),
('BL502', 'Harur', 'TN006'),
('BL503', 'Palacode', 'TN006'),
('BL504', 'Pennagaram', 'TN006'),
('BL505', 'Pappireddipatti', 'TN006')
ON DUPLICATE KEY UPDATE block_name = VALUES(block_name);

-- Krishnagiri District Blocks
INSERT INTO block_master (block_id, block_name, district_id) VALUES
('BL601', 'Krishnagiri', 'TN013'),
('BL602', 'Hosur', 'TN013'),
('BL603', 'Denkanikottai', 'TN013'),
('BL604', 'Pochampalli', 'TN013'),
('BL605', 'Uthangarai', 'TN013'),
('BL606', 'Bargur', 'TN013')
ON DUPLICATE KEY UPDATE block_name = VALUES(block_name);

-- Erode District Blocks
INSERT INTO block_master (block_id, block_name, district_id) VALUES
('BL701', 'Erode', 'TN008'),
('BL702', 'Gobichettipalayam', 'TN008'),
('BL703', 'Perundurai', 'TN008'),
('BL704', 'Bhavani', 'TN008'),
('BL705', 'Sathyamangalam', 'TN008')
ON DUPLICATE KEY UPDATE block_name = VALUES(block_name);

-- Tiruppur District Blocks
INSERT INTO block_master (block_id, block_name, district_id) VALUES
('BL801', 'Tiruppur North', 'TN032'),
('BL802', 'Tiruppur South', 'TN032'),
('BL803', 'Udumalpet', 'TN032'),
('BL804', 'Dharapuram', 'TN032'),
('BL805', 'Kangeyam', 'TN032')
ON DUPLICATE KEY UPDATE block_name = VALUES(block_name);

-- Vellore District Blocks
INSERT INTO block_master (block_id, block_name, district_id) VALUES
('BL901', 'Vellore', 'TN036'),
('BL902', 'Gudiyatham', 'TN036'),
('BL903', 'Katpadi', 'TN036'),
('BL904', 'Anaicut', 'TN036')
ON DUPLICATE KEY UPDATE block_name = VALUES(block_name);

-- Tiruvannamalai District Blocks
INSERT INTO block_master (block_id, block_name, district_id) VALUES
('BL1001', 'Tiruvannamalai', 'TN034'),
('BL1002', 'Chengam', 'TN034'),
('BL1003', 'Polur', 'TN034'),
('BL1004', 'Arani', 'TN034'),
('BL1005', 'Cheyyar', 'TN034')
ON DUPLICATE KEY UPDATE block_name = VALUES(block_name);

-- Viluppuram District Blocks
INSERT INTO block_master (block_id, block_name, district_id) VALUES
('BL1101', 'Viluppuram', 'TN037'),
('BL1102', 'Tindivanam', 'TN037'),
('BL1103', 'Gingee', 'TN037'),
('BL1104', 'Vikravandi', 'TN037')
ON DUPLICATE KEY UPDATE block_name = VALUES(block_name);

-- Dindigul District Blocks
INSERT INTO block_master (block_id, block_name, district_id) VALUES
('BL1201', 'Dindigul', 'TN007'),
('BL1202', 'Palani', 'TN007'),
('BL1203', 'Kodaikanal', 'TN007'),
('BL1204', 'Natham', 'TN007'),
('BL1205', 'Vedasandur', 'TN007')
ON DUPLICATE KEY UPDATE block_name = VALUES(block_name);

-- Thanjavur District Blocks
INSERT INTO block_master (block_id, block_name, district_id) VALUES
('BL1301', 'Thanjavur', 'TN026'),
('BL1302', 'Kumbakonam', 'TN026'),
('BL1303', 'Pattukkottai', 'TN026'),
('BL1304', 'Papanasam', 'TN026')
ON DUPLICATE KEY UPDATE block_name = VALUES(block_name);

-- Tiruchirappalli District Blocks
INSERT INTO block_master (block_id, block_name, district_id) VALUES
('BL1401', 'Tiruchirappalli East', 'TN029'),
('BL1402', 'Tiruchirappalli West', 'TN029'),
('BL1403', 'Srirangam', 'TN029'),
('BL1404', 'Lalgudi', 'TN029'),
('BL1405', 'Manapparai', 'TN029')
ON DUPLICATE KEY UPDATE block_name = VALUES(block_name);

-- Cuddalore District Blocks
INSERT INTO block_master (block_id, block_name, district_id) VALUES
('BL1501', 'Cuddalore', 'TN005'),
('BL1502', 'Chidambaram', 'TN005'),
('BL1503', 'Virudhachalam', 'TN005'),
('BL1504', 'Panruti', 'TN005')
ON DUPLICATE KEY UPDATE block_name = VALUES(block_name);

-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 3: Sample Villages for Testing
-- ═══════════════════════════════════════════════════════════════════════════════

-- Sample villages for Chennai district
INSERT INTO village_master (village_id, village_name, block_id, population, total_households, active) VALUES
('V101', 'Madhavaram', 'BL101', 35000, 8000, 1),
('V102', 'Redhills', 'BL101', 28000, 6500, 1),
('V103', 'Thiruvottriyur', 'BL102', 45000, 10000, 1),
('V104', 'Ennore', 'BL102', 32000, 7500, 1),
('V105', 'Ambattur', 'BL103', 50000, 12000, 1),
('V106', 'Avadi', 'BL103', 42000, 9500, 1)
ON DUPLICATE KEY UPDATE village_name = VALUES(village_name);

-- Sample villages for Dharmapuri district  
INSERT INTO village_master (village_id, village_name, block_id, population, total_households, active) VALUES
('V201', 'Dharmapuri Town', 'BL501', 38000, 9000, 1),
('V202', 'Morappur', 'BL501', 15000, 3500, 1),
('V203', 'Harur', 'BL502', 22000, 5200, 1),
('V204', 'Palacode', 'BL503', 28000, 6800, 1),
('V205', 'Pennagaram', 'BL504', 25000, 6000, 1)
ON DUPLICATE KEY UPDATE village_name = VALUES(village_name);

-- Sample villages for Krishnagiri district
INSERT INTO village_master (village_id, village_name, block_id, population, total_households, active) VALUES
('V301', 'Krishnagiri', 'BL601', 45000, 10500, 1),
('V302', 'Hosur', 'BL602', 120000, 28000, 1),
('V303', 'Denkanikottai', 'BL603', 18000, 4200, 1),
('V304', 'Uthangarai', 'BL605', 22000, 5100, 1),
('V305', 'Bargur', 'BL606', 12000, 2800, 1)
ON DUPLICATE KEY UPDATE village_name = VALUES(village_name);

-- Sample villages for Salem district
INSERT INTO village_master (village_id, village_name, block_id, population, total_households, active) VALUES
('V401', 'Salem City', 'BL401', 850000, 210000, 1),
('V402', 'Attur', 'BL403', 65000, 15500, 1),
('V403', 'Mettur', 'BL404', 55000, 13000, 1),
('V404', 'Yercaud', 'BL407', 32000, 7500, 1),
('V405', 'Sankagiri', 'BL405', 38000, 9000, 1)
ON DUPLICATE KEY UPDATE village_name = VALUES(village_name);

-- Sample villages for Coimbatore district
INSERT INTO village_master (village_id, village_name, block_id, population, total_households, active) VALUES
('V501', 'Gandhipuram', 'BL201', 95000, 22000, 1),
('V502', 'RS Puram', 'BL201', 75000, 18000, 1),
('V503', 'Pollachi', 'BL203', 90000, 21000, 1),
('V504', 'Mettupalayam', 'BL204', 70000, 16500, 1),
('V505', 'Anaimalai', 'BL206', 22000, 5200, 1)
ON DUPLICATE KEY UPDATE village_name = VALUES(village_name);

-- ═══════════════════════════════════════════════════════════════════════════════
-- VERIFICATION QUERIES
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT '========================================' AS '';
SELECT 'TAMIL NADU DATA UPDATE COMPLETE' AS '';
SELECT '========================================' AS '';
SELECT '' AS '';

SELECT 'State:' AS 'Summary', state_name AS 'Value' 
FROM state_master WHERE id = 1;

SELECT 'Districts:' AS 'Summary', COUNT(*) AS 'Total' 
FROM district_master WHERE state_id = 1;

SELECT 'Blocks/Taluks:' AS 'Summary', COUNT(*) AS 'Total' 
FROM block_master WHERE district_id IN (SELECT district_id FROM district_master WHERE state_id = 1);

SELECT 'Villages:' AS 'Summary', COUNT(*) AS 'Total' 
FROM village_master WHERE block_id IN (SELECT block_id FROM block_master WHERE district_id IN (SELECT district_id FROM district_master WHERE state_id = 1));

SELECT '' AS '';
SELECT '========================================' AS '';
SELECT 'All 38 Tamil Nadu Districts:' AS '';
SELECT '========================================' AS '';
SELECT district_id, district_name 
FROM district_master 
WHERE state_id = 1 
ORDER BY district_name;

SELECT '' AS '';
SELECT '========================================' AS '';
SELECT 'Sample Blocks by District:' AS '';
SELECT '========================================' AS '';
SELECT d.district_name, COUNT(b.block_id) as block_count
FROM district_master d
LEFT JOIN block_master b ON d.district_id = b.district_id
WHERE d.state_id = 1
GROUP BY d.district_id, d.district_name
HAVING block_count > 0
ORDER BY d.district_name;
