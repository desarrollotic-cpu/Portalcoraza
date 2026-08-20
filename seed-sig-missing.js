const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, 'apps/api/.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const [k, ...v] = line.split('=');
    if (k && v.length) process.env[k.trim()] = v.join('=').trim();
  });
}

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const datos = [
  { codigo: 'E3', periodos: [
    { p:'01', meta:30, val:28 }, { p:'02', meta:30, val:35 }, { p:'03', meta:30, val:27 },
    { p:'04', meta:30, val:32 }, { p:'05', meta:30, val:29 }, { p:'06', meta:30, val:31 },
    { p:'07', meta:30, val:26 }
  ]},
  { codigo: 'SIG-S3', periodos: [
    { p:'T1', meta:90, val:92 }, { p:'T2', meta:90, val:86 }
  ]},
  { codigo: 'SIG-S4', periodos: [
    { p:'T1', meta:85, val:88 }, { p:'T2', meta:85, val:79 }
  ]},
  { codigo: 'SIG-S5', periodos: [
    { p:'T1', meta:90, val:95 }, { p:'T2', meta:90, val:88 }
  ]},
];

function semaforo(sentido, meta, valor) {
  if (meta === 0) return 'VERDE';
  const pct = sentido === 'ASCENDENTE' ? (valor / meta) * 100 : (meta / valor) * 100;
  if (pct >= 100) return 'AZUL';
  if (pct >= 90) return 'VERDE';
  if (pct >= 75) return 'AMARILLO';
  return 'ROJO';
}

async function main() {
  await client.connect();
  const { rows } = await client.query(`SELECT id, codigo, sentido FROM sig_indicadores WHERE activo = TRUE`);
  const indMap = {};
  rows.forEach(i => indMap[i.codigo] = i);

  let n = 0;
  for (const d of datos) {
    const ind = indMap[d.codigo];
    if (!ind) { console.log('No encontrado:', d.codigo); continue; }
    for (const p of d.periodos) {
      const color = semaforo(ind.sentido || 'DESCENDENTE', p.meta, p.val);
      await client.query(`
        INSERT INTO sig_resultados (indicador_id, anio, periodo, meta_snapshot, valor_resultado, observaciones, color_semaforo, seguimiento, capturado_por)
        VALUES ($1, 2026, $2, $3, $4, 'Dato arranque 2026', $5, 'ABIERTO', 'seed-2026')
        ON CONFLICT (indicador_id, anio, periodo) DO UPDATE
          SET valor_resultado = EXCLUDED.valor_resultado, meta_snapshot = EXCLUDED.meta_snapshot, color_semaforo = EXCLUDED.color_semaforo
      `, [ind.id, p.p, p.meta, p.val, color]);
      n++;
    }
  }
  console.log(`✅ ${n} registros completados`);
  await client.end();
}
main().catch(e => console.error('❌', e.message));
