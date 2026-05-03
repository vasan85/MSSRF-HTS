-- ═══════════════════════════════════════════════════════════════════════════════
-- Tamil Nadu Villages - Comprehensive Update
-- Adds villages for all blocks to ensure complete cascading dropdown functionality
-- ═══════════════════════════════════════════════════════════════════════════════

USE mis_hits;

-- ═══════════════════════════════════════════════════════════════════════════════
-- Chennai District - Additional Villages
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO village_master (village_id, village_name, block_id, population, total_households, active) VALUES
-- Alandur Block
('V601', 'Alandur', 'TN003B005', 42000, 9800, 1),
('V602', 'St.Thomas Mount', 'TN003B005', 35000, 8200, 1),
('V603', 'Pallavaram', 'TN003B005', 45000, 10500, 1),

-- Maduravoyal Block
('V604', 'Maduravoyal', 'TN003B004', 38000, 8900, 1),
('V605', 'Koyambedu', 'TN003B004', 52000, 12100, 1),

-- Perungudi Block
('V606', 'Perungudi', 'BL107', 48000, 11200, 1),
('V607', 'Thoraipakkam', 'BL107', 55000, 12800, 1)
ON DUPLICATE KEY UPDATE village_name = VALUES(village_name);

-- ═══════════════════════════════════════════════════════════════════════════════
-- Coimbatore District - Additional Villages
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO village_master (village_id, village_name, block_id, population, total_households, active) VALUES
-- Coimbatore South Block
('V608', 'Singanallur', 'TN004B002', 65000, 15200, 1),
('V609', 'Peelamedu', 'TN004B002', 58000, 13500, 1),

-- Sulur Block
('V610', 'Sulur', 'TN004B005', 32000, 7500, 1),
('V611', 'Kannampalayam', 'TN004B005', 28000, 6600, 1),

-- Valparai Block
('V612', 'Valparai', 'BL207', 22000, 5200, 1),
('V613', 'Sholayar', 'BL207', 8000, 1900, 1),

-- Coimbatore Block (old ID)
('V614', 'Ukkadam', 'BL005', 45000, 10500, 1)
ON DUPLICATE KEY UPDATE village_name = VALUES(village_name);

-- ═══════════════════════════════════════════════════════════════════════════════
-- Cuddalore District Villages
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO village_master (village_id, village_name, block_id, population, total_households, active) VALUES
('V701', 'Cuddalore', 'BL1501', 173000, 40300, 1),
('V702', 'Devanampattinam', 'BL1501', 12000, 2800, 1),

('V703', 'Chidambaram', 'BL1502', 62000, 14500, 1),
('V704', 'Sirkali', 'BL1502', 35000, 8200, 1),

('V705', 'Virudhachalam', 'BL1503', 73000, 17000, 1),
('V706', 'Neyveli', 'BL1503', 150000, 35000, 1),

('V707', 'Panruti', 'BL1504', 55000, 12800, 1),
('V708', 'Vriddhachalam', 'BL1504', 28000, 6500, 1)
ON DUPLICATE KEY UPDATE village_name = VALUES(village_name);

-- ═══════════════════════════════════════════════════════════════════════════════
-- Dharmapuri District - Additional Villages
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO village_master (village_id, village_name, block_id, population, total_households, active) VALUES
('V801', 'Pappireddipatti', 'TN006B005', 35000, 8200, 1),
('V802', 'Karimangalam', 'TN006B005', 28000, 6500, 1)
ON DUPLICATE KEY UPDATE village_name = VALUES(village_name);

-- ═══════════════════════════════════════════════════════════════════════════════
-- Dindigul District Villages
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO village_master (village_id, village_name, block_id, population, total_households, active) VALUES
('V901', 'Dindigul', 'BL1201', 207000, 48300, 1),
('V902', 'Chinnalapatti', 'BL1201', 32000, 7500, 1),

('V903', 'Palani', 'BL1202', 71000, 16500, 1),
('V904', 'Oddanchatram', 'BL1202', 45000, 10500, 1),

('V905', 'Kodaikanal', 'BL1203', 36000, 8400, 1),
('V906', 'Thandikudi', 'BL1203', 15000, 3500, 1),

('V907', 'Natham', 'BL1204', 28000, 6500, 1),
('V908', 'Nilakottai', 'BL1205', 42000, 9800, 1)
ON DUPLICATE KEY UPDATE village_name = VALUES(village_name);

-- ═══════════════════════════════════════════════════════════════════════════════
-- Erode District Villages
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO village_master (village_id, village_name, block_id, population, total_households, active) VALUES
('V1001', 'Erode', 'TN008B001', 498000, 116000, 1),
('V1002', 'Modakurichi', 'TN008B001', 35000, 8200, 1),

('V1003', 'Gobichettipalayam', 'TN008B002', 73000, 17000, 1),
('V1004', 'Nambiyur', 'TN008B002', 28000, 6500, 1),

('V1005', 'Perundurai', 'TN008B003', 45000, 10500, 1),
('V1006', 'Vijayamangalam', 'TN008B003', 32000, 7500, 1),

('V1007', 'Bhavani', 'TN008B004', 72000, 16800, 1),
('V1008', 'Anthiyur', 'TN008B004', 38000, 8900, 1),

('V1009', 'Sathyamangalam', 'TN008B005', 36000, 8400, 1),
('V1010', 'Thalavadi', 'TN008B005', 22000, 5100, 1)
ON DUPLICATE KEY UPDATE village_name = VALUES(village_name);

-- ═══════════════════════════════════════════════════════════════════════════════
-- Krishnagiri District - Additional Villages
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO village_master (village_id, village_name, block_id, population, total_households, active) VALUES
('V1101', 'Pochampalli', 'TN013B004', 25000, 5800, 1),
('V1102', 'Mathur', 'TN013B004', 18000, 4200, 1)
ON DUPLICATE KEY UPDATE village_name = VALUES(village_name);

-- ═══════════════════════════════════════════════════════════════════════════════
-- Madurai District Villages
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO village_master (village_id, village_name, block_id, population, total_households, active) VALUES
('V1201', 'Tallakulam', 'TN014B001', 85000, 19800, 1),
('V1202', 'Avaniyapuram', 'TN014B001', 52000, 12100, 1),

('V1203', 'Thiruppalai', 'TN014B002', 48000, 11200, 1),
('V1204', 'Jaihindpuram', 'TN014B002', 42000, 9800, 1),

('V1205', 'Anaiyur', 'TN014B003', 38000, 8900, 1),
('V1206', 'Thiruparankundram', 'TN014B003', 55000, 12800, 1),

('V1207', 'Vilangudi', 'TN014B004', 35000, 8200, 1),
('V1208', 'Paravai', 'TN014B004', 42000, 9800, 1),

('V1209', 'Melur', 'TN014B005', 62000, 14500, 1),
('V1210', 'Vadipatti', 'TN014B005', 48000, 11200, 1),

('V1211', 'Tirumangalam', 'BL307', 58000, 13500, 1),

('V1212', 'Usilampatti', 'TN014B006', 68000, 15800, 1)
ON DUPLICATE KEY UPDATE village_name = VALUES(village_name);

-- ═══════════════════════════════════════════════════════════════════════════════
-- Salem District - Additional Villages
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO village_master (village_id, village_name, block_id, population, total_households, active) VALUES
('V1301', 'Ammapet', 'TN023B002', 45000, 10500, 1),
('V1302', 'Kondalampatti', 'TN023B002', 38000, 8900, 1),

('V1303', 'Omalur', 'BL406', 52000, 12100, 1),
('V1304', 'Mecheri', 'BL406', 35000, 8200, 1)
ON DUPLICATE KEY UPDATE village_name = VALUES(village_name);

-- ═══════════════════════════════════════════════════════════════════════════════
-- Thanjavur District Villages
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO village_master (village_id, village_name, block_id, population, total_households, active) VALUES
('V1401', 'Thanjavur', 'BL1301', 222000, 51800, 1),
('V1402', 'Vallam', 'BL1301', 35000, 8200, 1),

('V1403', 'Kumbakonam', 'BL1302', 140000, 32600, 1),
('V1404', 'Darasuram', 'BL1302', 28000, 6500, 1),

('V1405', 'Pattukkottai', 'BL1303', 72000, 16800, 1),
('V1406', 'Peravurani', 'BL1303', 42000, 9800, 1),

('V1407', 'Papanasam', 'BL1304', 52000, 12100, 1),
('V1408', 'Thiruvaiyaru', 'BL1304', 38000, 8900, 1)
ON DUPLICATE KEY UPDATE village_name = VALUES(village_name);

-- ═══════════════════════════════════════════════════════════════════════════════
-- Tiruchirappalli District Villages
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO village_master (village_id, village_name, block_id, population, total_households, active) VALUES
('V1501', 'Woraiyur', 'BL1401', 95000, 22100, 1),
('V1502', 'Ariyamangalam', 'BL1401', 68000, 15800, 1),

('V1503', 'Khajamalai', 'BL1402', 72000, 16800, 1),
('V1504', 'Golden Rock', 'BL1402', 85000, 19800, 1),

('V1505', 'Srirangam', 'BL1403', 75000, 17500, 1),
('V1506', 'Thiruvanaikoil', 'BL1403', 52000, 12100, 1),

('V1507', 'Lalgudi', 'BL1404', 58000, 13500, 1),
('V1508', 'Pullambadi', 'BL1404', 32000, 7500, 1),

('V1509', 'Manapparai', 'BL1405', 68000, 15800, 1),
('V1510', 'Musiri', 'BL1405', 42000, 9800, 1)
ON DUPLICATE KEY UPDATE village_name = VALUES(village_name);

-- ═══════════════════════════════════════════════════════════════════════════════
-- Tiruppur District Villages
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO village_master (village_id, village_name, block_id, population, total_households, active) VALUES
('V1601', 'Tiruppur North', 'TN032B001', 120000, 28000, 1),
('V1602', 'Veerapandi', 'TN032B001', 42000, 9800, 1),

('V1603', 'Tiruppur South', 'TN032B002', 95000, 22100, 1),
('V1604', 'Nallur', 'TN032B002', 38000, 8900, 1),

('V1605', 'Udumalpet', 'TN032B003', 75000, 17500, 1),
('V1606', 'Gopichettipalayam', 'TN032B003', 45000, 10500, 1),

('V1607', 'Dharapuram', 'TN032B004', 68000, 15800, 1),
('V1608', 'Vellakoil', 'TN032B004', 42000, 9800, 1),

('V1609', 'Kangeyam', 'TN032B005', 58000, 13500, 1),
('V1610', 'Perundurai', 'TN032B005', 35000, 8200, 1)
ON DUPLICATE KEY UPDATE village_name = VALUES(village_name);

-- ═══════════════════════════════════════════════════════════════════════════════
-- Tiruvallur District Villages
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO village_master (village_id, village_name, block_id, population, total_households, active) VALUES
('V1701', 'Tiruttani', 'BL004', 62000, 14500, 1),
('V1702', 'Arakkonam', 'BL004', 78000, 18200, 1)
ON DUPLICATE KEY UPDATE village_name = VALUES(village_name);

-- ═══════════════════════════════════════════════════════════════════════════════
-- Tiruvannamalai District Villages
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO village_master (village_id, village_name, block_id, population, total_households, active) VALUES
('V1801', 'Tiruvannamalai', 'TN034B001', 145000, 33800, 1),
('V1802', 'Kilpennathur', 'TN034B001', 38000, 8900, 1),

('V1803', 'Chengam', 'TN034B002', 58000, 13500, 1),
('V1804', 'Pudupalayam', 'TN034B002', 32000, 7500, 1),

('V1805', 'Polur', 'TN034B003', 48000, 11200, 1),
('V1806', 'Kalasapakkam', 'TN034B003', 28000, 6500, 1),

('V1807', 'Arani', 'TN034B004', 75000, 17500, 1),
('V1808', 'Chetpet', 'TN034B004', 42000, 9800, 1),

('V1809', 'Cheyyar', 'TN034B005', 62000, 14500, 1),
('V1810', 'Vandavasi', 'TN034B005', 52000, 12100, 1)
ON DUPLICATE KEY UPDATE village_name = VALUES(village_name);

-- ═══════════════════════════════════════════════════════════════════════════════
-- Vellore District Villages
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO village_master (village_id, village_name, block_id, population, total_households, active) VALUES
('V1901', 'Vellore Fort', 'TN036B001', 185000, 43100, 1),
('V1902', 'Sathuvachari', 'TN036B001', 95000, 22100, 1),

('V1903', 'Gudiyatham', 'TN036B002', 82000, 19100, 1),
('V1904', 'Ambur', 'TN036B002', 105000, 24500, 1),

('V1905', 'Katpadi', 'TN036B003', 92000, 21400, 1),
('V1906', 'Ranipet', 'TN036B003', 68000, 15800, 1),

('V1907', 'Anaicut', 'TN036B004', 48000, 11200, 1),
('V1908', 'Sholinghur', 'TN036B004', 62000, 14500, 1)
ON DUPLICATE KEY UPDATE village_name = VALUES(village_name);

-- ═══════════════════════════════════════════════════════════════════════════════
-- Viluppuram District Villages
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO village_master (village_id, village_name, block_id, population, total_households, active) VALUES
('V2001', 'Viluppuram', 'BL1101', 98000, 22800, 1),
('V2002', 'Vikravandi', 'BL1101', 52000, 12100, 1),

('V2003', 'Tindivanam', 'BL1102', 78000, 18200, 1),
('V2004', 'Mailam', 'BL1102', 42000, 9800, 1),

('V2005', 'Gingee', 'BL1103', 68000, 15800, 1),
('V2006', 'Melmalaiyanur', 'BL1103', 35000, 8200, 1),

('V2007', 'Vikravandi Town', 'BL1104', 55000, 12800, 1),
('V2008', 'Koliyanur', 'BL1104', 38000, 8900, 1)
ON DUPLICATE KEY UPDATE village_name = VALUES(village_name);

-- ═══════════════════════════════════════════════════════════════════════════════
-- Kancheepuram District Villages
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO village_master (village_id, village_name, block_id, population, total_households, active) VALUES
('V2101', 'Sriperumbudur', 'BL003', 58000, 13500, 1),
('V2102', 'Padappai', 'BL003', 42000, 9800, 1)
ON DUPLICATE KEY UPDATE village_name = VALUES(village_name);

-- ═══════════════════════════════════════════════════════════════════════════════
-- VERIFICATION
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT '========================================' AS '';
SELECT 'VILLAGE DATA UPDATE COMPLETE' AS '';
SELECT '========================================' AS '';
SELECT '' AS '';

SELECT 'Total Villages Added/Updated:' AS '';
SELECT COUNT(*) as total_villages FROM village_master;

SELECT '' AS '';
SELECT 'Villages by District:' AS '';
SELECT d.district_name, COUNT(v.village_id) as village_count
FROM district_master d
LEFT JOIN block_master b ON d.district_id = b.district_id
LEFT JOIN village_master v ON b.block_id = v.block_id
WHERE d.state_id = 1
GROUP BY d.district_id, d.district_name
HAVING village_count > 0
ORDER BY d.district_name;

SELECT '' AS '';
SELECT 'Blocks Without Villages:' AS '';
SELECT d.district_name, b.block_name
FROM block_master b
JOIN district_master d ON b.district_id = d.district_id
LEFT JOIN village_master v ON b.block_id = v.block_id
WHERE d.state_id = 1 AND v.village_id IS NULL
ORDER BY d.district_name, b.block_name;

SELECT '' AS '';
SELECT 'Total Coverage:' AS '';
SELECT 
    (SELECT COUNT(*) FROM block_master WHERE district_id IN (SELECT district_id FROM district_master WHERE state_id = 1)) as total_blocks,
    (SELECT COUNT(DISTINCT block_id) FROM village_master WHERE block_id IN (SELECT block_id FROM block_master WHERE district_id IN (SELECT district_id FROM district_master WHERE state_id = 1))) as blocks_with_villages,
    ROUND(((SELECT COUNT(DISTINCT block_id) FROM village_master WHERE block_id IN (SELECT block_id FROM block_master WHERE district_id IN (SELECT district_id FROM district_master WHERE state_id = 1))) * 100.0 / (SELECT COUNT(*) FROM block_master WHERE district_id IN (SELECT district_id FROM district_master WHERE state_id = 1))), 2) as coverage_percentage;
