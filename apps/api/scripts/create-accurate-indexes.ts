import * as dns from 'dns';
import * as dotenv from 'dotenv';
import * as path from 'path';

dns.setDefaultResultOrder('ipv4first');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import { Client } from 'pg';

async function main() {
  const url = process.env.DATABASE_URL;
  const client = new Client({
    connectionString: url,
    ssl: url?.includes('supabase') || url?.includes('pooler') ? { rejectUnauthorized: false } : undefined,
  });

  await client.connect();

  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_doc_contracts_status ON doc_contracts(status);',
    'CREATE INDEX IF NOT EXISTS idx_doc_contracts_voxelsera ON doc_contracts(voxelsera);',
    'CREATE INDEX IF NOT EXISTS idx_doc_contracts_num ON doc_contracts(numeric_code);',
    'CREATE INDEX IF NOT EXISTS idx_doc_correspondence_status ON doc_correspondence(status);',
    'CREATE INDEX IF NOT EXISTS idx_doc_correspondence_voxelsera ON doc_correspondence(voxelsera);',
    'CREATE INDEX IF NOT EXISTS idx_doc_minutes_type ON doc_minutes(minute_type);',
    'CREATE INDEX IF NOT EXISTS idx_doc_minutes_voxelsera ON doc_minutes(voxelsera);',
    'CREATE INDEX IF NOT EXISTS idx_doc_loans_status ON doc_loans(status);',
    'CREATE INDEX IF NOT EXISTS idx_doc_retired_vox ON doc_retired_personnel(voxelsera);',
    'CREATE INDEX IF NOT EXISTS idx_reception_vis_status ON reception_visitors(status);',
    'CREATE INDEX IF NOT EXISTS idx_reception_vis_entry ON reception_visitors(entry_time);',
    'CREATE INDEX IF NOT EXISTS idx_deliveries_date ON deliveries(delivery_date);',
    'CREATE INDEX IF NOT EXISTS idx_assoc_absences_dates ON associate_absences(start_date, end_date);',
    'CREATE INDEX IF NOT EXISTS idx_inventory_stock_item ON inventory_stock(item_id);'
  ];

  for (const sql of indexes) {
    try {
      await client.query(sql);
      console.log('✓', sql.trim());
    } catch (e: any) {
      console.warn('⚠', e.message);
    }
  }

  await client.end();
  console.log('\n🚀 Índices exactos creados exitosamente.');
}

main().catch(console.error);
