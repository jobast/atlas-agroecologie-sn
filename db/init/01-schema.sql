-- Atlas Agroecologie - PostgreSQL + PostGIS schema
-- Loaded automatically by the postgis/postgis container on first start
-- (any .sql in /docker-entrypoint-initdb.d runs once, when the data dir is empty).

CREATE EXTENSION IF NOT EXISTS postgis;

-- ====== DyTAELs (territoires) ======
CREATE TABLE IF NOT EXISTS dytaels (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(100) NOT NULL UNIQUE,
  slug            VARCHAR(100) NOT NULL UNIQUE,
  description     TEXT,
  bounds_sw_lat   DOUBLE PRECISION NOT NULL,
  bounds_sw_lon   DOUBLE PRECISION NOT NULL,
  bounds_ne_lat   DOUBLE PRECISION NOT NULL,
  bounds_ne_lon   DOUBLE PRECISION NOT NULL,
  default_zoom    INTEGER DEFAULT 10,
  active          BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ====== Users ======
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password      VARCHAR(255) NOT NULL,
  name          VARCHAR(100),
  surname       VARCHAR(100),
  phone         VARCHAR(50),
  organization  VARCHAR(255),
  dytael_id     INTEGER REFERENCES dytaels(id) ON DELETE SET NULL,
  role          VARCHAR(50) DEFAULT 'editor'
                  CHECK (role IN ('editor', 'dytael_admin', 'dytaes_admin', 'super_admin', 'admin', 'viewer')),
  confirmed     BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  last_login    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_users_dytael ON users(dytael_id);

-- ====== Initiatives ======
CREATE TABLE IF NOT EXISTS initiatives (
  id                SERIAL PRIMARY KEY,
  initiative        VARCHAR(255) NOT NULL,
  description       TEXT NOT NULL,
  village           VARCHAR(100),
  commune           VARCHAR(100),
  zone_intervention VARCHAR(255),
  actor_type        VARCHAR(100),
  year              INTEGER,
  activities        JSONB,
  lat               DOUBLE PRECISION,
  lon               DOUBLE PRECISION,
  -- PostGIS geometry column. Populated by trigger from lat/lon for fast spatial queries.
  geom              geometry(Point, 4326),
  location_type     VARCHAR(20) DEFAULT 'point'
                      CHECK (location_type IN ('point', 'multi', 'zone')),
  contact_email     VARCHAR(255),
  contact_phone     VARCHAR(50),
  person_name       VARCHAR(255),
  website           VARCHAR(255),
  social_media      JSONB,
  videos            JSONB,
  extra_fields      JSONB,
  status            VARCHAR(50) DEFAULT 'pending'
                      CHECK (status IN ('pending', 'approved', 'rejected', 'delete_requested')),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  user_id           INTEGER REFERENCES users(id) ON DELETE SET NULL,
  dytael_id         INTEGER REFERENCES dytaels(id) ON DELETE SET NULL,
  parent_id         INTEGER REFERENCES initiatives(id) ON DELETE CASCADE,
  bailleurs         TEXT,
  organisation      VARCHAR(255),
  point_contact     VARCHAR(255),
  duree             VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_initiatives_parent  ON initiatives(parent_id);
CREATE INDEX IF NOT EXISTS idx_initiatives_dytael  ON initiatives(dytael_id);
CREATE INDEX IF NOT EXISTS idx_initiatives_status  ON initiatives(status);
CREATE INDEX IF NOT EXISTS idx_initiatives_geom    ON initiatives USING GIST (geom);

-- Auto-sync geom from lat/lon on insert and update
CREATE OR REPLACE FUNCTION initiatives_sync_geom() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.lat IS NOT NULL AND NEW.lon IS NOT NULL THEN
    NEW.geom := ST_SetSRID(ST_MakePoint(NEW.lon, NEW.lat), 4326);
  ELSE
    NEW.geom := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_initiatives_sync_geom ON initiatives;
CREATE TRIGGER trg_initiatives_sync_geom
  BEFORE INSERT OR UPDATE OF lat, lon ON initiatives
  FOR EACH ROW EXECUTE FUNCTION initiatives_sync_geom();

-- ====== Custom fields ======
CREATE TABLE IF NOT EXISTS custom_fields (
  id           SERIAL PRIMARY KEY,
  field_key    VARCHAR(100) NOT NULL,
  field_label  VARCHAR(255) NOT NULL,
  field_type   VARCHAR(50) NOT NULL DEFAULT 'text',
  required     BOOLEAN DEFAULT FALSE,
  dytael_id    INTEGER REFERENCES dytaels(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_custom_fields_dytael ON custom_fields(dytael_id);

-- ====== Initiative locations (multi-localisation) ======
CREATE TABLE IF NOT EXISTS initiative_locations (
  id             SERIAL PRIMARY KEY,
  initiative_id  INTEGER NOT NULL REFERENCES initiatives(id) ON DELETE CASCADE,
  label          VARCHAR(255),
  lat            DOUBLE PRECISION,
  lon            DOUBLE PRECISION,
  geom           geometry(Point, 4326),
  village        VARCHAR(100),
  commune        VARCHAR(100),
  is_primary     BOOLEAN DEFAULT FALSE,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_loc_initiative ON initiative_locations(initiative_id);
CREATE INDEX IF NOT EXISTS idx_loc_geom       ON initiative_locations USING GIST (geom);

CREATE OR REPLACE FUNCTION initiative_locations_sync_geom() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.lat IS NOT NULL AND NEW.lon IS NOT NULL THEN
    NEW.geom := ST_SetSRID(ST_MakePoint(NEW.lon, NEW.lat), 4326);
  ELSE
    NEW.geom := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_initiative_locations_sync_geom ON initiative_locations;
CREATE TRIGGER trg_initiative_locations_sync_geom
  BEFORE INSERT OR UPDATE OF lat, lon ON initiative_locations
  FOR EACH ROW EXECUTE FUNCTION initiative_locations_sync_geom();

-- ====== Photos ======
CREATE TABLE IF NOT EXISTS photos (
  id             SERIAL PRIMARY KEY,
  initiative_id  INTEGER NOT NULL REFERENCES initiatives(id) ON DELETE CASCADE,
  filename       VARCHAR(255),
  uploaded_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_photos_initiative ON photos(initiative_id);
