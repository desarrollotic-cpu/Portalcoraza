import { esTitular, nextRelevante, nextRonda, nextTitular } from './next-role';

/** Los tres roles con los que nace un puesto. */
const PORDEFECTO = [
  { rol: 'titular_a', displayName: 'Titular A' },
  { rol: 'titular_b', displayName: 'Titular B' },
  { rol: 'relevante', displayName: 'Relevante' },
];

describe('nextTitular', () => {
  it('sigue las letras de los titulares por defecto', () => {
    // Antes salia «Titular 4»: el numero venia del total de roles, contando al
    // relevante, y chocaba con las letras de Titular A / Titular B.
    expect(nextTitular(PORDEFECTO)).toEqual({ rol: 'titular_c', displayName: 'Titular C' });
  });

  it('el relevante y las rondas no corren la letra', () => {
    const conRondas = [
      ...PORDEFECTO,
      { rol: 'ronda', displayName: 'Ronda' },
      { rol: 'ronda_2', displayName: 'Ronda 2' },
      { rol: 'relevante_2', displayName: 'Relevante 2' },
    ];
    expect(nextTitular(conRondas).displayName).toBe('Titular C');
  });

  it('sigue contando mas alla de la C', () => {
    let lista = [...PORDEFECTO];
    for (const esperada of ['C', 'D', 'E']) {
      const sig = nextTitular(lista);
      expect(sig.displayName).toBe(`Titular ${esperada}`);
      lista = [...lista, sig];
    }
  });

  it('reutiliza una letra liberada en vez de saltarla', () => {
    const sinB = [
      { rol: 'titular_a', displayName: 'Titular A' },
      { rol: 'titular_c', displayName: 'Titular C' },
    ];
    expect(nextTitular(sinB)).toEqual({ rol: 'titular_b', displayName: 'Titular B' });
  });

  it('en un puesto vacio arranca en A', () => {
    expect(nextTitular([])).toEqual({ rol: 'titular_a', displayName: 'Titular A' });
  });

  it('la clave nunca se repite', () => {
    let lista = [...PORDEFECTO];
    for (let i = 0; i < 10; i++) {
      lista = [...lista, nextTitular(lista)];
    }
    expect(new Set(lista.map((r) => r.rol)).size).toBe(lista.length);
  });
});

describe('nextRelevante', () => {
  it('el primero es «Relevante», sin numero', () => {
    expect(nextRelevante([])).toEqual({ rol: 'relevante', displayName: 'Relevante' });
  });

  it('despues numera', () => {
    expect(nextRelevante(PORDEFECTO)).toEqual({
      rol: 'relevante_2',
      displayName: 'Relevante 2',
    });
  });
});

describe('nextRonda', () => {
  it('la primera es «Ronda», sin numero', () => {
    expect(nextRonda(PORDEFECTO)).toEqual({ rol: 'ronda', displayName: 'Ronda' });
  });

  it('despues numera', () => {
    expect(nextRonda([...PORDEFECTO, { rol: 'ronda', displayName: 'Ronda' }])).toEqual({
      rol: 'ronda_2',
      displayName: 'Ronda 2',
    });
  });
});

describe('esTitular', () => {
  it('distingue los tres tipos por la clave, no por el rotulo', () => {
    expect(esTitular('titular_a')).toBe(true);
    expect(esTitular('titular_c')).toBe(true);
    expect(esTitular('turno_1762300000000')).toBe(true);
    expect(esTitular('ronda')).toBe(false);
    expect(esTitular('ronda_2')).toBe(false);
    expect(esTitular('relevante')).toBe(false);
    expect(esTitular('relevante_2')).toBe(false);
  });
});
