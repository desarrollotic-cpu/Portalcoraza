import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import {
  AnalisisConsolidado,
  Bonificacion,
  FilaBase,
  PeriodoDetectado,
  PeriodoElegido,
  Quincena,
  TotalConcepto,
  ZonaDetectada,
} from './conversion.types';

/** Error de negocio de la conversión (el controller lo traduce a HTTP 400; el CLI lo imprime). */
export class ConversionError extends Error {}

/** Primera columna (AH) desde donde se leen los conceptos. */
const COL_INICIO_CONCEPTOS = 34;
const FILA_ENCABEZADOS = 3;
const FILA_INICIO_DATOS = 5;
const CODIGO_DECIMALES = '011';
/** Orden fijo de conceptos dentro de cada hoja; el resto va por posición de columna. */
const ORDEN_CONCEPTOS = ['001', '013', '018', '014', '011', '019', '628', '711'];
const EQUIVALENCIAS: Record<string, string> = {
  SALUD: '628',
  PENSION: '711',
  APORTESVOLUNTARIO: '568',
  APORTESVOLUNTARIOS: '568',
  EMI: '562',
};
/** Encabezados sin código que no son conceptos: no generan advertencia. */
const IGNORADOS = [
  /^VALORAPAGAR$/,
  /^TOTALAGANAR$/,
  /^GRANTOTAL$/,
  /^DEDUCCION(N\+\d+)?$/,
  /^VALORAJUSTEJORNADA/,
];
const MESES = [
  'ENERO',
  'FEBRERO',
  'MARZO',
  'ABRIL',
  'MAYO',
  'JUNIO',
  'JULIO',
  'AGOSTO',
  'SEPTIEMBRE',
  'OCTUBRE',
  'NOVIEMBRE',
  'DICIEMBRE',
];

/**
 * Redondeo half-up. Pesos (0 decimales): primero a 6 decimales y luego al entero, así el
 * ruido de coma flotante no cuenta (124547.49999999999 → 124548). Con decimales (concepto 011):
 * 15 cifras significativas como Excel (que es quien hizo el BASE manual); pasar antes por
 * 6 decimales haría doble redondeo (x.xx4999999 → x.xx5 → x.xx+1) y no coincide con el total
 * de referencia de septiembre.
 */
export function redondear(valor: number, decimales = 0): number {
  let r: number;
  if (decimales === 0) {
    const a6 = Math.round(Number((valor * 1e6).toPrecision(15))) / 1e6; // absorbe el ruido binario
    r = Math.round(a6);
  } else {
    // Como Excel: se toman 15 cifras significativas antes de redondear
    // (151161.46499999985 se ve como 151161.465 y redondea a 151161.47).
    const n = Number(valor.toPrecision(15));
    r = Math.round(Number((n * 10 ** decimales).toPrecision(15))) / 10 ** decimales;
  }
  return r === 0 ? 0 : r; // evita -0
}
function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\s+/g, '');
}

/** Valor calculado (cacheado) de la celda, nunca la fórmula. */
function valorCelda(cell: ExcelJS.Cell): unknown {
  let v: unknown = cell.value;
  if (v && typeof v === 'object' && !(v instanceof Date)) {
    const o = v as Record<string, unknown>;
    if ('result' in o) v = o['result'];
    else if (Array.isArray(o['richText'])) {
      v = (o['richText'] as Array<{ text?: string }>).map((t) => t.text ?? '').join('');
    } else if ('text' in o) v = o['text'];
    else v = null;
  }
  if (v && typeof v === 'object' && !(v instanceof Date)) return null; // {error: '#N/A'}
  return v;
}

function aNumero(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

function aTexto(v: unknown): string {
  return v === null || v === undefined ? '' : String(v).trim();
}

type Columna =
  | { tipo: 'concepto'; codigo: string }
  | { tipo: 'bonificacion' }
  | { tipo: 'ignorar' }
  | { tipo: 'desconocido' };

function clasificarEncabezado(texto: string): Columna {
  const t = texto.trim();
  const n = normalizar(t);
  if (!n) return { tipo: 'ignorar' };
  if (n.startsWith('BONIFICACION')) return { tipo: 'bonificacion' };
  if (n.startsWith('VALORAJUSTEJORNADA')) return { tipo: 'ignorar' };
  const m = /(?<!\d)(\d{3})$/.exec(t);
  if (m) return { tipo: 'concepto', codigo: m[1] };
  const eq = EQUIVALENCIAS[n];
  if (eq) return { tipo: 'concepto', codigo: eq };
  if (IGNORADOS.some((r) => r.test(n))) return { tipo: 'ignorar' };
  return { tipo: 'desconocido' };
}

interface FilaAsociado {
  fila: number;
  cedula: string;
  nombre: string;
}

function leerAsociados(ws: ExcelJS.Worksheet, avisos: string[]): FilaAsociado[] {
  const out: FilaAsociado[] = [];
  let cedulasTexto = 0;
  for (let r = FILA_INICIO_DATOS; r <= ws.rowCount; r++) {
    const v = valorCelda(ws.getRow(r).getCell(1));
    if (typeof v === 'number' && Number.isFinite(v)) {
      out.push({
        fila: r,
        cedula: String(Math.trunc(v)),
        nombre: aTexto(valorCelda(ws.getRow(r).getCell(2))),
      });
    } else if (typeof v === 'string' && /^\d{5,}$/.test(v.trim())) {
      cedulasTexto += 1;
    }
  }
  if (cedulasTexto > 0) {
    avisos.push(
      `${ws.name}: ${cedulasTexto} fila(s) con la cédula guardada como texto en la columna A se omitieron (solo se leen cédulas numéricas).`,
    );
  }
  return out;
}

@Injectable()
export class PayrollConversionService {
  /** Lee el consolidado y arma las filas del BASE sin modificar, validar ni recalcular valores. */
  async analizar(buffer: Buffer): Promise<AnalisisConsolidado> {
    const wb = new ExcelJS.Workbook();
    try {
      await wb.xlsx.load(buffer as unknown as ExcelJS.Buffer);
    } catch {
      throw new ConversionError('El archivo no es un Excel (.xlsx) válido.');
    }

    const advertencias: string[] = [];
    const hojasZona = wb.worksheets
      .map((ws, idx) => ({ ws, idx, m: /^\s*ZONA\s*(\d+)/i.exec(ws.name) }))
      .filter((h): h is { ws: ExcelJS.Worksheet; idx: number; m: RegExpExecArray } => !!h.m)
      .map((h) => ({ ws: h.ws, idx: h.idx, numero: parseInt(h.m[1], 10) }));
    if (hojasZona.length === 0) {
      throw new ConversionError(
        'No se encontraron hojas ZONA en el archivo (el nombre debe empezar por "ZONA" y un número).',
      );
    }
    const vistos = new Set<number>();
    for (const h of hojasZona) {
      if (vistos.has(h.numero)) advertencias.push(`Hay más de una hoja para la zona ${h.numero}.`);
      vistos.add(h.numero);
    }

    // Zonas en orden numérico ascendente (sin importar el orden de las pestañas); INCAPACITADOS
    // se procesa con las mismas reglas pero siempre al final.
    const ordenadas = [...hojasZona].sort((a, b) => a.numero - b.numero || a.idx - b.idx);
    const hojaIncap = wb.worksheets.find((s) => normalizar(s.name).startsWith('INCAPACITADOS'));
    const hojas: Array<{ ws: ExcelJS.Worksheet; numero: number | null }> = [
      ...ordenadas.map(({ ws, numero }) => ({ ws, numero })),
      ...(hojaIncap ? [{ ws: hojaIncap, numero: null }] : []),
    ];

    const periodo = this.detectarPeriodo(ordenadas[0].ws, hojas, advertencias);

    const zonas: ZonaDetectada[] = [];
    const filas: FilaBase[] = [];
    const bonificaciones: Bonificacion[] = [];

    for (const { ws, numero } of hojas) {
      const asociados = leerAsociados(ws, advertencias);
      zonas.push({ nombre: ws.name.trim(), numero, asociados: asociados.length });

      // Columnas por código, en el orden de aparición de izquierda a derecha.
      const porCodigo = new Map<string, number[]>();
      const colsBonif: number[] = [];
      const desconocidas: Array<{ col: number; texto: string }> = [];
      for (let c = COL_INICIO_CONCEPTOS; c <= ws.columnCount; c++) {
        const texto = aTexto(valorCelda(ws.getRow(FILA_ENCABEZADOS).getCell(c)));
        const k = clasificarEncabezado(texto);
        if (k.tipo === 'concepto') {
          const lista = porCodigo.get(k.codigo) ?? [];
          lista.push(c);
          porCodigo.set(k.codigo, lista);
        } else if (k.tipo === 'bonificacion') colsBonif.push(c);
        else if (k.tipo === 'desconocido') desconocidas.push({ col: c, texto });
      }
      if (porCodigo.size === 0) {
        advertencias.push(`${ws.name}: no se reconoció ningún encabezado de concepto en la fila 3.`);
      }

      let textoNumerico = 0;
      let negativos = 0;
      const valorRaw = (fila: number, col: number): number => {
        const v = valorCelda(ws.getRow(fila).getCell(col));
        if (typeof v === 'string' && /^-?\d+([.,]\d+)?$/.test(v.trim())) textoNumerico += 1;
        return aNumero(v);
      };

      for (const d of desconocidas) {
        const conDatos = asociados.some((a) => aNumero(valorCelda(ws.getRow(a.fila).getCell(d.col))) !== 0);
        if (conDatos) {
          advertencias.push(
            `${ws.name}: el encabezado "${d.texto}" (columna ${ws.getColumn(d.col).letter}) tiene valores pero no se pudo mapear a un concepto; no se convirtió.`,
          );
        }
      }

      const primeraCol = (codigo: string) => (porCodigo.get(codigo) as number[])[0];
      const codigos = [
        ...ORDEN_CONCEPTOS.filter((c) => porCodigo.has(c)),
        ...[...porCodigo.keys()]
          .filter((c) => !ORDEN_CONCEPTOS.includes(c))
          .sort((a, b) => primeraCol(a) - primeraCol(b)),
      ];

      for (const codigo of codigos) {
        const cols = porCodigo.get(codigo) as number[];
        const dec = codigo === CODIGO_DECIMALES ? 2 : 0;
        for (const a of asociados) {
          let suma = 0;
          for (const c of cols) suma += valorRaw(a.fila, c);
          const valor = redondear(suma, dec);
          if (valor === 0) continue;
          if (valor < 0) negativos += 1;
          filas.push({ cedula: a.cedula, codigo, valor });
        }
      }

      for (const a of asociados) {
        let suma = 0;
        for (const c of colsBonif) suma += valorRaw(a.fila, c);
        const valor = redondear(suma);
        if (valor !== 0) bonificaciones.push({ zona: ws.name.trim(), cedula: a.cedula, nombre: a.nombre, valor });
      }

      if (textoNumerico > 0) {
        advertencias.push(
          `${ws.name}: ${textoNumerico} celda(s) con números guardados como texto; se tomaron como 0 según la regla de lectura.`,
        );
      }
      if (negativos > 0) {
        advertencias.push(`${ws.name}: ${negativos} valor(es) negativo(s) copiados tal cual.`);
      }
    }

    return {
      periodo,
      zonas,
      filas,
      totales: this.totalizar(filas),
      bonificaciones,
      totalBonificaciones: bonificaciones.reduce((s, b) => s + b.valor, 0),
      advertencias,
    };
  }

  private detectarPeriodo(
    primera: ExcelJS.Worksheet,
    todas: Array<{ ws: ExcelJS.Worksheet }>,
    advertencias: string[],
  ): PeriodoDetectado {
    const leer = (ws: ExcelJS.Worksheet) => {
      const y = valorCelda(ws.getCell('Y1'));
      const anio = typeof y === 'number' ? Math.trunc(y) : /^\d{4}$/.test(aTexto(y)) ? parseInt(aTexto(y), 10) : null;
      const mv = valorCelda(ws.getCell('AA1'));
      const mi = typeof mv === 'number' ? mv - 1 : MESES.indexOf(normalizar(aTexto(mv)));
      const mes = mi >= 0 && mi < 12 ? mi + 1 : null;
      const q = normalizar(aTexto(valorCelda(ws.getCell('AC1'))));
      const quincena: Quincena | null = q.startsWith('PRIMERA') ? 'Primera' : q.startsWith('SEGUNDA') ? 'Segunda' : null;
      return { anio, mes, quincena };
    };
    const p = leer(primera);
    if (p.anio === null || p.mes === null || p.quincena === null) {
      advertencias.push(
        `No se pudo leer el período en ${primera.name} (celdas Y1, AA1 y AC1). Indícalo manualmente.`,
      );
      return { anio: p.anio, mes: p.mes, quincena: p.quincena, periodo: null, fecha: null };
    }
    for (const { ws } of todas) {
      const o = leer(ws);
      if (o.anio !== p.anio || o.mes !== p.mes || o.quincena !== p.quincena) {
        advertencias.push(`${ws.name}: el encabezado de período difiere del de ${primera.name}.`);
      }
    }
    const mm = String(p.mes).padStart(2, '0');
    return {
      anio: p.anio,
      mes: p.mes,
      quincena: p.quincena,
      periodo: mm,
      fecha: `${mm}/${p.quincena === 'Primera' ? '15' : '30'}/${p.anio}`,
    };
  }

  private totalizar(filas: FilaBase[]): TotalConcepto[] {
    const m = new Map<string, { filas: number; centavos: number }>();
    for (const f of filas) {
      const t = m.get(f.codigo) ?? { filas: 0, centavos: 0 };
      t.filas += 1;
      t.centavos += Math.round(f.valor * 100);
      m.set(f.codigo, t);
    }
    return [...m.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([codigo, t]) => ({ codigo, filas: t.filas, suma: t.centavos / 100 }));
  }

  /** Período y fecha a usar: los detectados o los corregidos por la usuaria. */
  resolverPeriodo(a: AnalisisConsolidado, ajuste?: { periodo?: string; fecha?: string }): PeriodoElegido {
    const periodo = (ajuste?.periodo ?? a.periodo.periodo ?? '').trim();
    const fecha = (ajuste?.fecha ?? a.periodo.fecha ?? '').trim();
    if (!periodo || !fecha) {
      throw new ConversionError('No se pudo detectar el período y la fecha; indícalos manualmente.');
    }
    if (!/^(0[1-9]|1[0-2])$/.test(periodo)) {
      throw new ConversionError('El período debe ser el mes con 2 dígitos (01 a 12).');
    }
    const m = /^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/(\d{4})$/.exec(fecha);
    if (!m) throw new ConversionError('La fecha debe tener el formato MM/DD/AAAA.');
    return {
      periodo,
      fecha,
      quincena: parseInt(m[2], 10) <= 15 ? '1Q' : '2Q',
      mesNombre: MESES[parseInt(periodo, 10) - 1],
      anio: parseInt(m[3], 10),
    };
  }

  nombreBase(p: PeriodoElegido): string {
    return `BASE_${p.quincena}_${p.mesNombre}_${p.anio}.xlsx`;
  }

  nombreResumen(p: PeriodoElegido): string {
    return `RESUMEN_${p.quincena}_${p.mesNombre}_${p.anio}.xlsx`;
  }

  /** BASE con el mismo formato del archivo manual que se sube al programa de nómina. */
  async generarBase(a: AnalisisConsolidado, p: PeriodoElegido): Promise<Buffer> {
    const fuente = { name: 'Aptos Narrow', size: 11, family: 2 };
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Hoja1', { views: [{ zoomScale: 80, zoomScaleNormal: 80 }] });
    const encabezados = [
      'Cédula Empleado',
      'Código Concepto',
      'Código Centro de Costos',
      'Código Concepto Referencia',
      'Horas',
      'Valor',
      'Período',
      'Fecha',
      'Salario',
      'Unidades Producidas',
      'Es Prestación',
      'Número Prestamo',
      'Días mes 1',
      'Días mes 2',
    ];
    const anchos = [17, 16.85546875, 23.42578125, 23.42578125, 9.28515625, 11.42578125, 9, 11.85546875, 9.42578125, 20.42578125, 13.140625, 13.7109375, 10.7109375, 10.7109375];
    // '@' texto · E hora con 6 decimales · F/I/J con 2 · M/N enteros
    const formatos = ['@', '@', '@', '@', '###0.000000', '###0.00', '@', '@', '###0.00', '###0.00', '@', '@', '0', '0'];
    ws.columns = anchos.map((width) => ({ width }));

    const cab = ws.getRow(1);
    encabezados.forEach((h, i) => {
      const c = cab.getCell(i + 1);
      c.value = h;
      c.numFmt = '@';
      c.font = { ...fuente, bold: true };
    });
    cab.commit();

    a.filas.forEach((f, i) => {
      const row = ws.getRow(i + 2);
      const valores: Array<string | number> = [
        f.cedula,
        f.codigo,
        '20',
        '   ',
        0,
        f.valor,
        p.periodo,
        p.fecha,
        0,
        0,
        '', // Es Prestación: texto vacío, no celda nula
        '         ',
        0,
        0,
      ];
      valores.forEach((v, j) => {
        const c = row.getCell(j + 1);
        c.value = v;
        c.numFmt = formatos[j];
        c.font = fuente;
      });
      row.getCell(2).alignment = { horizontal: 'left' };
      row.commit();
    });
    ws.autoFilter = `A1:N${a.filas.length + 1}`;
    return Buffer.from(await wb.xlsx.writeBuffer());
  }

  /** RESUMEN de control: totales por concepto y bonificaciones (manuales). */
  async generarResumen(a: AnalisisConsolidado): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    const negrita = (ws: ExcelJS.Worksheet, fila: number) => {
      ws.getRow(fila).font = { bold: true };
    };

    const t = wb.addWorksheet('Totales por concepto');
    t.columns = [
      { header: 'Código', width: 12 },
      { header: 'Filas', width: 10 },
      { header: 'Suma del valor', width: 20 },
    ];
    negrita(t, 1);
    a.totales.forEach((x) => {
      const r = t.addRow([x.codigo, x.filas, x.suma]);
      r.getCell(1).numFmt = '@';
      r.getCell(3).numFmt = x.codigo === CODIGO_DECIMALES ? '#,##0.00' : '#,##0';
    });
    const total = t.addRow(['TOTAL FILAS', a.filas.length, null]);
    total.font = { bold: true };

    const b = wb.addWorksheet('Bonificaciones (manual)');
    b.columns = [
      { header: 'Zona', width: 12 },
      { header: 'Cédula', width: 16 },
      { header: 'Nombre', width: 44 },
      { header: 'Valor', width: 16 },
    ];
    negrita(b, 1);
    a.bonificaciones.forEach((x) => {
      const r = b.addRow([x.zona, x.cedula, x.nombre, x.valor]);
      r.getCell(2).numFmt = '@';
      r.getCell(4).numFmt = '#,##0';
    });
    const totalB = b.addRow(['TOTAL', null, `${a.bonificaciones.length} asociado(s)`, a.totalBonificaciones]);
    totalB.font = { bold: true };
    totalB.getCell(4).numFmt = '#,##0';

    return Buffer.from(await wb.xlsx.writeBuffer());
  }
}
