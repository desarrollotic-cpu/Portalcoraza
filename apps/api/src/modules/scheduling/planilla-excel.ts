import ExcelJS from 'exceljs';
import { getColombiaHolidays } from './utils/colombia-holidays';

/** exceljs llega distinto en Nest (ESM) vs Jest (CJS). */
function makeWorkbook(): ExcelJS.Workbook {
  const loaded = (ExcelJS as unknown) ?? require('exceljs');
  const mod = loaded as {
    Workbook?: new () => ExcelJS.Workbook;
    default?: { Workbook: new () => ExcelJS.Workbook };
  };
  const Ctor = mod?.Workbook ?? mod?.default?.Workbook;
  if (Ctor) return new Ctor();
  const cjs = require('exceljs') as { Workbook: new () => ExcelJS.Workbook };
  return new cjs.Workbook();
}

export interface PlanillaDayCell {
  codigo: string | null;
  inicio?: string | null;
  fin?: string | null;
}

export interface PlanillaRoleRow {
  label: string;
  associateName: string;
  document: string;
  /** Código por día (índice 0 = día 1). Acepta string o {codigo,inicio,fin}. */
  codes: Array<string | PlanillaDayCell | null>;
}

export interface PlanillaPostSheet {
  postName: string;
  status: string;
  roles: PlanillaRoleRow[];
}

const MONTH_NAMES = [
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

const THIN = { style: 'thin' as const, color: { argb: 'FF94A3B8' } };
const BORDER = { top: THIN, left: THIN, bottom: THIN, right: THIN };

function fill(argb: string): ExcelJS.Fill {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb } };
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function excelSheetName(name: string, used: Set<string>): string {
  const cleaned =
    name.replace(/[\[\]*\/\\?:]/g, ' ').replace(/\s+/g, ' ').trim() || 'Puesto';
  let n = cleaned.slice(0, 31);
  let i = 2;
  while (used.has(n.toLowerCase())) {
    const suffix = ` (${i})`;
    n = `${cleaned.slice(0, Math.max(1, 31 - suffix.length))}${suffix}`;
    i += 1;
  }
  used.add(n.toLowerCase());
  return n;
}

/** Horas entre inicio y fin (soporta turno nocturno que cruza medianoche). */
export function hoursBetween(
  inicio?: string | null,
  fin?: string | null,
): number | null {
  if (!inicio || !fin) return null;
  const parse = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    return h * 60 + m;
  };
  const a = parse(inicio);
  const b0 = parse(fin);
  if (a == null || b0 == null) return null;
  let b = b0;
  if (b <= a) b += 24 * 60;
  return Math.round((b - a) / 60);
}

/**
 * Etiqueta de planilla con horas: D→D12, N→N12, D8, N8, D9, N9…
 * Descansos / novedades se dejan igual (DR, VAC, IN…).
 */
export function formatPlanillaCode(
  codigo: string | null | undefined,
  inicio?: string | null,
  fin?: string | null,
): string | null {
  if (!codigo?.trim()) return null;
  const c = codigo.trim().toUpperCase();
  if (['DR', 'NR', 'VAC', 'LC', 'IN', 'SP', 'AC', 'L'].includes(c)) return c;
  if (/^[DN]\d+$/.test(c)) return c;

  const hours = hoursBetween(inicio, fin);
  if (c === 'D8') return 'D8';
  if (c === 'N8') return 'N8';
  if (c === 'D9') return 'D9';
  if (c === 'N9') return 'N9';
  if (c === 'D') return `D${hours ?? 12}`;
  if (c === 'N') return `N${hours ?? 12}`;

  if (hours != null && (c.startsWith('D') || c.startsWith('N'))) {
    return `${c[0]}${hours}`;
  }
  return c;
}

function resolveDisplayCode(raw: string | PlanillaDayCell | null): string | null {
  if (raw == null) return null;
  if (typeof raw === 'string') return formatPlanillaCode(raw);
  return formatPlanillaCode(raw.codigo, raw.inicio, raw.fin);
}

function codeStyle(code: string | null): { bg: string; fg: string; bold: boolean } {
  const c = (code ?? '').toUpperCase();
  if (/^D\d*$/.test(c)) return { bg: 'FFFEF08A', fg: 'FF854D0E', bold: true };
  if (/^N\d*$/.test(c)) return { bg: 'FFBBF7D0', fg: 'FF166534', bold: true };
  if (c === 'DR' || c === 'NR' || c === 'L') return { bg: 'FFF1F5F9', fg: 'FF475569', bold: false };
  if (c === 'IN' || c === 'VAC' || c === 'LC' || c === 'SP' || c === 'AC') {
    return { bg: 'FFFEE2E2', fg: 'FF991B1B', bold: true };
  }
  return { bg: 'FFFFFFFF', fg: 'FF334155', bold: false };
}

function dayHeaderStyle(
  year: number,
  month: number,
  day: number,
  holidays: Set<string>,
): { bg: string; fg: string } {
  const d = new Date(year, month - 1, day);
  const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  if (d.getDay() === 0) return { bg: 'FFFEE2E2', fg: 'FF991B1B' };
  if (holidays.has(iso)) return { bg: 'FFFEF3C7', fg: 'FF92400E' };
  return { bg: 'FFF8FAFC', fg: 'FF1E293B' };
}

function paint(cell: ExcelJS.Cell, opts: {
  value: ExcelJS.CellValue;
  bg: string;
  fg: string;
  bold?: boolean;
  size?: number;
  align?: ExcelJS.Alignment['horizontal'];
  wrap?: boolean;
}): void {
  cell.value = opts.value;
  cell.fill = fill(opts.bg);
  cell.font = {
    name: 'Calibri',
    size: opts.size ?? 9,
    bold: opts.bold ?? false,
    color: { argb: opts.fg },
  };
  cell.alignment = {
    horizontal: opts.align ?? 'center',
    vertical: 'middle',
    wrapText: opts.wrap ?? true,
  };
  cell.border = BORDER;
}

/**
 * Planilla cartelera (mismo layout que el PDF): una hoja por puesto, landscape 1 página.
 */
export function buildPlanillaWorkbook(args: {
  year: number;
  month: number;
  posts: PlanillaPostSheet[];
}): ExcelJS.Workbook {
  const { year, month, posts } = args;
  const days = daysInMonth(year, month);
  const lastCol = 1 + days;
  const monthLabel = `${MONTH_NAMES[month - 1] ?? `MES ${month}`} DE ${year}`;
  const holidays = new Set(getColombiaHolidays(year).map((h) => h.date));
  const emitted = new Date().toLocaleDateString('es-CO');

  const wb = makeWorkbook();
  wb.creator = 'Portal Coraza Seguridad C.T.A.';
  wb.created = new Date();

  const usedNames = new Set<string>();

  for (const post of posts) {
    const ws = wb.addWorksheet(excelSheetName(post.postName, usedNames), {
      pageSetup: {
        orientation: 'landscape',
        paperSize: 9,
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 1,
        horizontalCentered: true,
        margins: { left: 0.3, right: 0.3, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 },
      },
      views: [{ showGridLines: false, zoomScale: 90 }],
    });

    ws.getColumn(1).width = 28;
    for (let d = 1; d <= days; d++) ws.getColumn(d + 1).width = 4.6;

    ws.mergeCells(1, 1, 1, lastCol);
    paint(ws.getCell(1, 1), {
      value: 'CORAZA SEGURIDAD C.T.A. — La Seguridad un Compromiso de Todos',
      bg: 'FF0369A1',
      fg: 'FFFFFFFF',
      bold: true,
      size: 13,
    });
    ws.getRow(1).height = 22;

    ws.mergeCells(2, 1, 2, lastCol);
    paint(ws.getCell(2, 1), {
      value:
        'NIT: 811.026.837-1 · VIGILADO Supervigilancia Resolución 6889 del 29 de septiembre de 2011',
      bg: 'FFF8FAFC',
      fg: 'FF64748B',
      size: 8,
    });

    ws.mergeCells(3, 1, 3, lastCol);
    paint(ws.getCell(3, 1), {
      value: `PLANILLA OFICIAL DE PROGRAMACIÓN DE PUESTO  |  Periodo: ${monthLabel}`,
      bg: 'FF0F172A',
      fg: 'FFFFFFFF',
      bold: true,
      size: 10,
    });
    ws.getRow(3).height = 18;

    ws.mergeCells(4, 1, 4, lastCol);
    paint(ws.getCell(4, 1), {
      value: `PUESTO DE SERVICIO: ${post.postName}   |   ESTADO: ${String(post.status).toUpperCase()}   |   FECHA EMISIÓN: ${emitted}`,
      bg: 'FF0369A1',
      fg: 'FFFFFFFF',
      bold: true,
      size: 9,
      align: 'left',
    });

    ws.mergeCells(5, 1, 5, lastCol);
    paint(ws.getCell(5, 1), {
      value:
        'CONVENCIONES:  D12 Diurno 12h  ·  N12 Nocturno 12h  ·  D8/N8 8h  ·  D9/N9 9h  ·  DR Descanso  ·  IN Incapacidad  ·  VAC Vacaciones  ·  ■ Domingos/Festivos',
      bg: 'FFF1F5F9',
      fg: 'FF334155',
      size: 8,
      align: 'left',
    });
    ws.getRow(5).height = 16;

    const headerRow = 6;
    paint(ws.getCell(headerRow, 1), {
      value: 'Rol / Personal',
      bg: 'FF0F172A',
      fg: 'FFFFFFFF',
      bold: true,
      size: 9,
      align: 'left',
    });
    for (let d = 1; d <= days; d++) {
      const st = dayHeaderStyle(year, month, d, holidays);
      paint(ws.getCell(headerRow, d + 1), {
        value: d,
        bg: st.bg,
        fg: st.fg,
        bold: true,
        size: 8,
      });
    }
    ws.getRow(headerRow).height = 18;

    let r = headerRow + 1;
    for (const role of post.roles) {
      paint(ws.getCell(r, 1), {
        value: `${role.label}\n${role.associateName}\n${role.document}`,
        bg: 'FFF8FAFC',
        fg: 'FF0F172A',
        size: 8,
        align: 'left',
      });
      ws.getRow(r).height = 36;
      for (let d = 1; d <= days; d++) {
        const display = resolveDisplayCode(role.codes[d - 1] ?? null);
        const st = codeStyle(display);
        paint(ws.getCell(r, d + 1), {
          value: display || '—',
          bg: st.bg,
          fg: st.fg,
          bold: st.bold,
          size: 7,
        });
      }
      r += 1;
    }

    if (!post.roles.length) {
      ws.mergeCells(r, 1, r, lastCol);
      paint(ws.getCell(r, 1), {
        value: 'Sin roles en este puesto.',
        bg: 'FFFFFFFF',
        fg: 'FF64748B',
        size: 9,
      });
      r += 1;
    }

    r += 1;
    ws.mergeCells(r, 1, r, lastCol);
    paint(ws.getCell(r, 1), {
      value:
        'SUPERVISOR DE OPERACIONES                    COORDINADOR DE PUESTO                    ADMINISTRADOR / CLIENTE',
      bg: 'FFFFFFFF',
      fg: 'FF0F172A',
      size: 8,
    });
    r += 1;
    ws.mergeCells(r, 1, r, lastCol);
    paint(ws.getCell(r, 1), {
      value:
        'info@corazaseguridadcta.com  ·  www.corazaseguridadcta.com  ·  PBX (604) 4447929  ·  Medellín - Colombia',
      bg: 'FFFFFFFF',
      fg: 'FF64748B',
      size: 8,
    });

    ws.pageSetup.printArea = `A1:${ws.getCell(r, lastCol).address}`;
  }

  if (!wb.worksheets.length) {
    const ws = wb.addWorksheet('Sin puestos');
    ws.getCell('A1').value = `No hay programaciones para ${monthLabel}`;
  }

  return wb;
}
