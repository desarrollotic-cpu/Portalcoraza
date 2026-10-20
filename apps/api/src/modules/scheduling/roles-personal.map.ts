import type { PersonalRole } from './entities/monthly-schedule.entity';

/** Lo que `rolesToPersonal` necesita de una fila de `monthly_schedule_roles`. */
export interface RoleRowLike {
  rol: string;
  associateId: string | null;
  turnoId: string | null;
  displayName: string | null;
  orden: number;
}

/**
 * Filas de `monthly_schedule_roles` -> la forma `personal` que usan el API y el
 * cuadro. El contrato con el frontend no cambió al pasar de JSONB a tabla
 * (migración 093): lo que cambió es dónde se guarda.
 *
 * Ordena por `orden`, y por clave cuando dos filas lo comparten, para que el
 * cuadro pinte las filas siempre igual.
 */
export function rolesToPersonal(roles: ReadonlyArray<RoleRowLike> | undefined): PersonalRole[] {
  return [...(roles ?? [])]
    .sort((a, b) => a.orden - b.orden || a.rol.localeCompare(b.rol))
    .map((r) => ({
      rol: r.rol,
      associateId: r.associateId,
      turnoId: r.turnoId,
      ...(r.displayName ? { displayName: r.displayName } : {}),
    }));
}

/**
 * Deja la lista lista para grabar: sin claves vacías y sin repetidas.
 *
 * `monthly_schedule_roles` tiene UNIQUE (schedule_id, rol); antes, con JSONB,
 * una clave repetida se guardaba sin queja y el motor generaba celdas
 * ambiguas para ese rol. Gana la primera aparición y se conserva el orden.
 */
export function dedupePersonal(
  personal: ReadonlyArray<PersonalRole>,
): Array<PersonalRole & { rol: string }> {
  const vistos = new Set<string>();
  const out: Array<PersonalRole & { rol: string }> = [];
  for (const p of personal) {
    const rol = (p.rol ?? '').trim();
    if (!rol || vistos.has(rol)) continue;
    vistos.add(rol);
    out.push({ ...p, rol });
  }
  return out;
}
