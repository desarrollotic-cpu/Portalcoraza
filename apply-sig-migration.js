const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Leer .env manualmente
const envPath = path.join(__dirname, 'apps/api/.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const [k, ...v] = line.split('=');
    if (k && v.length) process.env[k.trim()] = v.join('=').trim().replace(/^"(.*)"$/, '$1');
  });
}

const url = process.env.DATABASE_URL;
if (!url) { console.error('❌ No DATABASE_URL en apps/api/.env'); process.exit(1); }

const client = new Client({
  connectionString: url,
  ssl: (url.includes('supabase') || url.includes('pooler')) ? { rejectUnauthorized: false } : false
});

async function main() {
  await client.connect();
  console.log('✅ Conectado a Portal Coraza DB');

  const sql = fs.readFileSync(
    path.join(__dirname, 'supabase/migrations/038_sig_seed_actualizado.sql'),
    'utf8'
  );

  await client.query(sql);
  console.log('✅ Migración 038 aplicada');

  const { rows } = await client.query(`
    SELECT codigo, nombre, subsistema, area, activo
    FROM sig_indicadores
    WHERE activo = TRUE
    ORDER BY codigo
  `);
  console.log('\n📊 Indicadores activos en SIG:');
  console.table(rows);
  await client.end();
}

main().catch(err => { console.error('❌', err.message); process.exit(1); });
