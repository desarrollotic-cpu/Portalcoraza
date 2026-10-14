/**
 * Prueba de carga de lectura contra el API.
 *
 * Sube la concurrencia por escalones y para en cuanto algo se degrada, para no
 * tumbar el servicio: con 0.5 CPU, 512 MB y un pool de 5 conexiones a Supabase,
 * el punto de ruptura llega antes de lo que parece.
 *
 * Uso:
 *   npx ts-node scripts/carga.ts --url https://portalcoraza.onrender.com \
 *     [--token <jwt>] [--ruta /api/v1/associates?page=1&limit=20] [--max 20]
 *
 * Solo hace GET. Nunca escribe.
 */
import autocannon = require('autocannon');

type Escalon = { conexiones: number; segundos: number };

const ESCALONES: Escalon[] = [
  { conexiones: 1, segundos: 10 },
  { conexiones: 5, segundos: 20 },
  { conexiones: 10, segundos: 20 },
  { conexiones: 20, segundos: 20 },
  { conexiones: 40, segundos: 20 },
];

/** Umbrales de corte: si se cruzan, no se sube al siguiente escalón. */
const MAX_ERRORES_PCT = 2;
const MAX_P99_MS = 5000;

function arg(nombre: string): string | undefined {
  const i = process.argv.indexOf(`--${nombre}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function ms(n: number): string {
  return `${Math.round(n)}ms`;
}

async function main(): Promise<void> {
  const base = arg('url') ?? 'http://localhost:3000';
  const ruta = arg('ruta') ?? '/health';
  const token = arg('token');
  const max = Number(arg('max') ?? 40);

  const url = `${base.replace(/\/$/, '')}${ruta}`;
  const headers: Record<string, string> = token
    ? { authorization: `Bearer ${token}` }
    : {};

  console.log(`\nCarga de lectura sobre ${url}`);
  console.log(token ? 'Con sesión.' : 'Sin sesión (endpoint público).');
  console.log(
    `Corte: más de ${MAX_ERRORES_PCT}% de fallos o p99 por encima de ${MAX_P99_MS}ms.\n`,
  );

  for (const escalon of ESCALONES) {
    if (escalon.conexiones > max) {
      console.log(`Se omite el escalón de ${escalon.conexiones} (--max ${max}).`);
      continue;
    }

    const r = await autocannon({
      url,
      connections: escalon.conexiones,
      duration: escalon.segundos,
      headers,
      method: 'GET',
    });

    const fallos = r.non2xx + r.errors + r.timeouts;
    // El denominador incluye los fallos: si ninguna petición llegó a
    // completarse, dividir solo entre las correctas daría 0% y seguiría
    // subiendo escalones contra un servicio que no responde.
    const intentos = r.requests.total + fallos;
    const pct = intentos ? (fallos / intentos) * 100 : 100;

    console.log(
      [
        `${String(escalon.conexiones).padStart(2)} conexiones`,
        `${r.requests.total} peticiones`,
        `${r.requests.average.toFixed(1)} req/s`,
        `media ${ms(r.latency.average)}`,
        `p99 ${ms(r.latency.p99)}`,
        `máx ${ms(r.latency.max)}`,
        `fallos ${fallos} (${pct.toFixed(1)}%)`,
      ].join(' · '),
    );

    if (pct > MAX_ERRORES_PCT) {
      console.log(
        `\nParo aquí: el ${pct.toFixed(1)}% de las peticiones falló con ${escalon.conexiones} conexiones.`,
      );
      return;
    }
    if (r.latency.p99 > MAX_P99_MS) {
      console.log(
        `\nParo aquí: el p99 llegó a ${ms(r.latency.p99)} con ${escalon.conexiones} conexiones.`,
      );
      return;
    }

    // Respiro entre escalones para que la memoria y el pool se recuperen.
    await new Promise((r) => setTimeout(r, 5000));
  }

  console.log('\nTodos los escalones dentro de los umbrales.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
