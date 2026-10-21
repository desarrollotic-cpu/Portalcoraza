import * as ExcelJS from 'exceljs';
import { ConversionAdmonService } from './conversion-admon.service';
import { ConversionError } from './conversion.service';

const ENCABEZADOS = [
  '',
  'CEDULA',
  'NOMBRE',
  'COMPENSACIÓN ORDINARIA QUINCENAL 2026 001',
  'RECONOCI/ AUXILIOS 029',
  'INCAPACIDAD 030-031',
  'AUXILIO TRANSPORTE 019',
  'TOTAL DEVENGADO',
  'SALUD 628',
  'FUNERARIA 525-524',
  'TOTAL DEDUCCION',
  'TOTAL A PAGAR',
];

/**
 * Libro con la misma forma que «Compensación admon»: título con el rango de
 * fechas, dos bloques de empleados separados por TOTALES y un bloque final de
 * arrendamiento de vehículos que no debe entrar al plano.
 */
async function libro(opciones?: { titulo?: string; hoja?: string }): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(opciones?.hoja ?? 'SEPTIEMBRE- 30');

  ws.getRow(1).getCell(2).value =
    opciones?.titulo ??
    'CORAZA SEGURIDAD CTA. - COMPENSACION QUINCENAL PERSONAL ADMINISTRATIVO DEL 16 al 30 DE SEPTIEMBRE DE 2026';

  const ponerEncabezados = (fila: number) =>
    ENCABEZADOS.forEach((h, i) => {
      if (h) ws.getRow(fila).getCell(i + 1).value = h;
    });

  // Bloque 1
  ponerEncabezados(3);
  ws.getRow(4).values = [1, 71748663, 'ARANGO FRANCISCO', 2670329.97, 2274725.53, 0, 0, 0, 0, 22400];
  ws.getRow(5).values = [2, 43830625, 'RUIZ PAULA', 989612.4, 0, 0, 124547.49999999999, 0, 39584.5, 8400];
  ws.getRow(6).getCell(2).value = 'TOTALES';
  ws.getRow(6).getCell(4).value = 3659942.37;

  // Bloque 2: encabezado repetido
  ponerEncabezados(8);
  ws.getRow(9).values = [3, 75065687, 'MACHADO JHON', 0, 0, 1153314, 0, 0, 0, 0];
  ws.getRow(10).getCell(2).value = 'TOTALES';
  ws.getRow(11).getCell(2).value = 'GRAN TOTAL';

  // Arrendamiento: sin número de orden, no debe entrar
  ws.getRow(13).getCell(2).value = 'ARRENDAMIENTO DE VEHICULOS ';
  ws.getRow(14).values = [null, 1152705094, 'ARANGO VANESSA', 398300102462, 387548, 372046.08];

  // Hojas que no son de quincena
  wb.addWorksheet('PLANILLA-PAGOS');
  wb.addWorksheet('FUNERARIA');

  return Buffer.from(await wb.xlsx.writeBuffer());
}

describe('ConversionAdmonService', () => {
  const svc = new ConversionAdmonService();

  it('lee los empleados de todos los bloques y deja fuera totales y arrendamiento', async () => {
    const a = await svc.analizar(await libro(), undefined, 'habitual');

    expect(a.empleados).toBe(3);
    expect([...new Set(a.filas.map((f) => f.cedula))].sort()).toEqual([
      '43830625',
      '71748663',
      '75065687',
    ]);
    // La fila de arrendamiento tiene cédula pero no número de orden.
    expect(a.filas.some((f) => f.cedula === '1152705094')).toBe(false);
  });

  it('saca el código del encabezado, no de la posición de la columna', async () => {
    const a = await svc.analizar(await libro(), undefined, 'habitual');
    const de = (ced: string, cod: string) =>
      a.filas.find((f) => f.cedula === ced && f.codigo === cod)?.valor;

    expect(de('71748663', '001')).toBe(2670329.97);
    expect(de('71748663', '029')).toBe(2274725.53);
    expect(de('43830625', '628')).toBe(39584.5);
  });

  it('no redondea: el plano manual guarda el valor crudo', async () => {
    // 124547.49999999999 redondeado daría 124548 y descuadraría el total.
    const a = await svc.analizar(await libro(), undefined, 'habitual');
    expect(a.filas.find((f) => f.cedula === '43830625' && f.codigo === '019')?.valor).toBe(
      124547.49999999999,
    );
  });

  it('omite los valores en cero, como el archivo manual', async () => {
    const a = await svc.analizar(await libro(), undefined, 'habitual');
    // MACHADO solo tiene incapacidad; lo demás está en cero.
    expect(a.filas.filter((f) => f.cedula === '75065687').map((f) => f.codigo)).toEqual(['031']);
  });

  it('por defecto escribe los dos códigos juntos, como se pidió', async () => {
    const a = await svc.analizar(await libro()); // sin modo: combinado
    expect(a.filas.find((f) => f.cedula === '75065687')?.codigo).toBe('030-031');
    expect(a.filas.filter((f) => f.codigo === '525-524')).toHaveLength(2);
    // Sin ambigüedad que resolver, no hay nada que marcar a mano.
    expect(a.dobleCodigo).toHaveLength(0);
    expect(a.advertencias.join(' ')).toContain('prueba una carga');
  });

  it('los conceptos de un solo código no cambian con el modo combinado', async () => {
    const a = await svc.analizar(await libro());
    expect(a.filas.find((f) => f.cedula === '71748663' && f.codigo === '001')?.valor).toBe(
      2670329.97,
    );
  });

  it('en modo habitual usa el código de siempre y avisa', async () => {
    const a = await svc.analizar(await libro(), undefined, 'habitual');

    // INCAPACIDAD 030-031 -> 031 (no el primero: así salió el plano real).
    expect(a.filas.find((f) => f.codigo === '031')?.valor).toBe(1153314);
    expect(a.filas.some((f) => f.codigo === '030')).toBe(false);
    // FUNERARIA 525-524 -> 525.
    expect(a.filas.filter((f) => f.codigo === '525')).toHaveLength(2);

    expect(a.dobleCodigo).toHaveLength(3);
    expect(a.dobleCodigo.map((d) => d.codigoAlterno).sort()).toEqual(['030', '524', '524']);
    expect(a.advertencias.join(' ')).toContain('dos códigos posibles');
  });

  it('deduce el período del título, no de una celda arrastrada', async () => {
    const a = await svc.analizar(await libro(), undefined, 'habitual');
    expect(a.periodo).toEqual({
      anio: 2026,
      mes: 9,
      quincena: 'Segunda',
      periodo: '09',
      fecha: '09/30/2026',
    });
  });

  it('reconoce la primera quincena por el día de cierre', async () => {
    const b = await libro({
      hoja: 'SEPTIEMBRE- 15',
      titulo: 'COMPENSACION QUINCENAL PERSONAL ADMINISTRATIVO DEL 1 al 15 DE SEPTIEMBRE DE 2026',
    });
    const a = await svc.analizar(b);
    expect(a.periodo.quincena).toBe('Primera');
    expect(a.periodo.fecha).toBe('09/15/2026');
  });

  it('lista las hojas de quincena y descarta PLANILLA-PAGOS y FUNERARIA', async () => {
    const a = await svc.analizar(await libro(), undefined, 'habitual');
    expect(a.hojas).toEqual(['SEPTIEMBRE- 30']);
    expect(a.hojaUsada).toBe('SEPTIEMBRE- 30');
  });

  it('deja elegir la hoja y avisa si no existe', async () => {
    await expect(svc.analizar(await libro(), 'MARZO-30', 'habitual')).rejects.toBeInstanceOf(ConversionError);
  });

  it('totaliza por concepto para cuadrar contra la hoja', async () => {
    const a = await svc.analizar(await libro(), undefined, 'habitual');
    const t = a.totales.find((x) => x.codigo === '525');
    expect(t).toEqual({ codigo: '525', filas: 2, suma: 30800 });
  });

  it('rechaza un archivo que no es Excel', async () => {
    await expect(svc.analizar(Buffer.from('no soy un xlsx'))).rejects.toBeInstanceOf(
      ConversionError,
    );
  });

  describe('aplicarAjustes', () => {
    it('manda una línea al código alterno y rehace los totales', async () => {
      const a = await svc.analizar(await libro(), undefined, 'habitual');
      // Como hizo la encargada con Machado: ella sabía lo del accidente.
      const r = svc.aplicarAjustes(a, [{ cedula: '75065687', de: '031', a: '030' }]);

      expect(r.filas.find((f) => f.cedula === '75065687')?.codigo).toBe('030');
      expect(r.totales.find((t) => t.codigo === '030')?.suma).toBe(1153314);
      expect(r.totales.some((t) => t.codigo === '031')).toBe(false);
    });

    it('no toca las demás líneas', async () => {
      const a = await svc.analizar(await libro(), undefined, 'habitual');
      const r = svc.aplicarAjustes(a, [{ cedula: '71748663', de: '525', a: '524' }]);

      expect(r.filas).toHaveLength(a.filas.length);
      expect(r.filas.find((f) => f.cedula === '43830625' && f.codigo === '525')).toBeDefined();
      expect(r.filas.find((f) => f.cedula === '71748663' && f.codigo === '524')).toBeDefined();
    });

    it('rechaza reasignar una línea que no admite dos códigos', async () => {
      const a = await svc.analizar(await libro(), undefined, 'habitual');
      // 001 no es una columna de doble código.
      expect(() => svc.aplicarAjustes(a, [{ cedula: '71748663', de: '001', a: '029' }])).toThrow(
        ConversionError,
      );
    });

    it('sin ajustes devuelve lo mismo', async () => {
      const a = await svc.analizar(await libro(), undefined, 'habitual');
      expect(svc.aplicarAjustes(a, [])).toBe(a);
    });
  });
});
