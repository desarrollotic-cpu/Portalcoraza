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
  it('011 redondea como Excel: 151161.46499999985 se ve 151161.465 y sube a 151161.47', () => {
    expect(redondear(151161.46499999985, 2)).toBe(151161.47);
    expect(redondear(248044.87499999977, 2)).toBe(248044.88);
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
  // INCAPACITADOS está en medio de las pestañas a propósito: igual debe ir al final del BASE
  hojaZona(wb, 'INCAPACITADOS', ['VALOR A PAGAR', 'SALARIOORDINARIO 001', 'SALUD', 'VALOR AJUSTE JORNADA'], [[555, 'INCAP UNO', 1, 123456.2, 10, 0.4]]);
  const enc = [
    'VALOR A PAGAR', //          AH ignorado
    'AUXTRANSP 019',
    'SALUD', //                  equivalencia → 628
    'PENSIÓN 711',
    'APORTES VOLUNTARIOS', //    equivalencia → 568
    'BONIFICACION', //           manual
    'COMPENSACIONEXTRAORDINARIA 011', //  ignorada: el 011 sale solo de RECARGO 011
    'SALARIOORDINARIO 001',
    'RECARGO 011', //            mismo código 011 → se suman
    'VALOR AJUSTE JORNADA', //   se suma al 001
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
  return Buffer.from(await wb.xlsx.writeBuffer());
}

describe('PayrollConversionService (consolidado sintético)', () => {
  let a: Awaited<ReturnType<typeof svc.analizar>>;
  beforeAll(async () => {
    a = await svc.analizar(await consolidadoSintetico());
  });

  it('zonas en orden numérico ascendente (sin ZONA 05 primero) e INCAPACITADOS al final', () => {
    expect(a.zonas.map((z) => z.numero)).toEqual([4, 5, 7, null]);
    expect(a.zonas[3]).toEqual({ nombre: 'INCAPACITADOS', numero: null, asociados: 1 });
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
    // ZONA 04, 05, 07 y al final INCAPACITADOS (mismas reglas: 001 antes que 628)
    expect(a.filas[0]).toEqual({ cedula: '100', codigo: '001', valor: 1077 });
    const iZ5 = a.filas.findIndex((f) => f.cedula === '300');
    const iZ7 = a.filas.findIndex((f) => f.cedula === '200');
    const iInc = a.filas.findIndex((f) => f.cedula === '555');
    expect(iZ5).toBeGreaterThan(Math.max(...a.filas.map((f, i) => (['100', '101', '102'].includes(f.cedula) ? i : -1))));
    expect(iZ7).toBeGreaterThan(iZ5);
    expect(iInc).toBeGreaterThan(iZ7);
    expect(a.filas.slice(iInc)).toEqual([
      { cedula: '555', codigo: '001', valor: 123457 }, // 123456.2 + 0.4 = 123456.6 → 123457
      { cedula: '555', codigo: '628', valor: 10 },
    ]);
  });

  it('001 = SALARIOORDINARIO 001 + VALOR AJUSTE JORNADA (en todas las hojas, también INCAPACITADOS)', () => {
    expect(a.filas.find((f) => f.cedula === '100' && f.codigo === '001')?.valor).toBe(1077); // 1000 + 77
    expect(a.filas.find((f) => f.cedula === '101' && f.codigo === '001')?.valor).toBe(2002); // 2000 + 2
    expect(a.filas.find((f) => f.cedula === '102' && f.codigo === '001')?.valor).toBe(3000); // ajuste en 0
    expect(a.filas.find((f) => f.cedula === '200' && f.codigo === '001')?.valor).toBe(509); // ZONA 07: 500 + 9
    expect(a.filas.find((f) => f.cedula === '300' && f.codigo === '001')?.valor).toBe(4000); // ajuste vacío
  });

  it('011 sale solo de RECARGO 011; COMPENSACIONEXTRAORDINARIA 011 se ignora', async () => {
    const wb = new ExcelJS.Workbook();
    hojaZona(
      wb,
      'ZONA 01',
      ['SALARIOORDINARIO 001', 'COMPENSACIONEXTRAORDINARIA 011', 'VALOR AJUSTE JORNADA'],
      [[1, 'X', 100, 999, 0.5]],
    );
    const r = await svc.analizar(Buffer.from(await wb.xlsx.writeBuffer()));
    expect(r.filas).toEqual([{ cedula: '1', codigo: '001', valor: 101 }]); // 100 + 0.5 → 101 (half-up), sin 011
    expect(r.advertencias).toEqual([]);
  });

  it('011 conserva 2 decimales (solo RECARGO); el resto se redondea al peso', () => {
    expect(a.filas.find((f) => f.cedula === '100' && f.codigo === '011')?.valor).toBe(10.1); // solo RECARGO (la compensación 40.25 se ignora)
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
    expect(a.totales.find((t) => t.codigo === '628')).toEqual({ codigo: '628', filas: 2, suma: 30 }); // 20 de ZONA 04 + 10 de INCAPACITADOS
    expect(a.totales.find((t) => t.codigo === '568')).toEqual({ codigo: '568', filas: 1, suma: 5 });
  });

  it('BONIFICACION solo va al resumen, no al BASE', () => {
    expect(a.bonificaciones).toEqual([{ zona: 'ZONA 04', cedula: '100', nombre: 'CUATRO UNO', valor: 50 }]);
    expect(a.totalBonificaciones).toBe(50);

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
// Archivos reales: definir CONVERSION_PRUEBAS_DIR con la carpeta que tiene los
// consolidados (septiembre y agosto) y los BASE manuales (1Q y 2Q de agosto).
// Si no está definida, estas pruebas se omiten.
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
const rutaAgosto = hallar(/^2Q.*AGOSTO/i); // BASE manual 2Q de agosto (modelo de formato)
const rutaConsAgosto = hallar(/CONSOLIDADO.*AGOSTO/i);
const rutaManual1Q = hallar(/^1Q.*AGOSTO/i); // BASE manual 1Q de agosto
const rutaJulio = hallar(/CONSOLIDADO.*JULIO/i);

const conReales = rutaConsolidado && rutaAgosto ? describe : describe.skip;

conReales('consolidado real de septiembre 2026 y formato del BASE manual de agosto', () => {
  let a: Awaited<ReturnType<typeof svc.analizar>>;
  let base: Buffer;
  beforeAll(async () => {
    a = await svc.analizar(fs.readFileSync(rutaConsolidado as string));
    base = await svc.generarBase(a, svc.resolverPeriodo(a));
  });

  const tot = (c: string) => a.totales.find((t) => t.codigo === c);

  it('valores de referencia (ZONA ascendente + INCAPACITADOS al final)', () => {
    expect(a.zonas).toHaveLength(10); // 9 zonas + INCAPACITADOS
    expect(a.zonas.map((z) => z.numero)).toEqual([4, 5, 7, 9, 13, 18, 20, 23, 24, null]);
    expect(a.zonas[9]).toEqual({ nombre: 'INCAPACITADOS', numero: null, asociados: 4 });
    expect(a.filas).toHaveLength(7956); // 7.935 de las zonas + 21 de INCAPACITADOS
    expect(a.periodo).toMatchObject({ periodo: '09', fecha: '09/30/2026' });
    // la primera fila ahora es de la ZONA 04
    expect(a.filas[0]).toEqual({ cedula: '1037269695', codigo: '001', valor: 817089 });
    expect(a.filas[1]).toEqual({ cedula: '1001810043', codigo: '001', valor: 817089 });
    expect(a.filas[2]).toEqual({ cedula: '73432368', codigo: '001', valor: 817089 });
    // las últimas 21 filas son de INCAPACITADOS y la última cierra el BASE
    expect(new Set(a.filas.slice(-21).map((f) => f.cedula))).toEqual(new Set(['3985121', '71701610', '98601485']));
    expect(a.filas.slice(-21, -18).map((f) => `${f.cedula}|${f.codigo}|${f.valor}`)).toEqual([
      '3985121|001|875453',
      '71701610|001|875453',
      '98601485|001|875453',
    ]);
    expect(a.filas[a.filas.length - 1]).toEqual({ cedula: '98601485', codigo: '538', valor: 262636 });
    expect(tot('001')).toEqual({ codigo: '001', filas: 627, suma: 495739661 }); // incluye VALOR AJUSTE JORNADA
    // 011 solo de RECARGO, con redondeo de Excel (15 cifras): 10 celdas x.xx5 con ruido binario suben 1 centavo
    expect(tot('011')).toEqual({ codigo: '011', filas: 573, suma: 79144115.42 });
    expect(tot('628')).toEqual({ codigo: '628', filas: 627, suma: 22583835 });
    expect(tot('711')).toEqual({ codigo: '711', filas: 602, suma: 21659870 });
    expect(tot('560')).toEqual({ codigo: '560', filas: 198, suma: 42836951 });
    expect(tot('568')).toEqual({ codigo: '568', filas: 1, suma: 42300 });
    expect(a.bonificaciones).toHaveLength(59);
    expect(a.totalBonificaciones).toBe(6767877);
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
    expect(g.rowCount).toBe(7956 + 1);

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

  it('el RESUMEN trae solo dos hojas (ya no hay "Incapacitados (manual)")', async () => {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load((await svc.generarResumen(a)) as unknown as ExcelJS.Buffer);
    expect(wb.worksheets.map((w) => w.name)).toEqual(['Totales por concepto', 'Bonificaciones (manual)']);
  });
});

const conAgosto1Q = rutaConsAgosto && rutaManual1Q ? describe : describe.skip;

conAgosto1Q('consolidado 1ª quincena de agosto 2026 contra el BASE manual 1Q AGOSTO', () => {
  it('8.124 filas, período 08, fecha 08/15/2026 y solo las diferencias manuales conocidas', async () => {
    const a = await svc.analizar(fs.readFileSync(rutaConsAgosto as string));
    expect(a.filas).toHaveLength(8124);
    expect(a.periodo).toMatchObject({ periodo: '08', fecha: '08/15/2026', quincena: 'Primera' });
    expect(a.zonas.map((z) => z.numero)).toEqual([4, 5, 7, 9, 13, 18, 20, 23, 24, null]);
    expect(a.advertencias).toEqual([]);

    // manual: cédula + concepto → valor, sin bonificaciones (012, 026, 029 y 07x/08x/09x)
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(rutaManual1Q as string);
    const ws = wb.worksheets[0];
    const manual = new Map<string, number>();
    for (let r = 2; r <= ws.rowCount; r++) {
      const ced = String(ws.getRow(r).getCell(1).value ?? '').trim();
      const cod = String(ws.getRow(r).getCell(2).value ?? '').trim();
      if (!ced || /^(012|026|029|07\d|08\d|09\d)$/.test(cod)) continue;
      expect(manual.has(`${ced}|${cod}`)).toBe(false); // sin duplicados
      manual.set(`${ced}|${cod}`, Number(ws.getRow(r).getCell(6).value));
    }
    const portal = new Map<string, number>();
    for (const f of a.filas) {
      expect(portal.has(`${f.cedula}|${f.codigo}`)).toBe(false);
      portal.set(`${f.cedula}|${f.codigo}`, f.valor);
    }

    const dif: string[] = [];
    for (const [k, v] of portal) {
      const m = manual.get(k);
      if (m === undefined) dif.push(`SOLO PORTAL ${k} ${v}`);
      else if (Math.abs(m - v) > 0.005) dif.push(`VALOR ${k} portal=${v} manual=${m}`);
    }
    for (const [k, v] of manual) if (!portal.has(k)) dif.push(`SOLO MANUAL ${k} ${v}`);

    // Únicas diferencias aceptadas (ajustes hechos a mano en el manual). La de 1062876589 (001)
    // desapareció: con VALOR AJUSTE JORNADA sumado el portal da 875453, igual que el manual.
    expect(dif.sort()).toEqual(
      [
        'VALOR 70108742|001 portal=875453 manual=875400',
        'VALOR 71701610|001 portal=875453 manual=875400',
        'VALOR 98601485|001 portal=875453 manual=875400',
        'SOLO PORTAL 1037073208|533 353000',
      ].sort(),
    );
  });
});

const conJulio = rutaJulio ? describe : describe.skip;

conJulio('consolidado 1ª quincena de julio 2026 (001 con VALOR AJUSTE JORNADA, 011 solo RECARGO)', () => {
  it('valores de referencia', async () => {
    const a = await svc.analizar(fs.readFileSync(rutaJulio as string));
    const tot = (c: string) => a.totales.find((t) => t.codigo === c);
    expect(a.filas).toHaveLength(8234);
    expect(a.periodo).toMatchObject({ periodo: '07', fecha: '07/15/2026' });
    expect(tot('001')).toEqual({ codigo: '001', filas: 644, suma: 503093489 });
    expect(tot('011')).toEqual({ codigo: '011', filas: 602, suma: 109049694.82 });
    const v = (ced: string, cod: string) => a.filas.find((f) => f.cedula === ced && f.codigo === cod)?.valor;
    expect(v('98456475', '001')).toBe(350181);
    expect(v('98456475', '011')).toBe(70036.2);
    expect(v('1003735970', '001')).toBe(875453);
  });
});
