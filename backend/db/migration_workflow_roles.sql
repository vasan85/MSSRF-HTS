-- ============================================================
-- Migration: Workflow & New Roles
-- Adds mis_reviewer, mis_head roles + workflow state machine
-- ============================================================

-- 1. Extend users role ENUM
ALTER TABLE users
  MODIFY COLUMN role ENUM('admin','pm','enumerator','me','mis_reviewer','mis_head')
  DEFAULT 'enumerator';

-- 2. Add workflow columns to household_master
ALTER TABLE household_master
  ADD COLUMN workflow_status ENUM('draft','submitted','under_review','approved','returned')
    NOT NULL DEFAULT 'draft' AFTER status,
  ADD COLUMN submitted_at DATETIME NULL AFTER workflow_status,
  ADD COLUMN reviewed_by INT NULL AFTER submitted_at,
  ADD COLUMN reviewed_at DATETIME NULL AFTER reviewed_by,
  ADD COLUMN review_comment TEXT NULL AFTER reviewed_at;

-- 3. Revision log table (tracks every state change + edit)
CREATE TABLE IF NOT EXISTS revision_log (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  household_id VARCHAR(30) NOT NULL,
  changed_by_user_id INT NOT NULL,
  changed_by_name VARCHAR(100) NOT NULL,
  user_role VARCHAR(30) NOT NULL,
  action ENUM('CREATED','EDITED','SUBMITTED','APPROVED','RETURNED','RESUBMITTED') NOT NULL,
  comment TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_hh_id (household_id),
  INDEX idx_user (changed_by_user_id)
);

-- 4. Seed demo users for new roles (password='password' works via demo login)
INSERT IGNORE INTO users (name, email, password, role) VALUES
  ('MIS Reviewer',      'reviewer@mssrf.org', 'password', 'mis_reviewer'),
  ('MIS Head',          'mishead@mssrf.org',  'password', 'mis_head');

-- 5. Backfill: existing records that were created (no workflow yet) → keep draft
--    (workflow_status DEFAULT 'draft' already handles new rows; this is for existing data)
UPDATE household_master SET workflow_status = 'draft' WHERE workflow_status IS NULL;
