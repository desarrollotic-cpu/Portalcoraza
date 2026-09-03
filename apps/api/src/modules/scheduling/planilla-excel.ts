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

export interface PlanillaRoleRow {
  label: string;
  associateName: string;
  document: string;
  /** Código por día (índice 0 = día 1). */
  codes: Array<string | null>;
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

function codeStyle(code: string | null): { bg: string; fg: string; bold: boolean } {
  const c = (code ?? '').toUpperCase();
  if (c === 'D' || c === 'D8') return { bg: 'FFFEF08A', fg: 'FF854D0E', bold: true };
  if (c === 'N' || c === 'N8') return { bg: 'FFBBF7D0', fg: 'FF166534', bold: true };
  if (c === 'DR' || c === 'NR' || c === 'L') return { bg: 'FFF1F5F9', fg: 'FF475569', bold: false };
  if (c === 'IN' || c === 'VAC' || c === 'LC' || c === 'SP') {
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
    for (let d = 1; d <= days; d++) ws.getColumn(d + 1).width = 3.4;

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
        'CONVENCIONES:  D Diurno 12h (06:00-18:00)  ·  N Nocturno 12h (18:00-06:00)  ·  DR Descanso remunerado  ·  IN Incapacidad  ·  VAC Vacaciones  ·  ■ Domingos / Festivos',
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
        const code = role.codes[d - 1] ?? null;
        const st = codeStyle(code);
        paint(ws.getCell(r, d + 1), {
          value: code || '—',
          bg: st.bg,
          fg: st.fg,
          bold: st.bold,
          size: 8,
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
