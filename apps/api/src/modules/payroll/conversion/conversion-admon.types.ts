import { AnalisisConsolidado } from './conversion.types';

/** Una columna de conceptos de la hoja de compensación administrativa. */
export interface ColumnaConcepto {
  /** Columna en la hoja (1-based). */
  columna: number;
  /** Encabezado tal cual viene, para que el revisor lo reconozca. */
  encabezado: string;
  /** Código que se usa por defecto. */
  codigo: string;
  /**
   * Código alterno cuando el encabezado trae dos («FUNERARIA 525-524»).
   * La hoja no dice cuál aplica a cada persona: lo decide contabilidad.
   */
  codigoAlterno: string | null;
}

/** Empleado que cayó en una columna de doble código: hay que confirmarlo a mano. */
export interface DobleCodigo {
  cedula: string;
  nombre: string;
  encabezado: string;
  codigoAsignado: string;
  codigoAlterno: string;
  valor: number;
}

export interface AnalisisAdmon extends AnalisisConsolidado {
  /** Hojas de quincena encontradas en el libro, para que la UI deje elegir. */
  hojas: string[];
  /** Hoja que se leyó. */
  hojaUsada: string;
  /** Empleados leídos (uno por fila con número de orden y cédula). */
  empleados: number;
  columnas: ColumnaConcepto[];
  /** Pendientes de confirmar: columnas con dos códigos posibles. */
  dobleCodigo: DobleCodigo[];
}
