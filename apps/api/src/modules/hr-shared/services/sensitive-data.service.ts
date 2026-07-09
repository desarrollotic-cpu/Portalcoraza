import { Injectable } from '@nestjs/common';

/**
 * Enmascaramiento de datos sensibles según Ley 1581 de 2012 (Colombia).
 *
 * Campos considerados sensibles: raza / etnia, religión, orientación sexual.
 * Solo los roles con el permiso `hr_sensitive.view` (GERENCIA y RRHH según
 * el seed 004_hr_module.sql) los pueden ver sin enmascarar. Para el resto,
 * los IDs se anulan y el objeto relacionado se sustituye por un marcador.
 */

interface UserContext {
  permissions?: string[];
  role?: string;
}

const SENSITIVE_MASK = { id: '__masked__', kind: '__masked__', value: '*** OCULTO ***' };

@Injectable()
export class SensitiveDataService {
  canSeeSensitive(user: UserContext | null | undefined): boolean {
    if (!user) return false;
    const perms = user.permissions ?? [];
    return perms.includes('hr_sensitive.view');
  }

  maskAssociate<T extends Record<string, unknown>>(
    associate: T,
    user: UserContext | null | undefined,
  ): T {
    if (this.canSeeSensitive(user)) return associate;

    const copy: Record<string, unknown> = { ...associate };
    copy.raceId = null;
    copy.race = { ...SENSITIVE_MASK, kind: 'RAZA' };
    copy.religionId = null;
    copy.religion = { ...SENSITIVE_MASK, kind: 'RELIGION' };
    copy.sexualOrientationId = null;
    copy.sexualOrientation = { ...SENSITIVE_MASK, kind: 'ORIENTACION_SEXUAL' };
    return copy as T;
  }

  maskMany<T extends Record<string, unknown>>(items: T[], user: UserContext | null | undefined): T[] {
    if (this.canSeeSensitive(user)) return items;
    return items.map((it) => this.maskAssociate(it, user));
  }
}
