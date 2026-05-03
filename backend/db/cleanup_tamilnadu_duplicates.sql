-- ═══════════════════════════════════════════════════════════════════════════════
-- Tamil Nadu Data Cleanup - Remove Old Duplicate Districts
-- ═══════════════════════════════════════════════════════════════════════════════

USE mis_hits;

-- WARNING: This script removes old duplicate district entries
-- It keeps the new 3-digit format (TN001-TN038) and removes old 2-digit format (TN01-TN04)

-- First, update any blocks that reference old district IDs to new IDs

-- Update blocks from old Chennai (TN01) to new Chennai (TN003)
UPDATE block_master SET district_id = 'TN003' WHERE district_id = 'TN01';

-- Update blocks from old Kanchipuram (TN02) to new Kanchipuram (TN010)
UPDATE block_master SET district_id = 'TN010' WHERE district_id = 'TN02';

-- Update blocks from old Tiruvallur (TN03) to new Tiruvallur (TN033)
UPDATE block_master SET district_id = 'TN033' WHERE district_id = 'TN03';

-- Update blocks from old Coimbatore (TN04) to new Coimbatore (TN004)
UPDATE block_master SET district_id = 'TN004' WHERE district_id = 'TN04';

-- Now delete the old duplicate district entries
DELETE FROM district_master WHERE district_id IN ('TN01', 'TN02', 'TN03', 'TN04');

-- Verification
SELECT '========================================' AS '';
SELECT 'CLEANUP COMPLETE' AS '';
SELECT '========================================' AS '';
SELECT '' AS '';

SELECT 'Tamil Nadu Districts After Cleanup:' AS '';
SELECT COUNT(*) as total_districts 
FROM district_master 
WHERE state_id = 1;

SELECT '' AS '';
SELECT 'All Tamil Nadu Districts (should be 38):' AS '';
SELECT district_id, district_name 
FROM district_master 
WHERE state_id = 1 
ORDER BY district_name;
