export function distanciaMetros(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const r = 6371000;
  const rad = (g: number) => (g * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(a));
}

export function esHoyBogota(iso: string): boolean {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return fmt.format(new Date()) === fmt.format(new Date(iso));
}

export function horaBogota(iso: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso));
}

export function dentroDelRadio(
  distancia: number,
  radioMetros: number,
  holgura = 1,
): boolean {
  return distancia <= radioMetros * holgura;
}

export const ALTITUD_MAX_DELTA_M = 8;
export const DWELL_MS = 8000;

export function alturaCoincide(
  altPunto: number | null | undefined,
  altVigilante: number | null | undefined,
): boolean {
  if (altPunto == null || !Number.isFinite(Number(altPunto))) return true;
  if (altVigilante == null || !Number.isFinite(Number(altVigilante))) return false;
  return Math.abs(Number(altVigilante) - Number(altPunto)) <= ALTITUD_MAX_DELTA_M;
}

export type PuntoGps = {
  id: string;
  nombre: string;
  latitud: number;
  longitud: number;
  radioMetros: number;
  orden: number;
  altitud?: number | null;
};

export type MarcaLocal = {
  uuid: string;
  puntoId: string;
  puntoNombre: string;
  latitud: number;
  longitud: number;
  precisionMetros: number;
  fechaHora: string;
  dispositivoId: string;
  estado: 'pendiente' | 'enviado';
  altitud?: number | null;
};

export function candidatoMarcacion(opts: {
  lat: number;
  lng: number;
  accuracy: number;
  altitud?: number | null;
  puntos: PuntoGps[];
}):
  | { ok: true; punto: PuntoGps; distancia: number }
  | { ok: false; motivo: string; accuracy?: number; puntoNombre?: string; distancia?: number } {
  const ordenados = [...opts.puntos].sort((a, b) => a.orden - b.orden);
  let masCerca: { nombre: string; d: number } | null = null;
  let precisionBloquea = opts.puntos.length > 0;
  for (const p of ordenados) {
    const radio = Number(p.radioMetros) || 10;
    const d = distanciaMetros(
      opts.lat,
      opts.lng,
      Number(p.latitud),
      Number(p.longitud),
    );
    if (!masCerca || d < masCerca.d) masCerca = { nombre: p.nombre, d };
    if (opts.accuracy > Math.max(12, radio)) continue;
    precisionBloquea = false;
    if (!dentroDelRadio(d, radio)) continue;
    if (!alturaCoincide(p.altitud, opts.altitud)) {
      return {
        ok: false,
        motivo: 'altura',
        puntoNombre: p.nombre,
        distancia: Math.round(d),
      };
    }
    return { ok: true, punto: p, distancia: d };
  }
  if (precisionBloquea) return { ok: false, motivo: 'precision', accuracy: opts.accuracy };
  if (masCerca) {
    return {
      ok: false,
      motivo: 'lejos',
      puntoNombre: masCerca.nombre,
      distancia: Math.round(masCerca.d),
    };
  }
  return { ok: false, motivo: 'lejos' };
}

export function detectarMarcacion(opts: {
  lat: number;
  lng: number;
  accuracy: number;
  altitud?: number | null;
  puntos: PuntoGps[];
  marcas: MarcaLocal[];
  antiDupMin: number;
  dispositivoId: string;
}): MarcaLocal | { motivo: string; accuracy?: number; puntoNombre?: string; distancia?: number } {
  const hit = candidatoMarcacion(opts);
  if (!hit.ok) return hit;
  const ahora = Date.now();
  const ultima = opts.marcas
    .filter((m) => m.puntoId === hit.punto.id)
    .sort((a, b) => +new Date(b.fechaHora) - +new Date(a.fechaHora))[0];
  if (ultima && ahora - +new Date(ultima.fechaHora) < opts.antiDupMin * 60000) {
    return { motivo: 'lejos', puntoNombre: hit.punto.nombre, distancia: Math.round(hit.distancia) };
  }
  return {
    uuid: crypto.randomUUID(),
    puntoId: hit.punto.id,
    puntoNombre: hit.punto.nombre,
    latitud: opts.lat,
    longitud: opts.lng,
    precisionMetros: Math.round(opts.accuracy * 10) / 10,
    fechaHora: new Date().toISOString(),
    dispositivoId: opts.dispositivoId,
    estado: 'pendiente',
    altitud: opts.altitud ?? null,
  };
}
