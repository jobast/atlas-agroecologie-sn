-- Migration 001: Multi-tenant DyTAES/DyTAEL system
-- Run this migration against your MySQL database

-- 1. Create dytaels table
CREATE TABLE IF NOT EXISTS dytaels (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  bounds_sw_lat DOUBLE NOT NULL,
  bounds_sw_lon DOUBLE NOT NULL,
  bounds_ne_lat DOUBLE NOT NULL,
  bounds_ne_lon DOUBLE NOT NULL,
  default_zoom INT DEFAULT 10,
  active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Seed initial DyTAELs
INSERT INTO dytaels (name, slug, description, bounds_sw_lat, bounds_sw_lon, bounds_ne_lat, bounds_ne_lon, default_zoom)
VALUES
  ('Bignona', 'bignona', 'Département de Bignona, Casamance', 12.45, -16.78, 13.23, -15.70, 10),
  ('Mbour', 'mbour', 'Département de Mbour, Thiès', 14.20, -17.20, 14.70, -16.55, 11);

-- 3. Add dytael_id FK to users
ALTER TABLE users
  ADD COLUMN dytael_id INT NULL AFTER organization,
  ADD CONSTRAINT fk_users_dytael FOREIGN KEY (dytael_id) REFERENCES dytaels(id) ON DELETE SET NULL;

-- 4. Add dytael_id FK to initiatives
ALTER TABLE initiatives
  ADD COLUMN dytael_id INT NULL AFTER user_id,
  ADD CONSTRAINT fk_initiatives_dytael FOREIGN KEY (dytael_id) REFERENCES dytaels(id) ON DELETE SET NULL;

-- 5. Convert custom_fields freetext dytael to dytael_id FK
ALTER TABLE custom_fields ADD COLUMN dytael_id INT NULL AFTER dytael;

UPDATE custom_fields cf
  JOIN dytaels d ON LOWER(cf.dytael) = LOWER(d.name)
  SET cf.dytael_id = d.id
  WHERE cf.dytael IS NOT NULL;

ALTER TABLE custom_fields DROP COLUMN dytael;

ALTER TABLE custom_fields
  ADD CONSTRAINT fk_cf_dytael FOREIGN KEY (dytael_id) REFERENCES dytaels(id) ON DELETE SET NULL;

-- 6. Data migration: assign all existing data to Bignona
UPDATE initiatives SET dytael_id = (SELECT id FROM dytaels WHERE slug = 'bignona');
UPDATE users SET dytael_id = (SELECT id FROM dytaels WHERE slug = 'bignona');

-- 7. Normalize roles: old 'admin' becomes 'dytael_admin'
UPDATE users SET role = 'dytael_admin' WHERE role = 'admin';

-- 8. MANUAL STEP: Promote one user to dytaes_admin
-- UPDATE users SET role = 'dytaes_admin', dytael_id = NULL WHERE email = 'your-email@example.com';
