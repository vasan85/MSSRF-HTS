-- Migration: Add storage_ownership field to household_master
-- Date: 2026-05-01

USE mis_hits;

ALTER TABLE household_master
ADD COLUMN storage_ownership TEXT AFTER storage_facilities;

-- Note: This field stores multi-select values as comma-separated string
-- Options: Not applicable, Owned individually, Shared (group/cooperative), 
--          Rented or paid access, Government or project-supported access
