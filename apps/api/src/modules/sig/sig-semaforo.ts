export type SigSentido = 'ASCENDENTE' | 'DESCENDENTE';
export type SigColor = 'AZUL' | 'VERDE' | 'AMARILLO' | 'ROJO';

/** ponytail: umbrales 110/100/90 hasta validar LIST-NOT con el líder SIG. */
export const SEMAFORO_AZUL = 1.1;
export const SEMAFORO_AMARILLO = 0.9;

export function calcularSemaforo(
  valorResultado: number,
  valorMeta: number,
  sentido: SigSentido,
): SigColor {
  if (!Number.isFinite(valorResultado) || !Number.isFinite(valorMeta)) {
    return 'ROJO';
  }
  if (valorMeta === 0) {
    if (sentido === 'ASCENDENTE') {
      if (valorResultado > 0) return 'AZUL';
      if (valorResultado === 0) return 'VERDE';
      return 'ROJO';
    }
    if (valorResultado < 0) return 'AZUL';
    if (valorResultado === 0) return 'VERDE';
    return 'ROJO';
  }
  const ratio = valorResultado / valorMeta;
  if (sentido === 'ASCENDENTE') {
    if (ratio >= SEMAFORO_AZUL) return 'AZUL';
    if (ratio >= 1) return 'VERDE';
    if (ratio >= SEMAFORO_AMARILLO) return 'AMARILLO';
    return 'ROJO';
  }
  if (ratio <= SEMAFORO_AMARILLO) return 'AZUL';
  if (ratio <= 1) return 'VERDE';
  if (ratio <= SEMAFORO_AZUL) return 'AMARILLO';
  return 'ROJO';
}

export function assertSemaforoEngine(): void {
  const cases: Array<[number, number, SigSentido, SigColor]> = [
    [110, 100, 'ASCENDENTE', 'AZUL'],
    [100, 100, 'ASCENDENTE', 'VERDE'],
    [90, 100, 'ASCENDENTE', 'AMARILLO'],
    [89, 100, 'ASCENDENTE', 'ROJO'],
    [90, 100, 'DESCENDENTE', 'AZUL'],
    [100, 100, 'DESCENDENTE', 'VERDE'],
    [110, 100, 'DESCENDENTE', 'AMARILLO'],
    [111, 100, 'DESCENDENTE', 'ROJO'],
    [0, 0, 'ASCENDENTE', 'VERDE'],
    [1, 0, 'ASCENDENTE', 'AZUL'],
  ];
  for (const [r, m, s, want] of cases) {
    const got = calcularSemaforo(r, m, s);
    if (got !== want) {
      throw new Error(`semaforo ${s} r=${r} m=${m}: ${got} != ${want}`);
    }
  }
}
