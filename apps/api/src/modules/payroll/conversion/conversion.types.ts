export type Quincena = 'Primera' | 'Segunda';

export interface ZonaDetectada {
  nombre: string;
  numero: number;
  asociados: number;
}

export interface PeriodoDetectado {
  /** Año del encabezado (`Y1`) o null si no se pudo leer. */
  anio: number | null;
  /** Mes 1-12 (`AA1`) o null si no se pudo leer. */
  mes: number | null;
  quincena: Quincena | null;
  /** `'09'` o null. */
  periodo: string | null;
  /** `MM/DD/AAAA` (15 en la primera quincena, 30 en la segunda) o null. */
  fecha: string | null;
}

export interface FilaBase {
  cedula: string;
  codigo: string;
  valor: number;
}

export interface TotalConcepto {
  codigo: string;
  filas: number;
  suma: number;
}

export interface Bonificacion {
  zona: string;
  cedula: string;
  nombre: string;
  valor: number;
}

export interface Incapacitado {
  cedula: string;
  nombre: string;
  valor: number;
}

/** Resultado de leer un consolidado. No contiene nada calculado ni validado: solo copia ordenada. */
export interface AnalisisConsolidado {
  periodo: PeriodoDetectado;
  zonas: ZonaDetectada[];
  filas: FilaBase[];
  totales: TotalConcepto[];
  bonificaciones: Bonificacion[];
  totalBonificaciones: number;
  incapacitados: Incapacitado[];
  advertencias: string[];
}

export interface PeriodoElegido {
  /** `'09'` */
  periodo: string;
  /** `MM/DD/AAAA` */
  fecha: string;
  /** `1Q` | `2Q` */
  quincena: '1Q' | '2Q';
  mesNombre: string;
  anio: number;
}
