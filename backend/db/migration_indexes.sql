-- Performance indexes migration (MySQL 8.0, safe idempotent)

DROP PROCEDURE IF EXISTS add_index_if_missing;

DELIMITER $$
CREATE PROCEDURE add_index_if_missing(
  IN tbl  VARCHAR(64),
  IN idx  VARCHAR(64),
  IN cols VARCHAR(256)
)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name   = tbl
      AND index_name   = idx
  ) THEN
    SET @sql = CONCAT('ALTER TABLE `', tbl, '` ADD INDEX `', idx, '` (', cols, ')');
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
    SELECT CONCAT('✔ Created index ', idx, ' on ', tbl) AS result;
  ELSE
    SELECT CONCAT('— Already exists: ', idx, ' on ', tbl) AS result;
  END IF;
END$$
DELIMITER ;

-- household_master (village_id, status, workflow_status, created_by already added)
CALL add_index_if_missing('household_master', 'idx_hm_social_category',  'social_category');
CALL add_index_if_missing('household_master', 'idx_hm_survey_date',      'survey_date');
CALL add_index_if_missing('household_master', 'idx_hm_fishing_involved', 'fishing_involved');

-- household_members
CALL add_index_if_missing('household_members', 'idx_hmbr_household_id',  'household_id');

-- project_household_link
CALL add_index_if_missing('project_household_link', 'idx_phl_project_id',     'project_id');
CALL add_index_if_missing('project_household_link', 'idx_phl_household_id',   'household_id');
CALL add_index_if_missing('project_household_link', 'idx_phl_village_id',     'village_id');
CALL add_index_if_missing('project_household_link', 'idx_phl_status',         '`status`');
CALL add_index_if_missing('project_household_link', 'idx_phl_project_status', 'project_id, `status`');

-- audit_log
CALL add_index_if_missing('audit_log', 'idx_al_user_id',        'user_id');
CALL add_index_if_missing('audit_log', 'idx_al_module_action',  'module, action');
CALL add_index_if_missing('audit_log', 'idx_al_created_at',     'created_at');

-- geo master FK columns
CALL add_index_if_missing('district_master', 'idx_dm_state_id',    'state_id');
CALL add_index_if_missing('block_master',    'idx_bm_district_id', 'district_id');
CALL add_index_if_missing('village_master',  'idx_vm_block_id',    'block_id');

DROP PROCEDURE IF EXISTS add_index_if_missing;
