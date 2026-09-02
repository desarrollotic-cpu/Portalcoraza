/**
 * Analiza el archivo LISTADO_ASOCIADOS_DE_NEGOCIO_CLIENTES.txt
 * para descubrir todos los campos únicos y variantes.
 */
import * as fs from 'fs';
import * as path from 'path';

const FILE = process.argv[2] ?? 'C:/Users/JZAPATA/Documents/puestos/LISTADO_ASOCIADOS_DE_NEGOCIO_CLIENTES.txt';

const raw = fs.readFileSync(FILE, 'utf8');
const lines = raw.split(/\r?\n/);

interface Rec { header: string; fields: Record<string, string>; }
const records: Rec[] = [];
let cur: Rec | null = null;
let lastKey: string | null = null;

for (const line of lines) {
  const header = /^---\s*Registro\s+([\d.]+):\s*(.+?)\s*---$/.exec(line);
  if (header) {
    if (cur) records.push(cur);
    cur = { header: header[2]!, fields: {} };
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
    // continuación de valor multilinea
    cur.fields[lastKey] = (cur.fields[lastKey] ?? '') + ' ' + line.trim();
  }
}
if (cur) records.push(cur);

console.log(`\n== TOTAL REGISTROS: ${records.length} ==\n`);

const fieldCount = new Map<string, number>();
for (const r of records) {
  for (const k of Object.keys(r.fields)) {
    fieldCount.set(k, (fieldCount.get(k) ?? 0) + 1);
  }
}

const sorted = [...fieldCount.entries()].sort((a, b) => b[1] - a[1]);
console.log('== CAMPOS DETECTADOS (nombre : nº registros donde aparece) ==');
for (const [k, n] of sorted) console.log(`${n.toString().padStart(4)}  ${k}`);

console.log('\n== EJEMPLO REGISTROS CON CAMPOS NUMERADOS (1:, 2:, ...) ==');
const numeric = records.filter((r) => Object.keys(r.fields).some((k) => /^\d+$/.test(k)));
console.log(`Registros con campos numerados: ${numeric.length}`);
if (numeric[0]) {
  console.log('Primero:', numeric[0].header);
  for (const [k, v] of Object.entries(numeric[0].fields)) {
    if (/^\d+$/.test(k)) console.log(`  ${k}: ${v}`);
  }
}

console.log('\n== VALORES DISTINTOS DE ALGUNOS CAMPOS CLAVE ==');
for (const key of ['SECTOR', 'BASC  SI O NO', 'ZONA', 'CIUDAD']) {
  const set = new Set<string>();
  for (const r of records) if (r.fields[key]) set.add(r.fields[key]);
  console.log(`${key} (${set.size} valores):`);
  [...set].slice(0, 30).forEach((v) => console.log(`  - ${v}`));
  if (set.size > 30) console.log(`  ... y ${set.size - 30} más`);
}

console.log('\n== POSIBLES DUPLICADOS POR # DE CCTO ==');
const dup = new Map<string, string[]>();
for (const r of records) {
  const c = r.fields['# DE CCTO'];
  if (!c) continue;
  const arr = dup.get(c) ?? [];
  arr.push(r.header);
  dup.set(c, arr);
}
[...dup.entries()].filter(([, arr]) => arr.length > 1).forEach(([c, arr]) => {
  console.log(`CCTO ${c}: ${arr.length} registros -> ${arr.join(' | ')}`);
});

console.log('\n== REGISTROS SIN # DE CCTO ==');
records.filter((r) => !r.fields['# DE CCTO']).slice(0, 10).forEach((r) => console.log('  -', r.header));
