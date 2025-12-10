-- Création de la base (si nécessaire)
CREATE EXTENSION IF NOT EXISTS postgis;

-- Suppression des tables dans l'ordre inverse des dépendances
DROP TABLE IF EXISTS photos;
DROP TABLE IF EXISTS data_points;
DROP TABLE IF EXISTS users;

-- Table des utilisateurs
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'viewer', -- viewer, editor, admin
    name TEXT,
    surname TEXT,
    phone TEXT
);

-- Table principale des initiatives
CREATE TABLE data_points (
    id SERIAL PRIMARY KEY,
    initiative TEXT NOT NULL,
    description TEXT NOT NULL,
    village TEXT,
    commune TEXT,
    zone_intervention TEXT,
    actor_type TEXT NOT NULL,
    year INT NOT NULL,
    activities TEXT[] NOT NULL,
    lat DOUBLE PRECISION,
    lon DOUBLE PRECISION,
    geom GEOMETRY(Point, 4326),
    website TEXT,
    contact_email TEXT,
    contact_phone TEXT NOT NULL,
    person_name TEXT NOT NULL,
    social_media JSONB,
    videos JSONB,
    created_by INTEGER REFERENCES users(id),
    status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    delete_requested BOOLEAN DEFAULT FALSE,
);

-- Table pour les photos (relation 1-n)
CREATE TABLE photos (
    id SERIAL PRIMARY KEY,
    data_point_id INTEGER REFERENCES data_points(id) ON DELETE CASCADE,
    filename TEXT,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
