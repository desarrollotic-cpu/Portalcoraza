import { dedupePersonal, rolesToPersonal, RoleRowLike } from './roles-personal.map';
import type { PersonalRole } from './entities/monthly-schedule.entity';

const fila = (p: Partial<RoleRowLike>): RoleRowLike => ({
  rol: 'titular_a',
  associateId: null,
  turnoId: null,
  displayName: null,
  orden: 0,
  ...p,
});

describe('rolesToPersonal', () => {
  it('respeta el orden guardado, no el orden de la consulta', () => {
    const out = rolesToPersonal([
      fila({ rol: 'relevante', orden: 2 }),
      fila({ rol: 'titular_a', orden: 0 }),
      fila({ rol: 'titular_b', orden: 1 }),
    ]);
    expect(out.map((p) => p.rol)).toEqual(['titular_a', 'titular_b', 'relevante']);
  });

  it('con el mismo orden desempata por clave, para que el cuadro no baile', () => {
    const out = rolesToPersonal([
      fila({ rol: 'ronda_2', orden: 5 }),
      fila({ rol: 'ronda', orden: 5 }),
    ]);
    expect(out.map((p) => p.rol)).toEqual(['ronda', 'ronda_2']);
  });

  it('mantiene la forma que ya consumia el frontend', () => {
    expect(
      rolesToPersonal([
        fila({
          rol: 'titular_a',
          associateId: '11111111-1111-1111-1111-111111111111',
          turnoId: 'AM',
          displayName: 'Garita 2',
        }),
      ]),
    ).toEqual([
      {
        rol: 'titular_a',
        associateId: '11111111-1111-1111-1111-111111111111',
        turnoId: 'AM',
        displayName: 'Garita 2',
      },
    ]);
  });

  it('sin rotulo no inventa displayName (el cuadro cae a la clave)', () => {
    const [p] = rolesToPersonal([fila({ rol: 'turno_1762300000000' })]);
    expect('displayName' in p).toBe(false);
  });

  it('sin filas devuelve lista vacia, nunca undefined', () => {
    expect(rolesToPersonal(undefined)).toEqual([]);
    expect(rolesToPersonal([])).toEqual([]);
  });
});

describe('dedupePersonal', () => {
  const p = (rol: string, associateId: string | null = null): PersonalRole => ({
    rol,
    associateId,
    turnoId: null,
  });

  it('una clave repetida ya no se graba dos veces: gana la primera', () => {
    // Con JSONB esto se guardaba sin queja y el motor generaba celdas ambiguas.
    // La tabla tiene UNIQUE (schedule_id, rol), asi que reventaria.
    const out = dedupePersonal([p('titular_a', 'A'), p('titular_a', 'B'), p('titular_b')]);
    expect(out).toHaveLength(2);
    expect(out[0].associateId).toBe('A');
    expect(out.map((x) => x.rol)).toEqual(['titular_a', 'titular_b']);
  });

  it('descarta claves vacias o de solo espacios', () => {
    expect(dedupePersonal([p(''), p('   '), p('relevante')]).map((x) => x.rol)).toEqual([
      'relevante',
    ]);
  });

  it('recorta los espacios de la clave', () => {
    expect(dedupePersonal([p('  ronda  ')])[0].rol).toBe('ronda');
  });

  it('conserva el orden en que llegaron', () => {
    expect(
      dedupePersonal([p('relevante'), p('titular_b'), p('titular_a')]).map((x) => x.rol),
    ).toEqual(['relevante', 'titular_b', 'titular_a']);
  });
});
