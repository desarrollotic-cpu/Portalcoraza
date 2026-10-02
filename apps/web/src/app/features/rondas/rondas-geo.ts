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

export type PuntoGps = {
  id: string;
  nombre: string;
  latitud: number;
  longitud: number;
  radioMetros: number;
  orden: number;
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
};

export function detectarMarcacion(opts: {
  lat: number;
  lng: number;
  accuracy: number;
  puntos: PuntoGps[];
  marcas: MarcaLocal[];
  antiDupMin: number;
  precisionMax: number;
  dispositivoId: string;
}): MarcaLocal | { motivo: string; accuracy?: number } {
  if (opts.accuracy > opts.precisionMax) {
    return { motivo: 'precision', accuracy: opts.accuracy };
  }
  const ahora = Date.now();
  const ordenados = [...opts.puntos].sort((a, b) => a.orden - b.orden);
  for (const p of ordenados) {
    const d = distanciaMetros(opts.lat, opts.lng, p.latitud, p.longitud);
    if (d > p.radioMetros) continue;
    const ultima = opts.marcas
      .filter((m) => m.puntoId === p.id)
      .sort((a, b) => +new Date(b.fechaHora) - +new Date(a.fechaHora))[0];
    if (ultima && ahora - +new Date(ultima.fechaHora) < opts.antiDupMin * 60000) {
      continue;
    }
    return {
      uuid: crypto.randomUUID(),
      puntoId: p.id,
      puntoNombre: p.nombre,
      latitud: opts.lat,
      longitud: opts.lng,
      precisionMetros: Math.round(opts.accuracy * 10) / 10,
      fechaHora: new Date().toISOString(),
      dispositivoId: opts.dispositivoId,
      estado: 'pendiente',
    };
  }
  return { motivo: 'lejos' };
}
