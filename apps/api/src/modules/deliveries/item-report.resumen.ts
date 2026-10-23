/** Línea de entrega simplificada: solo lo que entra al desglose por talla/género. */
export type EntregaLinea = {
  talla: string | null;
  genero: string | null;
  color: string | null;
  sku: string;
  cantidad: number;
};

export type FilaResumen = {
  talla: string;
  genero: string;
  color: string;
  sku: string;
  cantidad: number;
};

const SIN = '—';
const GENERO_LABEL: Record<string, string> = {
  M: 'Hombre',
  H: 'Hombre',
  MASCULINO: 'Hombre',
  HOMBRE: 'Hombre',
  F: 'Mujer',
  MUJER: 'Mujer',
  FEMENINO: 'Mujer',
  U: 'Unisex',
  UNISEX: 'Unisex',
};

export function etiquetaGenero(valor: string | null | undefined): string {
  const key = String(valor ?? '').trim().toUpperCase();
  if (!key) return SIN;
  return GENERO_LABEL[key] ?? (valor as string);
}

const limpiar = (v: string | null | undefined) => {
  const s = String(v ?? '').trim();
  return s || SIN;
};

/**
 * Agrupa las entregas por talla + género + color. Si dos variantes coinciden
 * en ese trío pero no en SKU, se separan: el SKU lo pide la administración
 * para no confundir dos piezas distintas con el mismo rotulado.
 */
export function agruparPorTallaGenero(lineas: EntregaLinea[]): FilaResumen[] {
  const mapa = new Map<string, FilaResumen>();
  for (const l of lineas) {
    const talla = limpiar(l.talla);
    const genero = etiquetaGenero(l.genero);
    const color = limpiar(l.color);
    const sku = limpiar(l.sku);
    const clave = `${talla}|${genero}|${color}|${sku}`;
    const prev = mapa.get(clave);
    if (prev) {
      prev.cantidad += l.cantidad;
    } else {
      mapa.set(clave, { talla, genero, color, sku, cantidad: l.cantidad });
    }
  }
  return [...mapa.values()].sort((a, b) => {
    if (a.genero !== b.genero) return a.genero.localeCompare(b.genero, 'es');
    if (a.talla !== b.talla) return a.talla.localeCompare(b.talla, 'es', { numeric: true });
    if (a.color !== b.color) return a.color.localeCompare(b.color, 'es');
    return a.sku.localeCompare(b.sku, 'es');
  });
}

export function totalesPorGenero(filas: FilaResumen[]): Array<{ genero: string; cantidad: number }> {
  const mapa = new Map<string, number>();
  for (const f of filas) {
    mapa.set(f.genero, (mapa.get(f.genero) ?? 0) + f.cantidad);
  }
  return [...mapa.entries()]
    .map(([genero, cantidad]) => ({ genero, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad);
}

export function totalGeneral(filas: FilaResumen[]): number {
  return filas.reduce((s, f) => s + f.cantidad, 0);
}
