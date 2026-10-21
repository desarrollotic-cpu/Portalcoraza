import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import {
  ConversionError,
  MESES,
  aNumero,
  normalizar,
  redondear,
  valorCelda,
} from './conversion.service';
import { AnalisisAdmon, ColumnaConcepto, DobleCodigo } from './conversion-admon.types';
import { FilaBase, PeriodoDetectado, TotalConcepto } from './conversion.types';

const COL_ORDEN = 1;
const COL_CEDULA = 2;
const COL_NOMBRE = 3;

/**
 * Columnas que no son conceptos aunque estén entre ellos. Se reconocen por el
 * encabezado y no generan advertencia.
 */
const IGNORADAS = [
  /^CUOTAPORASOCIADO$/,
  /^COMPENSAORDINARIA\d*(MENSUAL|QUINCENAL)?$/,
  /^COMPENSACIONORDINARIAMENSUAL\d*$/,
  /^AJUSTESDEVOLU$/,
  /^TOTALDEVENGADO$/,
  /^TOTALDEDUCCION$/,
  /^TOTALAPAGAR$/,
  /^CEDULA$/,
  /^NOMBRE$/,
  /^CENTROCOSTO$/,
  /^BANCO$/,
  /^CUENTA$/,
  /^TIPO$/,
  /^PAGO$/,
];

/**
 * Cuál de los dos códigos manda cuando el encabezado trae una pareja.
 *
 * No es «siempre el primero»: en el plano de septiembre la incapacidad
 * (030-031) salió toda como 031, mientras que la funeraria (525-524) salió
 * como 525 salvo dos personas. Esta tabla recoge lo observado; óptica queda
 * pendiente porque esa quincena no tuvo movimientos.
 */
const CODIGO_PRINCIPAL: Record<string, string> = {
  '030-031': '031',
  '525-524': '525',
  '518-565': '518',
};

/**
 * Qué escribir en el archivo cuando el encabezado trae dos códigos.
 *
 * `combinado` — el par tal cual, `030-031`. Es lo que se pidió: la hoja no dice
 *   cuál de los dos va, y la decisión la tomaba la persona caso por caso (sabía
 *   que alguien se había accidentado, por ejemplo). Ojo: el programa de nómina
 *   siempre ha recibido códigos de 3 dígitos; conviene probar una carga antes
 *   de confiar en este modo.
 * `habitual` — el que se venía usando (`031`, `525`, `518`), y las líneas
 *   dudosas se marcan en la previsualización para reasignarlas a mano.
 */
export type ModoCodigoDoble = 'combinado' | 'habitual';

/** `SALUD 628` -> 628 · `FUNERARIA 525-524` -> según el modo. */
function codigosDelEncabezado(
  texto: string,
  modo: ModoCodigoDoble,
): { codigo: string; alterno: string | null } | null {
  const codigos = [...texto.matchAll(/\b(\d{3})\b/g)].map((m) => m[1]);
  if (!codigos.length) return null;
  if (codigos.length === 1) return { codigo: codigos[0], alterno: null };

  const pareja = `${codigos[0]}-${codigos[1]}`;
  if (modo === 'combinado') return { codigo: pareja, alterno: null };

  const principal = CODIGO_PRINCIPAL[pareja] ?? codigos[0];
  const alterno = codigos.find((c) => c !== principal) ?? null;
  return { codigo: principal, alterno };
}

/**
 * Lee «Compensación admon» y devuelve las líneas del plano, en el mismo formato
 * que el consolidado operativo. De ahí en adelante se reutiliza todo:
 * `resolverPeriodo`, `nombreBase` y `generarBase` del servicio de conversión.
 *
 * La hoja trae varios bloques de empleados, cada uno con su encabezado repetido
 * y su fila TOTALES, y al final un bloque de arrendamiento de vehículos que NO
 * entra al plano. Se distinguen por una regla simple: una fila de empleado lleva
 * número de orden en la primera columna y cédula numérica en la segunda. Los
 * totales, los encabezados repetidos y el arrendamiento no cumplen las dos.
 */
@Injectable()
export class ConversionAdmonService {
  async analizar(
    buffer: Buffer,
    hoja?: string,
    modo: ModoCodigoDoble = 'combinado',
  ): Promise<AnalisisAdmon> {
    const wb = new ExcelJS.Workbook();
    try {
      await wb.xlsx.load(buffer as unknown as ExcelJS.Buffer);
    } catch {
      throw new ConversionError('No se pudo leer el archivo. ¿Es un .xlsx válido?');
    }

    const hojas = wb.worksheets.map((w) => w.name).filter((n) => this.esHojaDeQuincena(n));
    if (!hojas.length) {
      throw new ConversionError(
        'El libro no tiene hojas de quincena (se esperan nombres como SEPTIEMBRE- 30).',
      );
    }

    const nombreHoja = hoja?.trim() || hojas[hojas.length - 1];
    const ws = wb.worksheets.find((w) => w.name === nombreHoja);
    if (!ws) {
      throw new ConversionError(
        `La hoja ${nombreHoja} no está en el libro. Disponibles: ${hojas.join(', ')}.`,
      );
    }

    const advertencias: string[] = [];
    const columnas = this.leerColumnas(ws, advertencias, modo);
    if (!columnas.length) {
      throw new ConversionError(
        'No se encontró ninguna columna de concepto. Los encabezados deben traer el código, como SALUD 628.',
      );
    }

    const filas: FilaBase[] = [];
    const dobleCodigo: DobleCodigo[] = [];
    let empleados = 0;

    ws.eachRow((row) => {
      const orden = valorCelda(row.getCell(COL_ORDEN));
      const cedula = valorCelda(row.getCell(COL_CEDULA));
      // Fila de empleado: número de orden + cédula numérica. Deja fuera los
      // TOTALES, los encabezados repetidos y el bloque de arrendamiento.
      if (typeof orden !== 'number' || typeof cedula !== 'number') return;

      empleados += 1;
      const nombre = String(valorCelda(row.getCell(COL_NOMBRE)) ?? '').trim();

      for (const col of columnas) {
        // Sin redondear, igual que el archivo manual: ahí quedan valores como
        // 124547.49999999999 y 966393.8666666667. Redondear cambiaría los
        // totales que contabilidad cuadra contra el GRAN TOTAL de la hoja.
        const valor = aNumero(valorCelda(row.getCell(col.columna)));
        if (valor === 0) continue;

        filas.push({ cedula: String(cedula), codigo: col.codigo, valor });

        if (col.codigoAlterno) {
          dobleCodigo.push({
            cedula: String(cedula),
            nombre,
            encabezado: col.encabezado,
            codigoAsignado: col.codigo,
            codigoAlterno: col.codigoAlterno,
            valor,
          });
        }
      }
    });

    if (!empleados) {
      throw new ConversionError(
        `La hoja ${nombreHoja} no tiene filas de empleado (número de orden + cédula).`,
      );
    }

    if (dobleCodigo.length) {
      const cols = [...new Set(dobleCodigo.map((d) => d.encabezado))].join(', ');
      advertencias.push(
        `Hay ${dobleCodigo.length} línea(s) en columnas con dos códigos posibles (${cols}). ` +
          'Se asignó el código habitual; revísalas antes de cargar al programa de nómina.',
      );
    }

    const combinados = columnas.filter((c) => c.codigo.includes('-'));
    if (modo === 'combinado' && combinados.length) {
      advertencias.push(
        `Los conceptos ${combinados.map((c) => c.codigo).join(', ')} salen con los dos códigos juntos. ` +
          'El programa de nómina venía recibiendo códigos de 3 dígitos: prueba una carga antes de la quincena.',
      );
    }

    return {
      periodo: this.detectarPeriodo(ws, nombreHoja, advertencias),
      zonas: [],
      filas,
      totales: this.totalizar(filas),
      bonificaciones: [],
      totalBonificaciones: 0,
      advertencias,
      hojas,
      hojaUsada: nombreHoja,
      empleados,
      columnas,
      dobleCodigo,
    };
  }

  /**
   * Reasigna al código alterno las líneas que la persona marcó en la
   * previsualización.
   *
   * No hay regla que deducir: la decisión depende de algo que la hoja no dice
   * (que alguien se accidentó, qué plan tiene cada quien). El módulo resuelve
   * las líneas sin ambigüedad y deja estas al criterio de quien liquida.
   */
  aplicarAjustes(
    a: AnalisisAdmon,
    ajustes: ReadonlyArray<{ cedula: string; de: string; a: string }>,
  ): AnalisisAdmon {
    if (!ajustes.length) return a;

    const permitido = new Set(
      a.dobleCodigo.map((d) => `${d.cedula}:${d.codigoAsignado}:${d.codigoAlterno}`),
    );
    for (const x of ajustes) {
      if (!permitido.has(`${x.cedula}:${x.de}:${x.a}`)) {
        throw new ConversionError(
          `No se puede pasar la cédula ${x.cedula} de ${x.de} a ${x.a}: esa línea no admite dos códigos.`,
        );
      }
    }

    const cambios = new Map(ajustes.map((x) => [`${x.cedula}:${x.de}`, x.a]));
    const filas = a.filas.map((f) => {
      const nuevo = cambios.get(`${f.cedula}:${f.codigo}`);
      return nuevo ? { ...f, codigo: nuevo } : f;
    });

    return { ...a, filas, totales: this.totalizar(filas) };
  }

  /** `SEPTIEMBRE- 30`, `JULIO-15 `. Descarta PLANILLA-PAGOS y FUNERARIA. */
  private esHojaDeQuincena(nombre: string): boolean {
    const n = normalizar(nombre);
    return MESES.some((m) => n.startsWith(m)) && /\d{1,2}$/.test(n);
  }

  private leerColumnas(
    ws: ExcelJS.Worksheet,
    advertencias: string[],
    modo: ModoCodigoDoble,
  ): ColumnaConcepto[] {
    // El encabezado es la primera fila que tenga CEDULA y NOMBRE.
    let filaEnc = 0;
    ws.eachRow((row, i) => {
      if (filaEnc) return;
      const a = normalizar(String(valorCelda(row.getCell(COL_CEDULA)) ?? ''));
      const b = normalizar(String(valorCelda(row.getCell(COL_NOMBRE)) ?? ''));
      if (a === 'CEDULA' && b === 'NOMBRE') filaEnc = i;
    });
    if (!filaEnc) {
      throw new ConversionError('No se encontró la fila de encabezados (CEDULA / NOMBRE).');
    }

    const fila = ws.getRow(filaEnc);
    const columnas: ColumnaConcepto[] = [];
    const vistos = new Map<string, string>();

    for (let c = COL_NOMBRE + 1; c <= ws.columnCount; c++) {
      const crudo = String(valorCelda(fila.getCell(c)) ?? '')
        .replace(/\s+/g, ' ')
        .trim();
      if (!crudo) continue;
      const n = normalizar(crudo);
      if (IGNORADAS.some((re) => re.test(n))) continue;

      const codigos = codigosDelEncabezado(crudo, modo);
      if (!codigos) {
        advertencias.push(`Columna sin código, no se convirtió: ${crudo}.`);
        continue;
      }

      const previo = vistos.get(codigos.codigo);
      if (previo) {
        advertencias.push(
          `El código ${codigos.codigo} aparece en dos columnas (${previo} y ${crudo}); se suman.`,
        );
      } else {
        vistos.set(codigos.codigo, crudo);
      }

      columnas.push({
        columna: c,
        encabezado: crudo,
        codigo: codigos.codigo,
        codigoAlterno: codigos.alterno,
      });
    }
    return columnas;
  }

  /**
   * Período y fecha desde el título (DEL 16 al 30 DE SEPTIEMBRE DE 2026) y, como
   * respaldo, desde el nombre de la hoja.
   *
   * La fecha se calcula aquí, no se copia de la hoja: en el archivo manual venía
   * arrastrada como serie y el año subía fila por fila (09/30/2026, 2027, 2028,
   * hasta 2218 en el plano de septiembre).
   */
  private detectarPeriodo(
    ws: ExcelJS.Worksheet,
    nombreHoja: string,
    advertencias: string[],
  ): PeriodoDetectado {
    let titulo = '';
    for (let f = 1; f <= 3 && !titulo; f++) {
      for (let c = 1; c <= 6 && !titulo; c++) {
        const v = String(valorCelda(ws.getRow(f).getCell(c)) ?? '');
        if (normalizar(v).includes('COMPENSACION')) titulo = v;
      }
    }

    const texto = normalizar(titulo || nombreHoja);
    const mesIdx = MESES.findIndex((m) => texto.includes(m));
    const mes = mesIdx >= 0 ? mesIdx + 1 : null;

    const anioM = /\b(20\d{2})\b/.exec(titulo);
    const anio = anioM ? parseInt(anioM[1], 10) : null;

    // Día de cierre: del título (DEL 16 AL 30) o del nombre de la hoja.
    let dia: number | null = null;
    const rango = /AL(\d{1,2})DE/.exec(texto);
    if (rango) dia = parseInt(rango[1], 10);
    if (dia === null) {
      const porNombre = /(\d{1,2})\s*$/.exec(nombreHoja.trim());
      if (porNombre) dia = parseInt(porNombre[1], 10);
    }

    if (mes === null || anio === null || dia === null) {
      advertencias.push(
        'No se pudo deducir el período de la hoja; indícalo a mano antes de generar el archivo.',
      );
      return { anio, mes, quincena: null, periodo: null, fecha: null };
    }

    const periodo = String(mes).padStart(2, '0');
    return {
      anio,
      mes,
      quincena: dia <= 15 ? 'Primera' : 'Segunda',
      periodo,
      fecha: `${periodo}/${String(dia).padStart(2, '0')}/${anio}`,
    };
  }

  private totalizar(filas: FilaBase[]): TotalConcepto[] {
    const m = new Map<string, TotalConcepto>();
    for (const f of filas) {
      const t = m.get(f.codigo) ?? { codigo: f.codigo, filas: 0, suma: 0 };
      t.filas += 1;
      t.suma = redondear(t.suma + f.valor);
      m.set(f.codigo, t);
    }
    return [...m.values()].sort((a, b) => a.codigo.localeCompare(b.codigo));
  }
}
