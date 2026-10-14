import { applyLockedPatch } from './documental-edit';

/**
 * Al editar una minuta hay campos que no pueden cambiar nunca: el código
 * único, el consecutivo y el tipo. Si un cliente manipulado los envía en el
 * cuerpo de la petición, deben ignorarse en silencio.
 *
 * Antes esto se comprobaba en documental-edit.check.ts, un script con su
 * propio `assert` que jest no recogía y que nadie ejecutaba.
 */
describe('applyLockedPatch', () => {
  const fila = () => ({
    uniqueCode: 'MIN-SER-0007',
    numericCode: 7,
    minuteType: 'SERVICIO',
    postName: 'Torre Norte',
    voxelsera: 'VOXEL_A1',
  });

  const bloqueados = (row: ReturnType<typeof fila>) => ({
    uniqueCode: row.uniqueCode,
    numericCode: row.numericCode,
    minuteType: row.minuteType,
  });

  it('ignora el intento de cambiar los campos bloqueados', () => {
    const row = fila();
    applyLockedPatch(
      row,
      {
        uniqueCode: 'HACK',
        numericCode: 99,
        minuteType: 'VISITANTES',
      },
      bloqueados(fila()),
    );

    expect(row.uniqueCode).toBe('MIN-SER-0007');
    expect(row.numericCode).toBe(7);
    expect(row.minuteType).toBe('SERVICIO');
  });

  it('aplica los campos que sí son editables', () => {
    const row = fila();
    applyLockedPatch(
      row,
      { postName: 'Shangrila', voxelsera: 'VOXEL_A2' },
      bloqueados(fila()),
    );

    expect(row.postName).toBe('Shangrila');
    expect(row.voxelsera).toBe('VOXEL_A2');
  });

  it('un undefined no borra el valor que ya había', () => {
    const row = fila();
    applyLockedPatch(
      row,
      { postName: undefined, voxelsera: 'VOXEL_A2' },
      bloqueados(fila()),
    );

    expect(row.postName).toBe('Torre Norte');
    expect(row.voxelsera).toBe('VOXEL_A2');
  });

  it('un null sí borra, porque es un valor deliberado', () => {
    const row = fila() as ReturnType<typeof fila> & { postName: string | null };
    applyLockedPatch(row, { postName: null } as never, bloqueados(fila()));
    expect(row.postName).toBeNull();
  });

  it('un parche vacío deja la fila igual', () => {
    const row = fila();
    applyLockedPatch(row, {}, bloqueados(fila()));
    expect(row).toEqual(fila());
  });

  it('los bloqueados se reescriben aunque no vengan en el parche', () => {
    // El orden importa: locked se aplica después del parche, siempre.
    const row = fila();
    row.uniqueCode = 'ALGO-RARO';
    applyLockedPatch(row, { postName: 'X' }, { uniqueCode: 'MIN-SER-0007' });
    expect(row.uniqueCode).toBe('MIN-SER-0007');
  });
});
