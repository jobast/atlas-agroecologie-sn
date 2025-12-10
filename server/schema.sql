-- Table des utilisateurs
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(100),
  surname VARCHAR(100),
  phone VARCHAR(50),
  organization VARCHAR(255),
  role VARCHAR(50) DEFAULT 'editor',
  confirmed BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login DATETIME
);

-- Table des initiatives (alignée sur l'API data.js)
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
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Champs personnalisés Dynamiques
CREATE TABLE IF NOT EXISTS custom_fields (
  id INT AUTO_INCREMENT PRIMARY KEY,
  field_key VARCHAR(100) NOT NULL,
  field_label VARCHAR(255) NOT NULL,
  field_type VARCHAR(50) NOT NULL DEFAULT 'text',
  required BOOLEAN DEFAULT FALSE,
  dytael VARCHAR(100), -- identifiant du dytael si spécifique, NULL pour global
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table des photos (référencée dans routes/data.js)
CREATE TABLE IF NOT EXISTS photos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  initiative_id INT NOT NULL,
  filename VARCHAR(255),
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (initiative_id) REFERENCES initiatives(id) ON DELETE CASCADE
);
