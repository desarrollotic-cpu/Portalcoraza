import * as fs from 'fs';
import * as path from 'path';
import * as ExcelJS from 'exceljs';
import { ConversionError, PayrollConversionService, redondear } from './conversion.service';

jest.setTimeout(180_000);

const svc = new PayrollConversionService();

describe('redondear (half-up sin errores de coma flotante)', () => {
  it('124547.49999999999 → 124548', () => {
    expect(redondear(124547.49999999999)).toBe(124548);
  });
  it('0.5 → 1 y los .5 siempre suben', () => {
    expect(redondear(0.5)).toBe(1);
    expect(redondear(2.5)).toBe(3);
    expect(redondear(124547.5)).toBe(124548);
    expect(redondear(124547.4)).toBe(124547);
  });
  it('2 decimales (concepto 011) sin ruido binario', () => {
    expect(redondear(131463.78, 2)).toBe(131463.78);
    expect(redondear(0.125, 2)).toBe(0.13); // empate exacto: sube
    // sin doble redondeo: x.xx4999 no sube por pasar antes por 6 decimales
    expect(redondear(131463.78374999994, 2)).toBe(131463.78);
    expect(redondear(0.004999999, 2)).toBe(0);
  });
  it('no devuelve -0', () => {
    expect(Object.is(redondear(-0.2), 0)).toBe(true);
  });
});

/** Hoja ZONA sintética: A=cédula, B=nombre, conceptos desde AH (col 34), encabezados en la fila 3. */
function hojaZona(
  wb: ExcelJS.Workbook,
  nombre: string,
  encabezados: string[],
  filas: Array<[unknown, string, ...unknown[]]>,
  periodo: [number, string, string] = [2026, 'Septiembre', 'Segunda'],
) {
  const ws = wb.addWorksheet(nombre);
  ws.getCell('Y1').value = periodo[0];
  ws.getCell('AA1').value = periodo[1];
  ws.getCell('AC1').value = periodo[2];
  encabezados.forEach((h, i) => (ws.getRow(3).getCell(34 + i).value = h));
  filas.forEach(([cedula, nom, ...vals], i) => {
    const r = ws.getRow(5 + i);
    r.getCell(1).value = cedula as ExcelJS.CellValue;
    r.getCell(2).value = nom;
    vals.forEach((v, j) => (r.getCell(34 + j).value = v as ExcelJS.CellValue));
  });
  return ws;
}

async function consolidadoSintetico(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.addWorksheet('CONSOLIDADO').getCell('A1').value = 'no se lee';
  wb.addWorksheet('ARRENDAMIENTOS').getCell('A5').value = 999;
  const enc = [
    'VALOR A PAGAR', //          AH ignorado
    'AUXTRANSP 019',
    'SALUD', //                  equivalencia → 628
    'PENSIÓN 711',
    'APORTES VOLUNTARIOS', //    equivalencia → 568
    'BONIFICACION', //           manual
    'COMPENSACIONEXTRAORDINARIA 011',
    'SALARIOORDINARIO 001',
    'RECARGO 011', //            mismo código 011 → se suman
    'VALOR AJUSTE JORNADA', //   nunca se convierte
    'Deducción n+3', //          ignorado
    'ODONTOLOGIA520', //         código pegado al texto
  ];
  // [cedula, nombre, AH.. valores]
  // valores desde AH: [VALOR A PAGAR, 019, 628(SALUD), 711, 568(APORTES VOL.), BONIF., 011 comp., 001, 011 recargo, ajuste, ded., 520]
  hojaZona(wb, 'ZONA 07', enc, [[200, 'SIETE UNO', 1, 0, 0, 0, 0, 0, 0, 500, 0, 9, 9, 0]]);
  hojaZona(wb, 'ZONA 04', enc, [
    [100, 'CUATRO UNO', 1, 10.5, 20, 30, 0, 50, 40.25, 1000, 10.1, 77, 5, 0],
    [101, 'CUATRO DOS', 1, ' ', 'texto', 0, 5, 0, 0, 2000, 0.1, 2, 1, 7],
    ['no-num', 'FILA IGNORADA', 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [102, 'FORMULA', 1, 0, 0, { formula: 'A1+1', result: 60 }, 0, 0, 0, { formula: 'B1', result: 3000 }, 0, 0, 0, 0],
  ]);
  hojaZona(wb, 'ZONA 05', enc, [[300, 'CINCO UNO', 1, 0, 0, 0, 0, 0, 0, 4000, 0, 0, 0, 0]]);
  const inc = wb.addWorksheet('INCAPACITADOS');
  inc.getCell('A5').value = 555;
  inc.getCell('B5').value = 'INCAP UNO';
  inc.getCell('AH5').value = 123456.5;
  return Buffer.from(await wb.xlsx.writeBuffer());
}

describe('PayrollConversionService (consolidado sintético)', () => {
  let a: Awaited<ReturnType<typeof svc.analizar>>;
  beforeAll(async () => {
    a = await svc.analizar(await consolidadoSintetico());
  });

  it('solo lee hojas ZONA y pone la ZONA 05 primero', () => {
    expect(a.zonas.map((z) => z.numero)).toEqual([5, 4, 7]);
    expect(a.zonas.find((z) => z.numero === 4)?.asociados).toBe(3); // la fila "no-num" no cuenta
  });

  it('detecta período y fecha (segunda quincena = día 30)', () => {
    expect(a.periodo).toMatchObject({ anio: 2026, mes: 9, quincena: 'Segunda', periodo: '09', fecha: '09/30/2026' });
  });

  it('febrero segunda quincena usa 02/30', async () => {
    const wb = new ExcelJS.Workbook();
    hojaZona(wb, 'ZONA 01', ['SALARIOORDINARIO 001'], [[1, 'X', 10]], [2027, 'Febrero', 'Segunda']);
    const r = await svc.analizar(Buffer.from(await wb.xlsx.writeBuffer()));
    expect(r.periodo.fecha).toBe('02/30/2027');
    const wb2 = new ExcelJS.Workbook();
    hojaZona(wb2, 'ZONA 01', ['SALARIOORDINARIO 001'], [[1, 'X', 10]], [2027, 'Marzo', 'Primera']);
    const r2 = await svc.analizar(Buffer.from(await wb2.xlsx.writeBuffer()));
    expect(r2.periodo.fecha).toBe('03/15/2027');
  });

  it('orden: por hoja, luego 001,013,018,014,011,019,628,711 y el resto por columna', () => {
    const zona4 = a.filas.filter((f) => ['100', '101', '102'].includes(f.cedula));
    expect(zona4.map((f) => `${f.codigo}:${f.cedula}`)).toEqual([
      '001:100', '001:101', '001:102',
      '011:100', '011:101',
      '019:100',
      '628:100',
      '711:100', '711:102',
      '568:101',
      '520:101',
    ]);
    // ZONA 05 primero, luego 04, luego 07
    expect(a.filas[0]).toEqual({ cedula: '300', codigo: '001', valor: 4000 });
    expect(a.filas[a.filas.length - 1]).toEqual({ cedula: '200', codigo: '001', valor: 500 });
  });

  it('copia directa: el 001 no suma ni resta VALOR AJUSTE JORNADA', () => {
    expect(a.filas.find((f) => f.cedula === '100' && f.codigo === '001')?.valor).toBe(1000);
    expect(a.filas.find((f) => f.cedula === '101' && f.codigo === '001')?.valor).toBe(2000);
  });

  it('011 suma las dos columnas y conserva 2 decimales; el resto se redondea al peso', () => {
    expect(a.filas.find((f) => f.cedula === '100' && f.codigo === '011')?.valor).toBe(50.35); // 40.25 + 10.1
    expect(a.filas.find((f) => f.cedula === '101' && f.codigo === '011')?.valor).toBe(0.1);
    expect(a.filas.find((f) => f.cedula === '100' && f.codigo === '019')?.valor).toBe(11); // 10.5 sube
  });

  it('lee el valor calculado de las fórmulas; vacíos, espacios y texto cuentan como 0', () => {
    expect(a.filas.find((f) => f.cedula === '102' && f.codigo === '711')?.valor).toBe(60);
    expect(a.filas.find((f) => f.cedula === '102' && f.codigo === '001')?.valor).toBe(3000);
    expect(a.filas.some((f) => f.cedula === '101' && f.codigo === '019')).toBe(false); // ' '
    expect(a.filas.some((f) => f.cedula === '101' && f.codigo === '628')).toBe(false); // 'texto'
    expect(a.filas.some((f) => f.valor === 0)).toBe(false); // los 0 no se cargan
  });

  it('equivalencias sin código: SALUD→628, APORTES VOLUNTARIOS→568', () => {
    expect(a.totales.find((t) => t.codigo === '628')).toEqual({ codigo: '628', filas: 1, suma: 20 });
    expect(a.totales.find((t) => t.codigo === '568')).toEqual({ codigo: '568', filas: 1, suma: 5 });
  });

  it('BONIFICACION e INCAPACITADOS solo van al resumen, no al BASE', () => {
    expect(a.bonificaciones).toEqual([{ zona: 'ZONA 04', cedula: '100', nombre: 'CUATRO UNO', valor: 50 }]);
    expect(a.totalBonificaciones).toBe(50);
    expect(a.filas.some((f) => f.cedula === '555')).toBe(false);
    expect(a.incapacitados).toEqual([{ cedula: '555', nombre: 'INCAP UNO', valor: 123457 }]);
  });
  it('avisa de columnas con datos que no se pudieron mapear', async () => {
    const wb = new ExcelJS.Workbook();
    hojaZona(wb, 'ZONA 02', ['SALARIOORDINARIO 001', 'ALGO RARO'], [[1, 'X', 10, 99]]);
    const r = await svc.analizar(Buffer.from(await wb.xlsx.writeBuffer()));
    expect(r.advertencias.join(' ')).toContain('ALGO RARO');
  });

  it('valida el archivo y la ausencia de hojas ZONA', async () => {
    await expect(svc.analizar(Buffer.from('no soy un excel'))).rejects.toBeInstanceOf(ConversionError);
    const wb = new ExcelJS.Workbook();
    wb.addWorksheet('CONSOLIDADO');
    await expect(svc.analizar(Buffer.from(await wb.xlsx.writeBuffer()))).rejects.toThrow(/hojas ZONA/);
  });

  it('resolverPeriodo usa lo detectado o lo corregido, con validación', () => {
    expect(svc.resolverPeriodo(a)).toMatchObject({ periodo: '09', fecha: '09/30/2026', quincena: '2Q', mesNombre: 'SEPTIEMBRE', anio: 2026 });
    expect(svc.nombreBase(svc.resolverPeriodo(a))).toBe('BASE_2Q_SEPTIEMBRE_2026.xlsx');
    expect(svc.nombreResumen(svc.resolverPeriodo(a))).toBe('RESUMEN_2Q_SEPTIEMBRE_2026.xlsx');
    expect(svc.resolverPeriodo(a, { periodo: '10', fecha: '10/15/2026' }).quincena).toBe('1Q');
    expect(() => svc.resolverPeriodo(a, { periodo: '13' })).toThrow(ConversionError);
    expect(() => svc.resolverPeriodo(a, { fecha: '2026-09-30' })).toThrow(ConversionError);
  });
});

// ---------------------------------------------------------------------------
// Archivos reales: definir CONVERSION_PRUEBAS_DIR con la carpeta que tiene el
// CONSOLIDADO de septiembre y el BASE de agosto. Si no está definida, se omiten.
// ---------------------------------------------------------------------------
const CARPETA = process.env.CONVERSION_PRUEBAS_DIR;
const hallar = (re: RegExp) => {
  if (!CARPETA) return null;
  try {
    const f = fs.readdirSync(CARPETA).find((n) => re.test(n) && n.toLowerCase().endsWith('.xlsx'));
    return f ? path.join(CARPETA, f) : null;
  } catch {
    return null;
  }
};
const rutaConsolidado = hallar(/CONSOLIDADO.*SEPTIEMBRE/i);
const rutaAgosto = hallar(/AGOSTO/i);
const conReales = rutaConsolidado && rutaAgosto ? describe : describe.skip;

conReales('consolidado real de septiembre 2026 y formato del BASE manual de agosto', () => {
  let a: Awaited<ReturnType<typeof svc.analizar>>;
  let base: Buffer;
  beforeAll(async () => {
    a = await svc.analizar(fs.readFileSync(rutaConsolidado as string));
    base = await svc.generarBase(a, svc.resolverPeriodo(a));
  });

  const tot = (c: string) => a.totales.find((t) => t.codigo === c);

  it('valores de referencia', () => {
    expect(a.zonas).toHaveLength(9);
    expect(a.zonas[0].numero).toBe(5);
    expect(a.filas).toHaveLength(7935);
    expect(a.periodo).toMatchObject({ periodo: '09', fecha: '09/30/2026' });
    expect(a.filas[0]).toEqual({ cedula: '71376710', codigo: '001', valor: 817089 });
    expect(a.filas[1]).toEqual({ cedula: '14572160', codigo: '001', valor: 700362 });
    expect(a.filas[2]).toEqual({ cedula: '1037583233', codigo: '001', valor: 758726 });
    expect(a.filas[a.filas.length - 1]).toEqual({ cedula: '43971498', codigo: '560', valor: 173200 });
    expect(tot('001')).toEqual({ codigo: '001', filas: 624, suma: 482826672 });
    expect(tot('011')).toEqual({ codigo: '011', filas: 573, suma: 79144115.32 });
    expect(tot('628')).toEqual({ codigo: '628', filas: 624, suma: 22478781 });
    expect(tot('711')).toEqual({ codigo: '711', filas: 599, suma: 21554816 });
    expect(tot('560')).toEqual({ codigo: '560', filas: 198, suma: 42836951 });
    expect(tot('568')).toEqual({ codigo: '568', filas: 1, suma: 42300 });
    expect(a.bonificaciones).toHaveLength(59);
    expect(a.totalBonificaciones).toBe(6767877);
    expect(a.incapacitados).toHaveLength(4);
  });

  it('el BASE tiene el mismo formato que 2Q AGOSTO.xlsx y la columna K es texto vacío en todas las filas', async () => {
    const gen = new ExcelJS.Workbook();
    await gen.xlsx.load(base as unknown as ExcelJS.Buffer);
    const ref = new ExcelJS.Workbook();
    await ref.xlsx.readFile(rutaAgosto as string);
    const g = gen.worksheets[0];
    const r = ref.worksheets[0];

    expect(gen.worksheets).toHaveLength(1);
    expect(g.name).toBe('Hoja1');
    expect(g.rowCount).toBe(7935 + 1);

    // encabezados idénticos + estilo
    for (let c = 1; c <= 14; c++) {
      expect(g.getRow(1).getCell(c).value).toBe(r.getRow(1).getCell(c).value);
      expect(g.getRow(1).getCell(c).font?.bold).toBe(true);
      expect(g.getRow(1).getCell(c).numFmt).toBe(r.getRow(1).getCell(c).numFmt);
    }

    // misma clase de dato, formato, fuente y alineación en las 14 columnas
    for (const fila of [2, 3, g.rowCount]) {
      for (let c = 1; c <= 14; c++) {
        const gc = g.getRow(fila).getCell(c);
        const rc = r.getRow(2).getCell(c);
        expect({ c, tipo: gc.type, fmt: gc.numFmt }).toEqual({ c, tipo: rc.type, fmt: rc.numFmt });
        expect(gc.font?.name).toBe('Aptos Narrow');
        expect(gc.font?.size).toBe(11);
      }
      expect(g.getRow(fila).getCell(2).alignment?.horizontal).toBe('left');
      // constantes de las columnas fijas
      const v = (c: number) => g.getRow(fila).getCell(c).value;
      expect([v(3), v(4), v(5), v(7), v(8), v(9), v(10), v(12), v(13), v(14)]).toEqual([
        '20', '   ', 0, '09', '09/30/2026', 0, 0, '         ', 0, 0,
      ]);
    }

    // anchos aproximados
    [17, 16.9, 23.4, 23.4, 9.3, 11.4].forEach((w, i) => {
      expect(Math.abs((g.getColumn(i + 1).width ?? 0) - w)).toBeLessThan(0.5);
    });

    // columna K: texto vacío '' (no celda nula) en TODAS las filas, igual que el BASE de agosto
    let noVacias = 0;
    for (let f = 2; f <= g.rowCount; f++) {
      const c = g.getRow(f).getCell(11);
      if (c.value !== '' || c.type !== ExcelJS.ValueType.String) noVacias += 1;
    }
    expect(noVacias).toBe(0);
    expect(r.getRow(2).getCell(11).value).toBe(''); // el modelo manual también la trae como ''
  });

  it('el RESUMEN trae las tres hojas', async () => {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load((await svc.generarResumen(a)) as unknown as ExcelJS.Buffer);
    expect(wb.worksheets.map((w) => w.name)).toEqual([
      'Totales por concepto',
      'Bonificaciones (manual)',
      'Incapacitados (manual)',
    ]);
  });
});
