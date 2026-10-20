/** Lo que se necesita de un rol del cuadro para nombrar el siguiente. */
export interface RoleLike {
  rol: string;
  displayName?: string;
}

export const RONDA_KEY = /^ronda(_\d+)?$/i;
export const RELEVANTE_KEY = /^relevante(_\d+)?$/i;

/** Ni ronda ni relevante: lleva ciclo propio de portería. */
export function esTitular(rol: string): boolean {
  return !RONDA_KEY.test(rol.trim()) && !RELEVANTE_KEY.test(rol.trim());
}

const LETRAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * Nombre y clave del siguiente titular, continuando las letras.
 *
 * Un puesto nace con `titular_a` / «Titular A» y `titular_b` / «Titular B», así
 * que el que se agrega debe ser «Titular C», no «Titular 4». Antes el número
 * salía del total de roles —  contando al relevante y a las rondas —  y además
 * mezclaba dos formas de nombrar en la misma lista.
 *
 * Toma la primera letra libre, así que borrar «Titular B» y volver a agregar
 * reutiliza la B en vez de saltar a la D.
 */
export function nextTitular(personal: ReadonlyArray<RoleLike>): {
  rol: string;
  displayName: string;
} {
  const usadas = new Set<string>();
  for (const p of personal) {
    const m = /^titular_([a-z])$/i.exec(p.rol.trim());
    if (m) usadas.add(m[1].toUpperCase());
  }

  const libre = [...LETRAS].find((l) => !usadas.has(l));
  if (libre) {
    return { rol: `titular_${libre.toLowerCase()}`, displayName: `Titular ${libre}` };
  }

  // 27 titulares en un puesto no va a pasar, pero la clave debe ser única igual.
  const n = personal.filter((p) => esTitular(p.rol)).length + 1;
  return { rol: `titular_${Date.now()}`, displayName: `Titular ${n}` };
}

/** Clave y rótulo del siguiente relevante: Relevante, Relevante 2, Relevante 3… */
export function nextRelevante(personal: ReadonlyArray<RoleLike>): {
  rol: string;
  displayName: string;
} {
  const n = personal.filter((p) => RELEVANTE_KEY.test(p.rol.trim())).length;
  return n === 0
    ? { rol: 'relevante', displayName: 'Relevante' }
    : { rol: `relevante_${n + 1}`, displayName: `Relevante ${n + 1}` };
}

/** Clave y rótulo de la siguiente ronda: Ronda, Ronda 2, Ronda 3… */
export function nextRonda(personal: ReadonlyArray<RoleLike>): {
  rol: string;
  displayName: string;
} {
  const n = personal.filter((p) => RONDA_KEY.test(p.rol.trim())).length;
  return n === 0
    ? { rol: 'ronda', displayName: 'Ronda' }
    : { rol: `ronda_${n + 1}`, displayName: `Ronda ${n + 1}` };
}
