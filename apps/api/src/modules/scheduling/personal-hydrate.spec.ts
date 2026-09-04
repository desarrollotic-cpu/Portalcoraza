import { backfillPersonalAssociates } from './personal-hydrate';

describe('backfillPersonalAssociates', () => {
  const names = new Map([
    ['a1', 'Ana Perez'],
    ['a2', 'Luis Gomez'],
  ]);

  it('rellena associateId desde las celdas y pone el nombre', () => {
    const personal = backfillPersonalAssociates(
      [{ rol: 'titular_a', associateId: null, turnoId: 'AM', displayName: 'Titular A' }],
      [
        { role: 'titular_a', associateId: 'a1' },
        { role: 'titular_a', associateId: 'a1' },
        { role: 'titular_a', associateId: 'a2' },
      ],
      names,
    );
    expect(personal[0].associateId).toBe('a1');
    expect(personal[0].associateName).toBe('Ana Perez');
  });

  it('no pisa un associateId ya guardado', () => {
    const personal = backfillPersonalAssociates(
      [{ rol: 'titular_a', associateId: 'a2', turnoId: 'AM' }],
      [
        { role: 'titular_a', associateId: 'a1' },
        { role: 'titular_a', associateId: 'a1' },
      ],
      names,
    );
    expect(personal[0].associateId).toBe('a2');
    expect(personal[0].associateName).toBe('Luis Gomez');
  });

  it('deja el nombre guardado si el mapa no lo trae', () => {
    const personal = backfillPersonalAssociates(
      [{ rol: 'titular_a', associateId: 'a9', turnoId: null, associateName: 'Nombre viejo' }],
      [],
      names,
    );
    expect(personal[0].associateName).toBe('Nombre viejo');
  });
});
