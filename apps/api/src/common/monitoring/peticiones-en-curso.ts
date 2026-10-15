/**
 * Registro de las peticiones que hay en vuelo ahora mismo.
 *
 * Existe por un punto ciego descubierto el 14 de octubre: Render mató la
 * instancia por memoria dos veces (19:09 y 19:12) y NI el muestreo de la
 * aplicación NI la gráfica de Render registraron un solo valor por encima del
 * 30%. La explicación es que el pico es más rápido que cualquier muestreo: una
 * petición reserva cientos de MB de golpe y el proceso muere antes de
 * terminarla, así que el interceptor —que mide al acabar— nunca llega a
 * escribir nada.
 *
 * Con esto, lo que queda en el log antes de morir es el nombre de la ruta que
 * estaba corriendo.
 */

export interface PeticionEnCurso {
  metodo: string;
  ruta: string;
  desde: number;
}

const enCurso = new Map<number, PeticionEnCurso>();
let siguienteId = 1;

export function registrarInicio(metodo: string, ruta: string): number {
  const id = siguienteId++;
  enCurso.set(id, { metodo, ruta, desde: Date.now() });
  return id;
}

export function registrarFin(id: number): void {
  enCurso.delete(id);
}

/** Peticiones que llevan más de `msMinimo` abiertas, de la más antigua a la más reciente. */
export function peticionesLentas(msMinimo: number, ahora = Date.now()): PeticionEnCurso[] {
  return [...enCurso.values()]
    .filter((p) => ahora - p.desde >= msMinimo)
    .sort((a, b) => a.desde - b.desde);
}

export function totalEnCurso(): number {
  return enCurso.size;
}

/** Solo para pruebas. */
export function limpiarEnCurso(): void {
  enCurso.clear();
}

export function describir(p: PeticionEnCurso, ahora = Date.now()): string {
  return `${p.metodo} ${p.ruta} (${ahora - p.desde}ms)`;
}
