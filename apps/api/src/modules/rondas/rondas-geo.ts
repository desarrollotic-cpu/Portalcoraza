/** Distancia en metros (Haversine). */
export function distanciaMetros(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const r = 6371000;
  const rad = (g: number) => (g * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(a));
}

export function digitsOnly(value: string | null | undefined): string {
  return (value || '').replace(/\D/g, '');
}

export function dentroDelRadio(
  distancia: number,
  radioMetros: number,
  holgura = 1,
): boolean {
  return distancia <= radioMetros * holgura;
}

export const ALTITUD_MAX_DELTA_M = 8;

export function alturaCoincide(
  altPunto: number | null | undefined,
  altVigilante: number | null | undefined,
): boolean {
  if (altPunto == null || !Number.isFinite(Number(altPunto))) return true;
  if (altVigilante == null || !Number.isFinite(Number(altVigilante))) return false;
  return Math.abs(Number(altVigilante) - Number(altPunto)) <= ALTITUD_MAX_DELTA_M;
}
