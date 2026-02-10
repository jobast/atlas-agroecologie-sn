-- Migration 003: Add parent_id for programme/sub-initiative relationship
-- A programme is an initiative that groups other initiatives (sub-initiatives).
-- parent_id = NULL means standalone initiative or programme parent.
-- parent_id = X means sub-initiative belonging to programme X.

ALTER TABLE initiatives
  ADD COLUMN parent_id INT NULL AFTER dytael_id,
  ADD FOREIGN KEY fk_parent (parent_id) REFERENCES initiatives(id) ON DELETE CASCADE,
  ADD INDEX idx_parent (parent_id);
