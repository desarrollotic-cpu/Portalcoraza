-- 029b: DEFAULT tenant_id = Cooperativa Central until Nest Week-2 sets it explicitly
-- Keeps current API inserts working after 029 NOT NULL without breaking multi-tenant path.

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.table_name
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.column_name = 'tenant_id'
      AND c.table_name NOT IN ('organizations')
  LOOP
    EXECUTE format(
      'ALTER TABLE %I ALTER COLUMN tenant_id SET DEFAULT %L',
      r.table_name,
      '11111111-1111-1111-1111-111111111111'
    );
  END LOOP;
END $$;
