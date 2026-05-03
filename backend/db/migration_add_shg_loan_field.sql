-- Migration: Add shg_loan field to household_master and household_members tables
-- Date: 2026-04-30
-- Description: Add radio button field to control visibility of loan amount fields

-- Add shg_loan field to household_master table
ALTER TABLE household_master
ADD COLUMN shg_loan VARCHAR(10) DEFAULT 'No' AFTER shg_role;

-- Add shg_loan field to household_members table  
ALTER TABLE household_members
ADD COLUMN shg_loan VARCHAR(10) DEFAULT 'No' AFTER shg_role;
