-- Add Draft status and saved_step field to household_master table
-- This allows users to save their progress and continue later

-- Modify status ENUM to include 'Draft'
ALTER TABLE household_master 
MODIFY COLUMN status ENUM('Active','Inactive','Draft') DEFAULT 'Active';

-- Add saved_step field to track which step user was on
ALTER TABLE household_master 
ADD COLUMN saved_step INT DEFAULT 1 AFTER status;

-- Update existing records to have saved_step = 1
UPDATE household_master SET saved_step = 1 WHERE saved_step IS NULL;
