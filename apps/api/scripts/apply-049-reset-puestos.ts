/**
 * Aplica migración 049 (extender posts) y reemplaza TODA la tabla `posts`
 * con los 184 registros del archivo plano LISTADO_ASOCIADOS_DE_NEGOCIO_CLIENTES.txt.
 *
 * TRUNCATE posts CASCADE borra también minutas, programación, entregas y equipos
 * asociados. Confirmado por el usuario (piloto, empieza limpio).
 *
 * Fecha de inicio del contrato = created_at para respetar histórico en el dashboard.
 */
import * as dns from 'dns';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { Client } from 'pg';

dns.setDefaultResultOrder('ipv4first');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const FILE =
  process.env.PUESTOS_FILE ??
  'C:/Users/JZAPATA/Documents/puestos/LISTADO_ASOCIADOS_DE_NEGOCIO_CLIENTES.txt';

interface Rec {
  header: string;
  fields: Record<string, string>;
}

function parseFile(): Rec[] {
  const raw = fs.readFileSync(FILE, 'utf8');
  const lines = raw.split(/\r?\n/);
  const records: Rec[] = [];
  let cur: Rec | null = null;
  let lastKey: string | null = null;
  for (const line of lines) {
    const header = /^---\s*Registro\s+([\d.]+):\s*(.+?)\s*---$/.exec(line);
    if (header) {
      if (cur) records.push(cur);
      cur = { header: header[2]!.trim(), fields: {} };
      lastKey = null;
      continue;
    }
    if (!cur) continue;
    const kv = /^([^:]{1,80}?):\s*(.*)$/.exec(line);
    if (kv) {
      const k = kv[1]!.trim();
      const v = kv[2]!.trim();
      cur.fields[k] = v;
      lastKey = k;
    } else if (line.trim() && lastKey) {
      cur.fields[lastKey] = (cur.fields[lastKey] ?? '') + ' ' + line.trim();
    }
  }
  if (cur) records.push(cur);
  return records;
}

function cleanNumeric(s?: string): string | null {
  if (!s) return null;
  const clean = s.replace(/\.0$/, '').trim();
  return clean.length ? clean : null;
}

function keepRaw(s?: string): string | null {
  if (!s) return null;
  const t = s.trim();
  return t.length ? t : null;
}

function parseDate(s?: string): string | null {
  if (!s) return null;
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(s.trim());
  return m ? m[1]! : null;
}

function parseBool(s?: string): boolean | null {
  if (!s) return null;
  const v = s.trim().toUpperCase();
  if (v === 'SI' || v === 'SÍ' || v === 'YES') return true;
  if (v === 'NO') return false;
  return null;
}

function sectorToType(sector?: string): string {
  const s = (sector ?? '').toUpperCase();
  if (s === 'RESIDENCIAL') return 'UNIDAD_RESIDENCIAL';
  if (s === 'SALUD') return 'HOSPITAL';
  if (s === 'EDUCATIVO') return 'UNIVERSIDAD';
  if (s === 'OBRA') return 'OBRA';
  return 'SERVICIO_ESPECIAL';
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('Falta DATABASE_URL');

  const migration049 = fs.readFileSync(
    path.join(__dirname, '..', '..', '..', 'supabase', 'migrations', '049_posts_client_fields.sql'),
    'utf8',
  );
  const migration050 = fs.readFileSync(
    path.join(__dirname, '..', '..', '..', 'supabase', 'migrations', '050_posts_text_values.sql'),
    'utf8',
  );
  const migration051 = fs.readFileSync(
    path.join(__dirname, '..', '..', '..', 'supabase', 'migrations', '051_posts_contract_text.sql'),
    'utf8',
  );

  const records = parseFile();
  console.log(`Registros en archivo: ${records.length}`);

  const client = new Client({
    connectionString: url,
    ssl:
      url.includes('supabase') || url.includes('pooler')
        ? { rejectUnauthorized: false }
        : undefined,
  });
  await client.connect();

  try {
    console.log('1) Aplicando migraciones 049 + 050 + 051…');
    await client.query(migration049);
    await client.query(migration050);
    await client.query(migration051);

    console.log('2) TRUNCATE posts CASCADE (borra minutas/programación/entregas/equipos asociados)…');
    await client.query(`TRUNCATE posts RESTART IDENTITY CASCADE`);

    console.log('3) Detectando tenant activo (Cooperativa Central)…');
    const tenantRow = await client.query(
      `SELECT id FROM organizations WHERE nombre = 'Cooperativa Central' LIMIT 1`,
    );
    let tenantId: string | null = tenantRow.rows[0]?.id ?? null;
    if (!tenantId) {
      const anyT = await client.query(
        `SELECT id FROM organizations WHERE activo = true ORDER BY created_at LIMIT 1`,
      );
      tenantId = anyT.rows[0]?.id ?? null;
    }
    if (!tenantId) throw new Error('No hay organization activa en BD');
    console.log(`   tenant_id = ${tenantId}`);

    console.log('4) Insertando 184 registros con created_at = FECHA INICIAL CTTO…');
    const cctoSeen = new Map<string, number>();
    let inserted = 0;
    let skipped: string[] = [];

    for (const r of records) {
      const f = r.fields;
      const ccto = cleanNumeric(f['# DE CCTO']);
      if (!ccto) {
        skipped.push(`Sin # DE CCTO: ${r.header}`);
        continue;
      }
      const seq = (cctoSeen.get(ccto) ?? 0) + 1;
      cctoSeen.set(ccto, seq);
      const totalForCcto = records.filter((x) => cleanNumeric(x.fields['# DE CCTO']) === ccto).length;
      const code = totalForCcto > 1 ? `${ccto}-${seq}` : ccto;

      const name = r.header.slice(0, 200);
      const type = sectorToType(f['SECTOR']);
      const startRaw = keepRaw(f['FECHA INICIAL CTTO']);
      const created = parseDate(startRaw ?? undefined);

      const observations: string[] = [];
      if (f['OBSERVACIONES']) observations.push(f['OBSERVACIONES']);
      for (const [k, v] of Object.entries(f)) {
        if (/^\d+$/.test(k)) observations.push(`${k}: ${v}`);
      }

      await client.query(
        `
        INSERT INTO posts (
          tenant_id, code, name, type, status,
          address, client_name, notes, zone, contact_name, phone,
          contract_number, service_type, armed,
          nit, sector, basc, contract_start, contract_end, contract_term, city,
          legal_rep_name, legal_rep_id, contact_email, observations,
          doc_camara_comercio, doc_rut, doc_cc_rep_legal, doc_tratamiento_datos,
          doc_formulario_asociado, doc_acuerdo_seguridad, doc_visita_cliente,
          doc_estados_financieros, doc_rues_camara,
          verif_encuesta_satisfaccion, verif_ofac_rl, verif_ofac_persona_juridica,
          verif_central_riesgos_pn, verif_central_riesgos_nit,
          verif_procuraduria_nit, verif_procuraduria_rl, verif_procuraduria_rls,
          verif_procuraduria_rev_fiscal_ppal, verif_procuraduria_rev_fiscal_sup,
          verif_procuraduria_miembros_junta,
          verif_policia_rp, verif_policia_rp_sup, verif_policia_rev_fiscal,
          verif_policia_rev_fiscal_sup, verif_policia_miembros_junta,
          verif_contraloria_rp, verif_contraloria_rp_sup, verif_contraloria_rev_fiscal,
          verif_contraloria_rev_fiscal_sup, verif_contraloria_miembros_junta,
          verif_supersociedades,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, 'ACTIVO',
          $5, $6, NULL, $7, $8, $9,
          $10, NULL, false,
          $11, $12, $13, $14, $15, $16, $17,
          $18, $19, $20, $21,
          $22, $23, $24, $25, $26, $27, $28, $29, $30,
          $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45,
          $46, $47, $48, $49, $50, $51, $52,
          COALESCE($53::date, NOW()), NOW()
        )
        `,
        [
          tenantId,
          code,
          name,
          type,
          keepRaw(f['DIRECCION']),
          name,
          keepRaw(f['ZONA']),
          keepRaw(f['NOMBRE DEL CONTACTO']),
          keepRaw(f['NUMERO TELEFONICO']),
          keepRaw(f['# DE CCTO']),
          keepRaw(f['NIT']),
          keepRaw(f['SECTOR']),
          parseBool(f['BASC  SI O NO']),
          startRaw,
          keepRaw(f['FECHA FINAL CCTO']),
          keepRaw(f['TIEMPO DEL CTTO']),
          keepRaw(f['CIUDAD']),
          keepRaw(f['NOMBRE REP LEGAL']),
          keepRaw(f['CEDULA REP LEGAL']),
          keepRaw(f['EMAIL']),
          observations.length ? observations.join('\n') : null,
          keepRaw(f['CAMARA DE COMERCIO / PERSONERIA JURIDICA']),
          keepRaw(f['RUT']),
          keepRaw(f['CC REP LEGAL']),
          keepRaw(f['TRATAMIENTO DE DATOS']),
          keepRaw(f['FORMULARIO ASOCIADO DE NEGOCIO']),
          keepRaw(f['ACUERDO DE SEGURIDAD']),
          keepRaw(f['VISITA CLIENTE']),
          keepRaw(f['ESTADOS FINANCIEROS']),
          keepRaw(f['RUES / CAMARA']),
          keepRaw(f['ENCUESTA DE SATISFACCIÓN']),
          keepRaw(f['LISTA OFAC RL']),
          keepRaw(f['LISTA OFAC PERSONA JURIDICA']),
          keepRaw(f['CENTRAL DE RIESGOS PN']),
          keepRaw(f['CENTRAL DE RIESGOS NIT']),
          keepRaw(f['PROCURADURÍA NIT']),
          keepRaw(f['PROCURADURIA RL']),
          keepRaw(f['PROCURADURIA RLS']),
          keepRaw(f['PROCURADURIA REVISOR FISCAL PPAL']),
          keepRaw(f['PROCURADURIA REVISOR FISCAL SUPLENTE']),
          keepRaw(f['PROCURADURÍA MIEMBROS DE JUNTA']),
          keepRaw(f['POLICIA RP']),
          keepRaw(f['POLICIA RP SUP']),
          keepRaw(f['POLICIA REVISOR FISCAL']),
          keepRaw(f['POLICIA REVISOR FISCAL SUPLENTE']),
          keepRaw(f['POLICIA MIEMBROS DE JUNTA']),
          keepRaw(f['CONTRALORÍA RP']),
          keepRaw(f['CONTRALORIA RP SUP']),
          keepRaw(f['CONTRALORIA REVISOR FISCAL']),
          keepRaw(f['CONTRALORIA REVISOR FISCAL SUPLENTE']),
          keepRaw(f['CONTRALORIA MIEMBROS DE JUNTA']),
          keepRaw(f['SUPERSOCIEDADES / TURISMO COMERCIO TRANSP']),
          created,
        ],
      );
      inserted++;
    }

    const total = await client.query(`SELECT COUNT(*)::int AS c FROM posts`);
    console.log(`\nOK. Insertados: ${inserted}. Total ahora en posts: ${total.rows[0].c}`);
    if (skipped.length) console.log(`Saltados: ${skipped.length}`);
    skipped.forEach((s) => console.log('  -', s));

    const checks = await client.query(
      `SELECT code, name, doc_camara_comercio, doc_estados_financieros, doc_rues_camara,
              contract_term, verif_encuesta_satisfaccion, observations
       FROM posts
       WHERE code IN ('937','953','1077','1075','1069','1124','857-1')
       ORDER BY code`,
    );
    console.log('\nSpot-check:');
    for (const row of checks.rows) console.log(JSON.stringify(row));
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
