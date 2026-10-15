/**
 * Instrumentación de memoria.
 *
 * Render reinicia la instancia cuando supera su RAM y el correo de aviso no
 * dice qué la consumió. Esto deja en los logs la curva y la petición culpable,
 * para no tener que deducirlo después.
 */

const num = (raw: string | undefined, fallback: number): number => {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

/**
 * Cada cuánto se registra una muestra.
 *
 * 15s y no 60: con un muestreo por minuto, los dos reinicios del 14 de octubre
 * no dejaron ni una sola muestra por encima del 30%. El pico cabía entre dos
 * muestras.
 */
export const MEMORY_SAMPLE_INTERVAL_MS = num(
  process.env.MEMORY_SAMPLE_INTERVAL_MS,
  15_000,
);

/** A partir de cuánto tiempo abierta se considera lenta una petición. */
export const SLOW_REQUEST_MS = num(process.env.SLOW_REQUEST_MS, 4_000);

/** A partir de cuántos MB de crecimiento se registra una petición. */
export const MEMORY_REQUEST_DELTA_MB = num(process.env.MEMORY_REQUEST_DELTA_MB, 25);

/** RAM de la instancia, para expresar el uso como porcentaje. */
export const MEMORY_LIMIT_MB = num(process.env.MEMORY_LIMIT_MB, 512);

/** `MEMORY_MONITOR=off` desactiva todo sin tener que redesplegar código. */
export const memoryMonitorEnabled = (): boolean =>
  (process.env.MEMORY_MONITOR ?? '').trim().toLowerCase() !== 'off';

export const toMb = (bytes: number): number =>
  Math.round((bytes / 1024 / 1024) * 10) / 10;
