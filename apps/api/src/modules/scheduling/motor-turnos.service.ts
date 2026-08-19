import { Injectable } from '@nestjs/common';
import { Jornada, Turno } from './entities/schedule-assignment.entity';
import { PersonalRole } from './entities/monthly-schedule.entity';

/** Ciclos soportados — paridad con APP-CONTABILIDAD (`motorTurnos.ts`). */
export type TipoCiclo = '12x3' | '10x5' | '2x2' | '13x2';

export interface GeneratedAssignment {
  day: number;
  role: string;
  associateId: string | null;
  turno: Turno | null;
  jornada: Jornada;
  codigo: string | null;
  inicio: string | null;
  fin: string | null;
  cyclePosition: number;
}

interface CyclePosition {
  codigo: string;
  jornada: Jornada;
  turno: Turno | null;
  inicio: string | null;
  fin: string | null;
}

interface CycleConfig {
  name: string;
  totalDays: number;
  phases: ReadonlyArray<CyclePosition>;
}

const HOURS_D: Pick<CyclePosition, 'inicio' | 'fin'> = {
  inicio: '06:00',
  fin: '18:00',
};
const HOURS_N: Pick<CyclePosition, 'inicio' | 'fin'> = {
  inicio: '18:00',
  fin: '06:00',
};

function d(): CyclePosition {
  return {
    codigo: 'D',
    jornada: Jornada.NORMAL,
    turno: 'AM',
    ...HOURS_D,
  };
}
function n(): CyclePosition {
  return {
    codigo: 'N',
    jornada: Jornada.NORMAL,
    turno: 'PM',
    ...HOURS_N,
  };
}
function r(): CyclePosition {
  return {
    codigo: 'DR',
    jornada: Jornada.DESCANSO_REMUNERADO,
    turno: null,
    inicio: null,
    fin: null,
  };
}
function nr(): CyclePosition {
  return {
    codigo: 'NR',
    jornada: Jornada.DESCANSO_NO_REMUNERADO,
    turno: null,
    inicio: null,
    fin: null,
  };
}

/**
 * Motor de turnos — lógica de negocio de APP-CONTABILIDAD.
 * Ciclo continuo entre meses; no se reinicia el día 1.
 *
 * | Ciclo | Longitud | Patrón |
 * |-------|----------|--------|
 * | 12x3  | 15       | 6D → 6N → 2R → 1NR |
 * | 10x5  | 15       | 5D → 5N → 2R → 3NR |
 * | 2x2   | 6        | 2D → 2N → 2NR |
 * | 13x2  | 30       | 13D → 2R → 13N → 2R |
 */
@Injectable()
export class MotorTurnosService {
  readonly configs: Record<TipoCiclo, CycleConfig> = {
    '12x3': {
      name: 'Ciclo 12x3 (6D-6N-3Desc)',
      totalDays: 15,
      phases: [
        d(), d(), d(), d(), d(), d(),
        n(), n(), n(), n(), n(), n(),
        r(), r(), nr(),
      ],
    },
    '10x5': {
      name: 'Ciclo 10x5 (5D-5N-5Desc)',
      totalDays: 15,
      phases: [
        d(), d(), d(), d(), d(),
        n(), n(), n(), n(), n(),
        r(), r(), nr(), nr(), nr(),
      ],
    },
    '2x2': {
      name: 'Ciclo 2x2 (2D-2N-2Desc NR)',
      totalDays: 6,
      phases: [d(), d(), n(), n(), nr(), nr()],
    },
    '13x2': {
      name: 'Ciclo 13x2 (13D-2R-13N-2R)',
      totalDays: 30,
      phases: [
        d(), d(), d(), d(), d(), d(), d(), d(), d(), d(), d(), d(), d(),
        r(), r(),
        n(), n(), n(), n(), n(), n(), n(), n(), n(), n(), n(), n(), n(),
        r(), r(),
      ],
    },
  };

  /** Compat: longitud del ciclo por defecto (12x3). */
  get cycleLength(): number {
    return this.configs['12x3'].totalDays;
  }

  normalizePosition(pos: number, tipoCiclo: TipoCiclo = '12x3'): number {
    const total = this.configs[tipoCiclo]?.totalDays ?? this.configs['12x3'].totalDays;
    return ((pos % total) + total) % total;
  }

  /**
   * Genera las asignaciones del mes para cada rol del personal.
   * Titulares siguen el ciclo (12x3, etc.). Roles `relevante*` solo cubren
   * huecos D/N que dejan los titulares ese día (resto: NR = libre en este puesto).
   */
  generate(
    personal: PersonalRole[],
    daysInMonth: number,
    startPositions?: Record<string, number>,
    tipoCiclo: TipoCiclo = '12x3',
    tipoCicloByRole?: Record<string, TipoCiclo>,
  ): GeneratedAssignment[] {
    const titulares = personal.filter((p) => !this.isRelevanteRole(p.rol));
    const relevantes = personal.filter((p) => this.isRelevanteRole(p.rol));
    const cycleRoles = titulares.length > 0 ? titulares : personal;

    const result: GeneratedAssignment[] = [];

    cycleRoles.forEach((role, index) => {
      const cycleKey =
        tipoCicloByRole?.[role.rol] ??
        (role as PersonalRole & { tipoCiclo?: TipoCiclo }).tipoCiclo ??
        tipoCiclo;
      const config = this.configs[cycleKey] ?? this.configs['12x3'];
      const len = config.totalDays;
      const baseOffset =
        startPositions?.[role.rol] ?? (index * 6) % len;

      for (let day = 1; day <= daysInMonth; day++) {
        const position = this.normalizePosition(baseOffset + (day - 1), cycleKey);
        const slot = config.phases[position];

        result.push({
          day,
          role: role.rol,
          associateId: role.associateId ?? null,
          turno: slot.turno,
          jornada: slot.jornada,
          codigo: slot.codigo,
          inicio: slot.inicio,
          fin: slot.fin,
          cyclePosition: position,
        });
      }
    });

    if (titulares.length > 0 && relevantes.length > 0) {
      result.push(
        ...this.generateRelevanteGapFill(relevantes, result, daysInMonth),
      );
    }

    return result;
  }

  /** `relevante`, `relevante_1`, etc. */
  isRelevanteRole(rol: string): boolean {
    return /^relevante(_\d+)?$/i.test(rol.trim());
  }

  /**
   * Relevante solo trabaja cuando falta D o N entre titulares.
   * Si no hay hueco, queda NR (disponible para otro puesto / descanso).
   */
  generateRelevanteGapFill(
    relevantes: PersonalRole[],
    titularAssignments: GeneratedAssignment[],
    daysInMonth: number,
  ): GeneratedAssignment[] {
    const out: GeneratedAssignment[] = [];
    const rest = nr();

    for (let day = 1; day <= daysInMonth; day++) {
      const cells = titularAssignments.filter((a) => a.day === day);
      const hasD = cells.some((c) => c.codigo === 'D');
      const hasN = cells.some((c) => c.codigo === 'N');
      const gaps: Array<'D' | 'N'> = [];
      if (!hasD) gaps.push('D');
      if (!hasN) gaps.push('N');

      relevantes.forEach((role, index) => {
        const gap = gaps[index];
        if (gap === 'D') {
          const slot = d();
          out.push({
            day,
            role: role.rol,
            associateId: role.associateId ?? null,
            turno: slot.turno,
            jornada: slot.jornada,
            codigo: slot.codigo,
            inicio: slot.inicio,
            fin: slot.fin,
            cyclePosition: -1,
          });
        } else if (gap === 'N') {
          const slot = n();
          out.push({
            day,
            role: role.rol,
            associateId: role.associateId ?? null,
            turno: slot.turno,
            jornada: slot.jornada,
            codigo: slot.codigo,
            inicio: slot.inicio,
            fin: slot.fin,
            cyclePosition: -1,
          });
        } else {
          out.push({
            day,
            role: role.rol,
            associateId: role.associateId ?? null,
            turno: rest.turno,
            jornada: rest.jornada,
            codigo: rest.codigo,
            inicio: rest.inicio,
            fin: rest.fin,
            cyclePosition: -1,
          });
        }
      });
    }

    return out;
  }

  /**
   * Extrae la posición de ciclo al final del mes por rol
   * (para propagar al mes siguiente).
   */
  endPositionsByRole(
    assignments: Array<{ day: number; role: string; codigo?: string | null; cyclePosition?: number | null }>,
    daysInMonth: number,
  ): Record<string, number> {
    const lastByRole: Record<string, number> = {};
    for (const a of assignments) {
      if (a.day !== daysInMonth) continue;
      if (typeof a.cyclePosition === 'number') {
        lastByRole[a.role] = a.cyclePosition;
      }
    }
    const next: Record<string, number> = {};
    for (const [role, pos] of Object.entries(lastByRole)) {
      next[role] = this.normalizePosition(pos + 1);
    }
    return next;
  }

  /**
   * Validaciones de tablero (cobertura / doble descanso / racha).
   * Paridad con `validarTableroMes` de APP-CONTABILIDAD.
   */
  validateBoard(
    assignments: GeneratedAssignment[],
    daysInMonth: number,
  ): Array<{ type: string; day?: number; message: string; severity: 'warning' | 'error' }> {
    const alerts: Array<{
      type: string;
      day?: number;
      message: string;
      severity: 'warning' | 'error';
    }> = [];

    if (!assignments.length) {
      alerts.push({
        type: 'puesto_critico',
        message: 'Sin personal asignado en el tablero',
        severity: 'error',
      });
      return alerts;
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const cells = assignments.filter((a) => a.day === day);
      const hasD = cells.some((c) => c.codigo === 'D');
      const hasN = cells.some((c) => c.codigo === 'N');
      const allRest = cells.every(
        (c) => c.codigo === 'R' || c.codigo === 'NR' || c.codigo === 'DR',
      );

      if (!hasD) {
        alerts.push({
          type: 'cobertura_rota',
          day,
          message: `Día ${day}: sin cobertura diurna`,
          severity: 'error',
        });
      }
      if (!hasN) {
        alerts.push({
          type: 'cobertura_rota',
          day,
          message: `Día ${day}: sin cobertura nocturna`,
          severity: 'error',
        });
      }
      if (allRest && cells.length) {
        alerts.push({
          type: 'doble_descanso',
          day,
          message: `Día ${day}: todos en descanso`,
          severity: 'warning',
        });
      }
    }

    const byRole = new Map<string, GeneratedAssignment[]>();
    for (const a of assignments) {
      const list = byRole.get(a.role) ?? [];
      list.push(a);
      byRole.set(a.role, list);
    }
    for (const [role, cells] of byRole) {
      const sorted = [...cells].sort((a, b) => a.day - b.day);
      let streak = 0;
      let lastCode: string | null = null;
      for (const c of sorted) {
        if ((c.codigo === 'D' || c.codigo === 'N') && c.codigo === lastCode) {
          streak += 1;
        } else if (c.codigo === 'D' || c.codigo === 'N') {
          streak = 1;
          lastCode = c.codigo;
        } else {
          streak = 0;
          lastCode = null;
        }
        if (streak > 6) {
          alerts.push({
            type: 'ciclo_violado',
            day: c.day,
            message: `Rol ${role}: más de 6 días consecutivos en ${lastCode}`,
            severity: 'warning',
          });
          break;
        }
      }
    }

    return alerts;
  }
}
