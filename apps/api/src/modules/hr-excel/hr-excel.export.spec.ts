import * as ExcelJS from 'exceljs';
import { Writable } from 'stream';
import { Repository } from 'typeorm';
import { Associate, AssociateStatus } from '../associates/entities/associate.entity';
import { AuditService } from '../audit/audit.service';
import { HrExcelService } from './hr-excel.service';

/**
 * El directorio de asociados se escribe por lotes de 500. Se usan 1200 filas
 * para cruzar varias veces esa frontera: es donde se rompería el orden, el
 * zebra o la paginación.
 */
const TOTAL = 1200;

function makeAssociate(i: number): Associate {
  return {
    id: `id-${String(i).padStart(4, '0')}`,
    folderNumber: i,
    firstName: `Nombre${i}`,
    secondName: null,
    firstLastName: `Apellido${String(i).padStart(4, '0')}`,
    secondLastName: null,
    status: AssociateStatus.ACTIVO,
    documentNumber: `100${i}`,
    childrenCount: 0,
    dependentsCount: 0,
  } as unknown as Associate;
}

const ALL = Array.from({ length: TOTAL }, (_, i) => makeAssociate(i));

/** QueryBuilder mínimo: encadena y pagina sobre el array en memoria. */
function fakeQueryBuilder(source: Associate[]) {
  let skip = 0;
  let take = source.length;
  let ids: string[] | null = null;
  const qb = {
    leftJoinAndSelect: () => qb,
    orderBy: () => qb,
    addOrderBy: () => qb,
    whereInIds: (v: string[]) => {
      ids = v;
      return qb;
    },
    skip: (v: number) => {
      skip = v;
      return qb;
    },
    take: (v: number) => {
      take = v;
      return qb;
    },
    getMany: () => {
      if (ids) {
        const set = new Set(ids);
        return Promise.resolve(source.filter((a) => set.has(a.id)));
      }
      return Promise.resolve(source.slice(skip, skip + take));
    },
  };
  return qb;
}

function buildService(source: Associate[]): HrExcelService {
  const associatesRepo = {
    count: () => Promise.resolve(source.length),
    createQueryBuilder: () => fakeQueryBuilder(source),
    // Sin retiros: el reporte usa la fecha enriquecida o queda vacía.
    query: () => Promise.resolve([]),
  } as unknown as Repository<Associate>;

  const noop = {} as never;
  return new HrExcelService(
    associatesRepo,
    noop,
    noop,
    noop,
    noop,
    {} as AuditService,
  );
}

/** Recoge lo escrito en el stream, como haría la respuesta HTTP. */
function collector(): { out: Writable; text: () => string } {
  const chunks: string[] = [];
  const out = new Writable({
    write(chunk, _enc, cb) {
      chunks.push(String(chunk));
      cb();
    },
  });
  return { out, text: () => chunks.join('') };
}

async function render(source: Associate[], preloaded?: { id: string }[]) {
  const { out, text } = collector();
  await buildService(source).streamAssociates(out, preloaded);
  return text();
}

describe('HrExcelService.streamAssociates', () => {
  it('escribe el BOM una sola vez, al principio', async () => {
    const html = await render(ALL);
    expect(html.startsWith('﻿<html')).toBe(true);
    expect(html.split('﻿')).toHaveLength(2);
  });

  it('emite todas las filas aunque crucen varios lotes', async () => {
    const html = await render(ALL);
    expect(html.match(/<tr class="/g) ?? []).toHaveLength(TOTAL);
    expect(html).toContain(`${TOTAL} registros`);
    expect(html.trimEnd().endsWith('</body></html>')).toBe(true);
  });

  it('conserva el orden al pasar de un lote al siguiente', async () => {
    const html = await render(ALL);
    const first = html.indexOf('Apellido0499');
    const second = html.indexOf('Apellido0500');
    const third = html.indexOf('Apellido0501');
    expect(first).toBeGreaterThan(-1);
    expect(second).toBeGreaterThan(first);
    expect(third).toBeGreaterThan(second);
  });

  it('alterna el sombreado sin reiniciarlo en cada lote', async () => {
    const html = await render(ALL);
    const classes = [...html.matchAll(/<tr class="([^"]*)">/g)].map((m) => m[1]);
    expect(classes[0]).toBe('');
    expect(classes[1]).toBe(' even');
    // La fila 500 abre el segundo lote: su paridad debe seguir la global.
    expect(classes[500]).toBe('');
    expect(classes[501]).toBe(' even');
  });

  it('respeta el orden recibido cuando el listado ya filtró', async () => {
    const preloaded = [ALL[900], ALL[2], ALL[600]].map((a) => ({ id: a.id }));
    const html = await render(ALL, preloaded);
    expect(html.match(/<tr class="/g) ?? []).toHaveLength(3);
    expect(html.indexOf('Apellido0900')).toBeLessThan(html.indexOf('Apellido0002'));
    expect(html.indexOf('Apellido0002')).toBeLessThan(html.indexOf('Apellido0600'));
    expect(html).toContain('3 registros');
  });

  it('genera una celda por columna declarada', async () => {
    const html = await render([ALL[0]]);
    const columns = (html.match(/<th class="th">/g) ?? []).length;
    const cells = (html.match(/<td class="td-(?:text|center)"/g) ?? []).length;
    expect(columns).toBeGreaterThan(0);
    expect(cells).toBe(columns);
  });
});

describe('HrExcelService.streamComplianceMatrix', () => {
  const MATRIX = Array.from({ length: 1100 }, (_, i) => ({
    document_number: `CC${i}`,
    full_name: `Asociado ${String(i).padStart(4, '0')}`,
    position_name: `Cargo ${i % 5}`,
    work_center_code: `WC${i % 3}`,
    psychophysical_valid: i % 2 === 0,
    psychosensometric_valid: i % 3 === 0,
    has_sura_policy: false,
    psychophysical_expires_at: null,
    psychosensometric_expires_at: null,
    course_expires_at: i % 4 === 0 ? '2099-01-01' : null,
    sura_policy_expires_at: null,
  }));

  function matrixService(): HrExcelService {
    const associatesRepo = {
      // El servicio pagina con LIMIT $1 OFFSET $2.
      query: (_sql: string, params: [number, number]) =>
        Promise.resolve(MATRIX.slice(params[1], params[1] + params[0])),
    } as unknown as Repository<Associate>;
    const noop = {} as never;
    return new HrExcelService(
      associatesRepo,
      noop,
      noop,
      noop,
      noop,
      {} as AuditService,
    );
  }

  it('produce un xlsx válido con todas las filas', async () => {
    const parts: Buffer[] = [];
    const out = new Writable({
      write(chunk, _enc, cb) {
        parts.push(Buffer.from(chunk as Buffer));
        cb();
      },
    });

    await matrixService().streamComplianceMatrix(out);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(Buffer.concat(parts) as unknown as ArrayBuffer);
    const sheet = workbook.getWorksheet('Matriz SST');
    expect(sheet).toBeDefined();
    // Cabecera + una fila por asociado.
    expect(sheet!.rowCount).toBe(MATRIX.length + 1);
    expect(sheet!.getRow(1).getCell(1).value).toBe('Documento');
    expect(sheet!.getRow(2).getCell(2).value).toBe('Asociado 0000');
    // La última fila confirma que la paginación recorrió todos los lotes.
    expect(sheet!.getRow(MATRIX.length + 1).getCell(2).value).toBe(
      `Asociado ${String(MATRIX.length - 1).padStart(4, '0')}`,
    );
  });
});
