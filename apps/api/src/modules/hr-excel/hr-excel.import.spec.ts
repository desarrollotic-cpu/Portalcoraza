import * as XLSX from 'xlsx';
import { Repository } from 'typeorm';
import { Associate } from '../associates/entities/associate.entity';
import { AuditService } from '../audit/audit.service';
import { HrExcelService } from './hr-excel.service';

/**
 * Importación masiva de personal desde Excel.
 *
 * Es la puerta por la que entran de golpe cientos de asociados, y lo que no
 * valide aquí acaba en la base: documentos vacíos, cargos inventados, fechas
 * ilegibles. Las pruebas parten de un .xlsx real construido en memoria, no de
 * un objeto ya parseado, para que también cubran el mapeo de columnas.
 */

/** Construye un Excel de verdad con las cabeceras que espera el importador. */
function excel(filas: Record<string, unknown>[]): Buffer {
  const hoja = XLSX.utils.json_to_sheet(filas);
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, 'Hoja1');
  return XLSX.write(libro, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

const FILA_BUENA = {
  Documento: '1001',
  Nombres: 'Ana',
  Apellidos: 'Pérez',
  'Fecha nacimiento': '1990-05-02',
  'Fecha ingreso': '2024-01-15',
  Celular: '3001234567',
};

function servicio(opciones?: {
  cargos?: { id: string; name: string }[];
  centros?: { id: string; code: string }[];
  eps?: { id: string; value: string }[];
  documentosExistentes?: string[];
}): HrExcelService {
  const lista = <T>(items: T[]) => ({ find: () => Promise.resolve(items) });

  const associatesRepo = {
    find: () =>
      Promise.resolve(
        (opciones?.documentosExistentes ?? []).map((d) => ({ documentNumber: d })),
      ),
  } as unknown as Repository<Associate>;

  const noop = {} as never;
  return new HrExcelService(
    associatesRepo,
    lista(opciones?.cargos ?? []) as never,
    lista(opciones?.centros ?? []) as never,
    lista(opciones?.eps ?? []) as never,
    noop,
    {} as AuditService,
  );
}

describe('HrExcelService.parsePreview', () => {
  it('acepta una fila completa', async () => {
    const r = await servicio().parsePreview(excel([FILA_BUENA]));

    expect(r.totalRows).toBe(1);
    expect(r.validRows).toBe(1);
    expect(r.invalidRows).toBe(0);
    expect(r.rows[0].errors).toEqual([]);
  });

  it('señala la fila con el número que ve el usuario en Excel', async () => {
    // +2: la hoja empieza en 1 y la primera fila es la cabecera.
    const r = await servicio().parsePreview(excel([FILA_BUENA, FILA_BUENA]));
    expect(r.rows[0].rowIndex).toBe(2);
    expect(r.rows[1].rowIndex).toBe(3);
  });

  it('reclama cada campo obligatorio que falte', async () => {
    const r = await servicio().parsePreview(excel([{ Documento: '1002' }]));

    expect(r.rows[0].ok).toBe(false);
    expect(r.rows[0].errors).toEqual(
      expect.arrayContaining([
        'Falta nombres',
        'Falta apellidos',
        'Falta fecha nacimiento',
        'Falta fecha ingreso',
        'Falta celular',
      ]),
    );
    expect(r.rows[0].errors).not.toContain('Falta documento');
  });

  it('reconoce las cabeceras sin importar mayúsculas ni espacios', async () => {
    const r = await servicio().parsePreview(
      excel([
        {
          '  DOCUMENTO  ': '1003',
          NOMBRES: 'Luis',
          apellidos: 'Gómez',
          'FECHA NACIMIENTO': '1988-02-01',
          'Fecha Ingreso': '2023-07-01',
          CELULAR: '3019876543',
        },
      ]),
    );
    expect(r.rows[0].ok).toBe(true);
  });

  it('ignora las columnas que no conoce', async () => {
    const r = await servicio().parsePreview(
      excel([{ ...FILA_BUENA, 'Columna inventada': 'lo que sea' }]),
    );
    expect(r.rows[0].ok).toBe(true);
  });

  describe('catálogos', () => {
    it('resuelve cargo, centro y EPS cuando existen', async () => {
      const svc = servicio({
        cargos: [{ id: 'c1', name: 'Vigilante' }],
        centros: [{ id: 'w1', code: 'WC01' }],
        eps: [{ id: 'e1', value: 'Sura' }],
      });
      const r = await svc.parsePreview(
        excel([
          {
            ...FILA_BUENA,
            Cargo: 'vigilante',
            'Centro trabajo': 'wc01',
            EPS: 'sura',
          },
        ]),
      );

      expect(r.rows[0].ok).toBe(true);
      const p = r.rows[0].parsed as Record<string, unknown>;
      expect(p.jobPositionId).toBe('c1');
      expect(p.workCenterId).toBe('w1');
      expect(p.epsId).toBe('e1');
    });

    it('rechaza la fila cuando el cargo no está en el catálogo', async () => {
      const r = await servicio({ cargos: [] }).parsePreview(
        excel([{ ...FILA_BUENA, Cargo: 'Astronauta' }]),
      );
      expect(r.rows[0].ok).toBe(false);
      expect(r.rows[0].errors[0]).toContain('Astronauta');
    });

    it('rechaza centro y EPS inexistentes', async () => {
      const r = await servicio().parsePreview(
        excel([{ ...FILA_BUENA, 'Centro trabajo': 'XX', EPS: 'Ninguna' }]),
      );
      expect(r.rows[0].errors).toHaveLength(2);
    });
  });

  describe('alta frente a actualización', () => {
    it('marca CREATE si el documento no existe', async () => {
      const r = await servicio().parsePreview(excel([FILA_BUENA]));
      expect(r.rows[0].importAction).toBe('CREATE');
      expect(r.newRows).toBe(1);
      expect(r.updateRows).toBe(0);
    });

    it('marca UPDATE si el documento ya está', async () => {
      const r = await servicio({ documentosExistentes: ['1001'] }).parsePreview(
        excel([FILA_BUENA]),
      );
      expect(r.rows[0].importAction).toBe('UPDATE');
      expect(r.updateRows).toBe(1);
    });

    it('no cuenta las filas inválidas en el resumen', async () => {
      const r = await servicio().parsePreview(
        excel([FILA_BUENA, { Documento: '9999' }]),
      );
      expect(r.totalRows).toBe(2);
      expect(r.validRows).toBe(1);
      expect(r.invalidRows).toBe(1);
      expect(r.newRows).toBe(1);
    });
  });

  it('normaliza las fechas a YYYY-MM-DD', async () => {
    const r = await servicio().parsePreview(
      excel([{ ...FILA_BUENA, 'Fecha ingreso': '2024-01-15' }]),
    );
    const p = r.rows[0].parsed as Record<string, unknown>;
    expect(p.hireDate).toBe('2024-01-15');
  });

  it('rellena tipo de documento y estado por defecto', async () => {
    const r = await servicio().parsePreview(excel([FILA_BUENA]));
    const p = r.rows[0].parsed as Record<string, unknown>;
    expect(p.documentType).toBe('CC');
    expect(p.status).toBe('ACTIVO');
  });

  describe('documentos repetidos dentro del archivo', () => {
    it('señala la repetición y apunta a la primera fila', async () => {
      // executeImport omite el segundo en silencio: si el preview lo diera por
      // bueno, el resumen prometería un alta que nunca ocurre.
      const r = await servicio().parsePreview(excel([FILA_BUENA, FILA_BUENA]));

      expect(r.rows[0].ok).toBe(true);
      expect(r.rows[1].ok).toBe(false);
      expect(r.rows[1].errors[0]).toContain('1001');
      expect(r.rows[1].errors[0]).toContain('fila 2');
    });

    it('el resumen cuenta el alta una sola vez', async () => {
      const r = await servicio().parsePreview(excel([FILA_BUENA, FILA_BUENA]));
      expect(r.newRows).toBe(1);
      expect(r.invalidRows).toBe(1);
    });

    it('documentos distintos no se estorban', async () => {
      const r = await servicio().parsePreview(
        excel([FILA_BUENA, { ...FILA_BUENA, Documento: '1002' }]),
      );
      expect(r.validRows).toBe(2);
      expect(r.newRows).toBe(2);
    });
  });

  it('un archivo sin filas no revienta', async () => {
    const r = await servicio().parsePreview(excel([]));
    expect(r.totalRows).toBe(0);
    expect(r.validRows).toBe(0);
  });
});
