-- Migration 004: Add programme-specific fields
-- These columns are nullable and only used for programmes (parent_id IS NULL with children).
-- Regular initiatives will have these as NULL.

ALTER TABLE initiatives
  ADD COLUMN bailleurs TEXT NULL AFTER parent_id,
  ADD COLUMN organisation VARCHAR(255) NULL AFTER bailleurs,
  ADD COLUMN point_contact VARCHAR(255) NULL AFTER organisation,
  ADD COLUMN duree VARCHAR(100) NULL AFTER point_contact;
