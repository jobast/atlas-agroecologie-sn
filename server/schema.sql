-- DyTAELs (regional entities)
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

-- Users
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(100),
  surname VARCHAR(100),
  phone VARCHAR(50),
  organization VARCHAR(255),
  dytael_id INT NULL,
  role VARCHAR(50) DEFAULT 'editor',
  confirmed BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login DATETIME,
  FOREIGN KEY (dytael_id) REFERENCES dytaels(id) ON DELETE SET NULL
);

-- Initiatives
CREATE TABLE IF NOT EXISTS initiatives (
  id INT AUTO_INCREMENT PRIMARY KEY,
  initiative VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  village VARCHAR(100),
  commune VARCHAR(100),
  zone_intervention VARCHAR(255),
  actor_type VARCHAR(100),
  year INT,
  activities JSON,
  lat DOUBLE,
  lon DOUBLE,
  location_type ENUM('point', 'multi', 'zone') DEFAULT 'point',
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  person_name VARCHAR(255),
  website VARCHAR(255),
  social_media JSON,
  videos JSON,
  extra_fields JSON,
  status VARCHAR(50) DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  user_id INT,
  dytael_id INT NULL,
  parent_id INT NULL,
  bailleurs TEXT NULL,
  organisation VARCHAR(255) NULL,
  point_contact VARCHAR(255) NULL,
  duree VARCHAR(100) NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (dytael_id) REFERENCES dytaels(id) ON DELETE SET NULL,
  FOREIGN KEY (parent_id) REFERENCES initiatives(id) ON DELETE CASCADE,
  INDEX idx_parent (parent_id)
);

-- Custom fields
CREATE TABLE IF NOT EXISTS custom_fields (
  id INT AUTO_INCREMENT PRIMARY KEY,
  field_key VARCHAR(100) NOT NULL,
  field_label VARCHAR(255) NOT NULL,
  field_type VARCHAR(50) NOT NULL DEFAULT 'text',
  required BOOLEAN DEFAULT FALSE,
  dytael_id INT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (dytael_id) REFERENCES dytaels(id) ON DELETE SET NULL
);

-- Initiative locations (multi-localisation)
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

-- Photos
CREATE TABLE IF NOT EXISTS photos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  initiative_id INT NOT NULL,
  filename VARCHAR(255),
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (initiative_id) REFERENCES initiatives(id) ON DELETE CASCADE
);
