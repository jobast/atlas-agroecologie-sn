-- Migration: Multi-localisation et projets non-géolocalisables
-- Date: 2026-02-10

-- 1. Nouvelle table pour les localisations multiples
CREATE TABLE IF NOT EXISTS initiative_locations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  initiative_id INT NOT NULL,
  label VARCHAR(255),
  lat DOUBLE,
  lon DOUBLE,
  village VARCHAR(100),
  commune VARCHAR(100),
  is_primary BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (initiative_id) REFERENCES initiatives(id) ON DELETE CASCADE,
  INDEX idx_loc_initiative (initiative_id)
);

-- 2. Ajouter la colonne location_type sur initiatives
ALTER TABLE initiatives
  ADD COLUMN location_type ENUM('point', 'multi', 'zone') DEFAULT 'point' AFTER lon;

-- 3. Migrer les données existantes vers initiative_locations
INSERT INTO initiative_locations (initiative_id, label, lat, lon, village, commune, is_primary)
SELECT id, 'Localisation principale', lat, lon, village, commune, TRUE
FROM initiatives WHERE lat IS NOT NULL AND lon IS NOT NULL;

-- 4. Mettre à jour location_type pour les initiatives existantes
UPDATE initiatives SET location_type = 'point' WHERE lat IS NOT NULL AND lon IS NOT NULL;
