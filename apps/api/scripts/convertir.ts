/**
 * Conversión de nómina por línea de comandos (misma lógica que la opción del portal).
 *
 *   npm run convertir -- <ruta-consolidado.xlsx> [MM/DD/AAAA] [MM]
 *
 * Escribe BASE_*.xlsx y RESUMEN_*.xlsx en ./salida/ (relativo a la carpeta desde donde se ejecuta).
 */
import * as fs from 'fs';
import * as path from 'path';
import {
  ConversionError,
  PayrollConversionService,
} from '../src/modules/payroll/conversion/conversion.service';

const fmt = (n: number, dec = 0) =>
  n.toLocaleString('es-CO', { minimumFractionDigits: dec, maximumFractionDigits: dec });

async function main() {
  const [ruta, fecha, periodo] = process.argv.slice(2);
  if (!ruta) {
    console.error('Uso: npm run convertir -- <ruta-consolidado.xlsx> [MM/DD/AAAA] [MM]');
    process.exit(1);
  }
  const base = process.env.INIT_CWD ?? process.cwd();
  const archivo = path.resolve(base, ruta);
  if (!fs.existsSync(archivo)) {
    console.error(`No existe el archivo: ${archivo}`);
    process.exit(1);
  }

  const svc = new PayrollConversionService();
  const a = await svc.analizar(fs.readFileSync(archivo));
  const p = svc.resolverPeriodo(a, { fecha, periodo });

  const salida = path.resolve(base, 'salida');
  fs.mkdirSync(salida, { recursive: true });
  const nBase = path.join(salida, svc.nombreBase(p));
  const nResumen = path.join(salida, svc.nombreResumen(p));
  fs.writeFileSync(nBase, await svc.generarBase(a, p));
  fs.writeFileSync(nResumen, await svc.generarResumen(a));

  console.log(`Período: ${p.periodo} · Fecha: ${p.fecha} · ${p.quincena}`);
  console.log(`Zonas (${a.zonas.length}): ${a.zonas.map((z) => `${z.nombre}=${z.asociados}`).join(', ')}`);
  console.log(`Filas del BASE: ${fmt(a.filas.length)}`);
  console.log('Totales por concepto:');
  for (const t of a.totales) {
    console.log(`  ${t.codigo}  filas=${fmt(t.filas).padStart(6)}  suma=${fmt(t.suma, t.codigo === '011' ? 2 : 0)}`);
  }
  console.log(`Bonificaciones (manual): ${a.bonificaciones.length} asociados, total ${fmt(a.totalBonificaciones)}`);
  if (a.advertencias.length) {
    console.log('Advertencias:');
    a.advertencias.forEach((w) => console.log(`  - ${w}`));
  }
  console.log(`\nBASE:    ${nBase}\nRESUMEN: ${nResumen}`);
}

main().catch((e) => {
  console.error(e instanceof ConversionError ? `Error: ${e.message}` : e);
  process.exit(1);
});
