-- Residential domain

CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TYPE reservation_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED');
CREATE TYPE reservation_approval_mode AS ENUM ('manual_approval', 'auto_approval');
CREATE TYPE package_status AS ENUM ('RECEIVED', 'DELIVERED');
CREATE TYPE residential_incident_status AS ENUM ('ABIERTA', 'EN_PROCESO', 'RESUELTA', 'CERRADA');
CREATE TYPE residential_incident_priority AS ENUM ('BAJA', 'MEDIA', 'ALTA', 'CRITICA');

CREATE TABLE IF NOT EXISTS residential_units (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE RESTRICT,
  block VARCHAR(40),
  number VARCHAR(40) NOT NULL,
  area_m2 NUMERIC(10,2),
  reservation_approval_mode reservation_approval_mode NOT NULL DEFAULT 'manual_approval',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS residents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_id UUID NOT NULL REFERENCES residential_units(id) ON DELETE CASCADE,
  name VARCHAR(160) NOT NULL,
  document_number VARCHAR(40),
  phone VARCHAR(30),
  email VARCHAR(255),
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS owners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_id UUID NOT NULL REFERENCES residential_units(id) ON DELETE CASCADE,
  name VARCHAR(160) NOT NULL,
  document_number VARCHAR(40),
  phone VARCHAR(30),
  email VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_id UUID NOT NULL REFERENCES residential_units(id) ON DELETE CASCADE,
  name VARCHAR(160) NOT NULL,
  document_number VARCHAR(40),
  phone VARCHAR(30),
  email VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_id UUID NOT NULL REFERENCES residential_units(id) ON DELETE CASCADE,
  plate VARCHAR(20) NOT NULL,
  brand VARCHAR(80),
  model VARCHAR(80),
  color VARCHAR(40),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS visitors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_id UUID NOT NULL REFERENCES residential_units(id) ON DELETE CASCADE,
  host_resident_id UUID REFERENCES residents(id) ON DELETE SET NULL,
  full_name VARCHAR(160) NOT NULL,
  document_number VARCHAR(40),
  plate VARCHAR(20),
  entry_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  exit_time TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS visitor_parking_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_id UUID NOT NULL UNIQUE REFERENCES residential_units(id) ON DELETE CASCADE,
  total_slots INTEGER NOT NULL DEFAULT 0 CHECK (total_slots >= 0),
  occupied_slots INTEGER NOT NULL DEFAULT 0 CHECK (occupied_slots >= 0),
  available_slots INTEGER NOT NULL DEFAULT 0 CHECK (available_slots >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS visitor_parking_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parking_slot_id UUID NOT NULL REFERENCES visitor_parking_slots(id) ON DELETE CASCADE,
  visitor_id UUID REFERENCES visitors(id) ON DELETE SET NULL,
  action VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mail_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_id UUID NOT NULL REFERENCES residential_units(id) ON DELETE CASCADE,
  sender VARCHAR(160),
  subject VARCHAR(180),
  status VARCHAR(30) NOT NULL DEFAULT 'RECEIVED',
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_id UUID NOT NULL REFERENCES residential_units(id) ON DELETE CASCADE,
  resident_id UUID REFERENCES residents(id) ON DELETE SET NULL,
  sender VARCHAR(160),
  description TEXT,
  status package_status NOT NULL DEFAULT 'RECEIVED',
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS reservations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_id UUID NOT NULL REFERENCES residential_units(id) ON DELETE CASCADE,
  resource_code VARCHAR(60) NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  approval_mode reservation_approval_mode NOT NULL DEFAULT 'manual_approval',
  status reservation_status NOT NULL DEFAULT 'PENDING',
  requested_by UUID REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (ends_at > starts_at)
);

ALTER TABLE reservations
  ADD CONSTRAINT no_overlap_approved_reservations
  EXCLUDE USING gist (
    unit_id WITH =,
    resource_code WITH =,
    tstzrange(starts_at, ends_at, '[)') WITH &&
  )
  WHERE (status = 'APPROVED');

CREATE TABLE IF NOT EXISTS virtual_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_id UUID NOT NULL REFERENCES residential_units(id) ON DELETE CASCADE,
  entry_type VARCHAR(60) NOT NULL,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION prevent_virtual_log_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'El libro virtual es inmutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER virtual_log_prevent_update
  BEFORE UPDATE ON virtual_log
  FOR EACH ROW EXECUTE FUNCTION prevent_virtual_log_mutation();

CREATE TRIGGER virtual_log_prevent_delete
  BEFORE DELETE ON virtual_log
  FOR EACH ROW EXECUTE FUNCTION prevent_virtual_log_mutation();

CREATE TABLE IF NOT EXISTS residential_incidents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_id UUID NOT NULL REFERENCES residential_units(id) ON DELETE CASCADE,
  title VARCHAR(180) NOT NULL,
  description TEXT,
  status residential_incident_status NOT NULL DEFAULT 'ABIERTA',
  priority residential_incident_priority NOT NULL DEFAULT 'MEDIA',
  assigned_to UUID REFERENCES users(id),
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS residential_incident_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id UUID NOT NULL REFERENCES residential_incidents(id) ON DELETE CASCADE,
  changed_by UUID REFERENCES users(id),
  field_name VARCHAR(80) NOT NULL,
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_residential_units_post ON residential_units(post_id);
CREATE INDEX IF NOT EXISTS idx_residents_unit ON residents(unit_id);
CREATE INDEX IF NOT EXISTS idx_owners_unit ON owners(unit_id);
CREATE INDEX IF NOT EXISTS idx_tenants_unit ON tenants(unit_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_unit ON vehicles(unit_id);
CREATE INDEX IF NOT EXISTS idx_visitors_unit ON visitors(unit_id, entry_time DESC);
CREATE INDEX IF NOT EXISTS idx_packages_unit ON packages(unit_id, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_reservations_unit ON reservations(unit_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_virtual_log_unit ON virtual_log(unit_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_residential_incidents_unit ON residential_incidents(unit_id, created_at DESC);

CREATE TRIGGER residential_units_updated_at BEFORE UPDATE ON residential_units
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER residents_updated_at BEFORE UPDATE ON residents
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER owners_updated_at BEFORE UPDATE ON owners
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER tenants_updated_at BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER vehicles_updated_at BEFORE UPDATE ON vehicles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER visitor_parking_slots_updated_at BEFORE UPDATE ON visitor_parking_slots
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER reservations_updated_at BEFORE UPDATE ON reservations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER residential_incidents_updated_at BEFORE UPDATE ON residential_incidents
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
