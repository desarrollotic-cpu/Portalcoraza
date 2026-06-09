-- Document registry domain

CREATE TABLE IF NOT EXISTS document_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS document_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(100) NOT NULL UNIQUE,
  document_type_id UUID NOT NULL REFERENCES document_types(id) ON DELETE RESTRICT,
  title VARCHAR(200) NOT NULL,
  physical_location TEXT,
  observations TEXT,
  registered_at DATE NOT NULL DEFAULT CURRENT_DATE,
  file_url TEXT,
  storage_provider VARCHAR(40),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_document_records_type ON document_records(document_type_id);
CREATE INDEX IF NOT EXISTS idx_document_records_code ON document_records(code);

CREATE TRIGGER document_types_updated_at BEFORE UPDATE ON document_types
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER document_records_updated_at BEFORE UPDATE ON document_records
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
