import { Injectable } from '@nestjs/common';
import { Jornada, Turno } from './entities/schedule-assignment.entity';
import { PersonalRole } from './entities/monthly-schedule.entity';

export interface GeneratedAssignment {
  day: number;
  role: string;
  associateId: string | null;
  turno: Turno | null;
  jornada: Jornada;
  codigo: string | null;
  inicio: string | null;
  fin: string | null;
}

interface CyclePosition {
  codigo: string;
  jornada: Jornada;
  turno: Turno | null;
  inicio: string | null;
  fin: string | null;
}

/**
 * Motor de ciclo D/N/R/NR (15 días), continuo entre meses.
 * Patrón base: 6 Diurnos → 6 Nocturnos → 2 Descanso remunerado → 1 Descanso no remunerado.
 */
@Injectable()
export class MotorTurnosService {
  private readonly cycle: CyclePosition[] = [
    ...Array<CyclePosition>(6).fill({
      codigo: 'D',
      jornada: Jornada.NORMAL,
      turno: 'AM',
      inicio: '06:00',
      fin: '18:00',
    }),
    ...Array<CyclePosition>(6).fill({
      codigo: 'N',
      jornada: Jornada.NORMAL,
      turno: 'PM',
      inicio: '18:00',
      fin: '06:00',
    }),
    ...Array<CyclePosition>(2).fill({
      codigo: 'DR',
      jornada: Jornada.DESCANSO_REMUNERADO,
      turno: null,
      inicio: null,
      fin: null,
    }),
    {
      codigo: 'NR',
      jornada: Jornada.DESCANSO_NO_REMUNERADO,
      turno: null,
      inicio: null,
      fin: null,
    },
  ];

  get cycleLength(): number {
    return this.cycle.length;
  }

  /**
   * Genera las asignaciones del mes para cada rol del personal.
   * @param personal roles del puesto (con su titular)
   * @param daysInMonth número de días del mes
   * @param startPositions posición inicial del ciclo por rol (para continuidad entre meses)
   */
  generate(
    personal: PersonalRole[],
    daysInMonth: number,
    startPositions?: Record<string, number>,
  ): GeneratedAssignment[] {
    const result: GeneratedAssignment[] = [];

    personal.forEach((role, index) => {
      const baseOffset =
        startPositions?.[role.rol] ?? (index * 6) % this.cycleLength;

      for (let day = 1; day <= daysInMonth; day++) {
        const position =
          (baseOffset + (day - 1)) % this.cycleLength;
        const slot = this.cycle[position];

        result.push({
          day,
          role: role.rol,
          associateId: role.associateId ?? null,
          turno: slot.turno,
          jornada: slot.jornada,
          codigo: slot.codigo,
          inicio: slot.inicio,
          fin: slot.fin,
        });
      }
    });

    return result;
  }
}
