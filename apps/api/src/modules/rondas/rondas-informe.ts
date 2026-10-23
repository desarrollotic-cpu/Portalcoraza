export type SesionInforme = {
  id: string;
  rutaId: string;
  postId: string;
  puestoNombre: string;
  rondaNombre: string;
  inicio: string;
  fin: string | null;
};

export type MarcaSesion = {
  sesionId: string;
  puntoId: string;
  puntoNombre: string;
  puntoOrden: number;
  fechaHora: string;
};

export type RondaInforme = {
  postId: string;
  puestoNombre: string;
  rondaNombre: string;
  fecha: string;
  numeroDia: number;
  inicio: string;
  fin: string;
  abierta: boolean;
  completa: boolean;
  esperados: number;
  puntos: Array<{
    puntoId: string;
    puntoNombre: string;
    puntoOrden: number;
    fechaHora: string;
  }>;
};

export function ymdBogota(iso: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso));
}

export function rangoMesBogota(anio: number, mes: number): { inicio: string; fin: string } {
  const mm = String(mes).padStart(2, '0');
  const inicio = `${anio}-${mm}-01T05:00:00.000Z`;
  const next = mes === 12 ? { y: anio + 1, m: 1 } : { y: anio, m: mes + 1 };
  const fin = `${next.y}-${String(next.m).padStart(2, '0')}-01T05:00:00.000Z`;
  return { inicio, fin };
}

export function fmtFechaHoraBogota(iso: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date(iso));
}

export function minutosEntre(a: string, b: string): number {
  return Math.max(0, Math.round((+new Date(b) - +new Date(a)) / 60000));
}

/** Una fila por sesión: inicio/fin reales; los puntos son las marcas de ese recorrido. */
export function armarRondas(
  sesiones: SesionInforme[],
  marcas: MarcaSesion[],
  esperadosPorRuta: Map<string, string[]>,
): RondaInforme[] {
  const porSesion = new Map<string, MarcaSesion[]>();
  for (const m of marcas) {
    const list = porSesion.get(m.sesionId) ?? [];
    list.push(m);
    porSesion.set(m.sesionId, list);
  }
  const ordenadas = [...sesiones].sort((a, b) => {
    if (a.puestoNombre !== b.puestoNombre) return a.puestoNombre.localeCompare(b.puestoNombre, 'es');
    if (a.rondaNombre !== b.rondaNombre) return a.rondaNombre.localeCompare(b.rondaNombre, 'es');
    return +new Date(a.inicio) - +new Date(b.inicio);
  });
  const n = new Map<string, number>();
  return ordenadas.map((s) => {
    const pts = (porSesion.get(s.id) ?? []).sort((a, b) => +new Date(a.fechaHora) - +new Date(b.fechaHora));
    const seen = new Set(pts.map((p) => p.puntoId));
    const esperados = esperadosPorRuta.get(s.rutaId) ?? [];
    const fin = s.fin || pts[pts.length - 1]?.fechaHora || s.inicio;
    const fecha = ymdBogota(s.inicio);
    const k = `${s.postId}|${s.rutaId}|${fecha}`;
    const numeroDia = (n.get(k) ?? 0) + 1;
    n.set(k, numeroDia);
    return {
      postId: s.postId,
      puestoNombre: s.puestoNombre,
      rondaNombre: s.rondaNombre,
      fecha,
      numeroDia,
      inicio: s.inicio,
      fin,
      abierta: !s.fin,
      completa: esperados.length > 0 && esperados.every((id) => seen.has(id)),
      esperados: esperados.length,
      puntos: pts.map((p) => ({
        puntoId: p.puntoId,
        puntoNombre: p.puntoNombre,
        puntoOrden: p.puntoOrden,
        fechaHora: p.fechaHora,
      })),
    };
  });
}
