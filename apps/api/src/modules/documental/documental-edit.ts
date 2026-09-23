/** Aplica un parche y reescribe las claves bloqueadas (código consecutivo, etc.). */
export function applyLockedPatch<T extends object>(
  row: T,
  dto: Partial<T>,
  locked: Partial<T>,
): void {
  const patch: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(dto)) {
    if (v !== undefined) patch[k] = v;
  }
  Object.assign(row, patch, locked);
}
