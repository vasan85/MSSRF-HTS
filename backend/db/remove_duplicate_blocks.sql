-- ═══════════════════════════════════════════════════════════════════════════════
-- Remove Duplicate Blocks - Keep Latest Entry for Each Block Name + District
-- ═══════════════════════════════════════════════════════════════════════════════

USE mis_hits;

-- Strategy: For each duplicate block (same name + district), keep the one with 
-- the highest block_id (most recent) and delete older duplicates

-- First, update village_master to reference the block we're keeping
-- This prevents foreign key constraint failures

-- Step 1: Create temporary table with blocks to keep (max block_id for each name+district)
CREATE TEMPORARY TABLE blocks_to_keep AS
SELECT MAX(block_id) as keep_block_id, block_name, district_id
FROM block_master
GROUP BY block_name, district_id
HAVING COUNT(*) > 1;

-- Step 2: Create temporary table with blocks to delete
CREATE TEMPORARY TABLE blocks_to_delete AS
SELECT bm.block_id
FROM block_master bm
INNER JOIN blocks_to_keep btk 
    ON bm.block_name = btk.block_name 
    AND bm.district_id = btk.district_id
WHERE bm.block_id != btk.keep_block_id;

-- Step 3: Update village_master to point to the block we're keeping
UPDATE village_master vm
INNER JOIN blocks_to_delete btd ON vm.block_id = btd.block_id
INNER JOIN blocks_to_keep btk ON TRUE
INNER JOIN block_master bm ON btd.block_id = bm.block_id
SET vm.block_id = btk.keep_block_id
WHERE bm.block_name = btk.block_name 
  AND bm.district_id = btk.district_id;

-- Step 4: Delete duplicate blocks
DELETE FROM block_master 
WHERE block_id IN (SELECT block_id FROM blocks_to_delete);

-- Cleanup temporary tables
DROP TEMPORARY TABLE blocks_to_keep;
DROP TEMPORARY TABLE blocks_to_delete;

-- ═══════════════════════════════════════════════════════════════════════════════
-- VERIFICATION
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT '========================================' AS '';
SELECT 'DUPLICATE BLOCKS CLEANUP COMPLETE' AS '';
SELECT '========================================' AS '';
SELECT '' AS '';

-- Check for remaining duplicates (should be 0)
SELECT 'Remaining Duplicates:' AS '';
SELECT block_name, district_id, COUNT(*) as count 
FROM block_master 
GROUP BY block_name, district_id 
HAVING count > 1;

SELECT '' AS '';
SELECT 'Total Blocks After Cleanup:' AS '';
SELECT COUNT(*) as total_blocks FROM block_master;

SELECT '' AS '';
SELECT 'Tamil Nadu Blocks:' AS '';
SELECT COUNT(*) as tn_blocks 
FROM block_master 
WHERE district_id IN (SELECT district_id FROM district_master WHERE state_id = 1);

SELECT '' AS '';
SELECT 'Blocks per District (Top 10):' AS '';
SELECT d.district_name, COUNT(b.block_id) as block_count
FROM district_master d
LEFT JOIN block_master b ON d.district_id = b.district_id
WHERE d.state_id = 1
GROUP BY d.district_id, d.district_name
HAVING block_count > 0
ORDER BY block_count DESC
LIMIT 10;
