import { applyLockedPatch } from './documental-edit';

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

const row = {
  uniqueCode: 'MIN-SER-0007',
  numericCode: 7,
  minuteType: 'SERVICIO',
  postName: 'Torre Norte',
  voxelsera: 'VOXEL_A1',
};
applyLockedPatch(
  row,
  {
    uniqueCode: 'HACK',
    numericCode: 99,
    minuteType: 'VISITANTES',
    postName: 'Shangrila',
    voxelsera: 'VOXEL_A2',
  },
  {
    uniqueCode: row.uniqueCode,
    numericCode: row.numericCode,
    minuteType: row.minuteType,
  },
);
assert(row.uniqueCode === 'MIN-SER-0007', 'código único no cambia');
assert(row.numericCode === 7, 'consecutivo no cambia');
assert(row.minuteType === 'SERVICIO', 'tipo de minuta no cambia');
assert(row.postName === 'Shangrila', 'puesto sí cambia');
assert(row.voxelsera === 'VOXEL_A2', 'casilla sí cambia');
console.log('documental-edit ok');
