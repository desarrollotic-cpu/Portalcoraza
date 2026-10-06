/**
 * Aplica 082 + siembra roster desde excel-radio-order.json (match fuzzy a posts).
 */
import * as dns from 'dns';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { Client } from 'pg';

dns.setDefaultResultOrder('ipv4first');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

type OrderRow = { sort: number; coraza: string; name: string };

function norm(s: string): string {
  return String(s || '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

const STOP = new Set([
  'DE', 'DEL', 'LA', 'LAS', 'LOS', 'EL', 'ED', 'EDIFICIO', 'OBRA', 'URB',
  'URBANIZACION', 'CONJUNTO', 'RESIDENCIAL', 'CONDOMINIO', 'TORRE', 'PH', 'SAS', 'SA',
]);

function tokens(s: string): string[] {
  return norm(s)
    .split(' ')
    .filter((t) => t.length > 2 && !STOP.has(t));
}

function score(excel: string, post: string): number {
  const on = norm(excel);
  const pn = norm(post);
  if (!on || !pn) return 0;
  if (pn === on) return 100;
  if (pn.includes(on) || on.includes(pn)) return 90;
  const ot = tokens(excel);
  const pt = tokens(post);
  if (!ot.length) return 0;
  const inter = ot.filter((t) => pt.includes(t)).length;
  return (inter / ot.length) * 80;
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('Missing DATABASE_URL');

  const sql082 = fs.readFileSync(
    path.join(__dirname, '..', '..', '..', 'supabase', 'migrations', '082_radio_control_roster.sql'),
    'utf8',
  );
  const orderPath = path.join(
    __dirname,
    '..',
    'src',
    'modules',
    'radio-control',
    'excel-radio-order.json',
  );
  const order = JSON.parse(fs.readFileSync(orderPath, 'utf8')) as OrderRow[];

  const client = new Client({
    connectionString: url,
    ssl:
      url.includes('supabase') || url.includes('pooler')
        ? { rejectUnauthorized: false }
        : undefined,
    connectionTimeoutMillis: 20000,
  });
  await client.connect();
  try {
    await client.query(sql082);

    const tenant = (
      await client.query<{ tenant_id: string }>(
        `SELECT tenant_id FROM posts GROUP BY 1 ORDER BY COUNT(*) DESC LIMIT 1`,
      )
    ).rows[0]?.tenant_id;
    if (!tenant) throw new Error('No tenant');

    const posts = (
      await client.query<{ id: string; name: string }>(
        `SELECT id, name FROM posts WHERE tenant_id = $1 AND status = 'ACTIVO'`,
        [tenant],
      )
    ).rows;

    await client.query(`DELETE FROM radio_control_roster WHERE tenant_id = $1`, [tenant]);

    const used = new Set<string>();
    let linked = 0;
    for (const o of order) {
      let best: { id: string; name: string } | null = null;
      let bestScore = 0;
      for (const p of posts) {
        if (used.has(p.id)) continue;
        const sc = score(o.name, p.name);
        if (sc > bestScore) {
          bestScore = sc;
          best = p;
        }
      }
      let postId: string | null = null;
      if (best && bestScore >= 70) {
        postId = best.id;
        used.add(best.id);
        linked += 1;
      }
      await client.query(
        `INSERT INTO radio_control_roster (tenant_id, sort_order, label, callsign, post_id)
         VALUES ($1,$2,$3,$4,$5)`,
        [tenant, o.sort, o.name, o.coraza || null, postId],
      );
    }

    const n = await client.query(
      `SELECT COUNT(*)::int AS n FROM radio_control_roster WHERE tenant_id = $1`,
      [tenant],
    );
    console.log(
      `✔ 082 roster=${n.rows[0].n} linked=${linked}/${order.length} tenant=${tenant}`,
    );
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
