import { Injectable } from '@nestjs/common';

const MS_PER_YEAR = 1000 * 60 * 60 * 24 * 365.2425;

/**
 * Cálculo de campos derivados de un asociado:
 *   • edad al ingreso
 *   • edad actual (o a la fecha de retiro)
 *   • antigüedad en la empresa
 *
 * Estos campos NO se almacenan; se calculan al vuelo cada vez que el asociado
 * se lee, para no invalidarse con el paso del tiempo.
 */
@Injectable()
export class AssociateDerivedService {
  yearsBetween(from: Date | string | null, to: Date | string | null): number {
    if (!from || !to) return 0;
    const fromDate = new Date(from);
    const toDate = new Date(to);
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) return 0;
    const diff = toDate.getTime() - fromDate.getTime();
    return Math.round(Math.max(0, diff / MS_PER_YEAR) * 10) / 10;
  }

  compute(input: {
    birthDate: string | null;
    hireDate: string | null;
    status?: string;
    retirementDate?: string | null;
  }): {
    ageAtHire: number;
    currentAge: number;
    tenureYears: number;
  } {
    const now = new Date();
    const isRetired = input.status === 'RETIRADO';
    const endTenure = isRetired && input.retirementDate ? new Date(input.retirementDate) : now;

    return {
      ageAtHire: this.yearsBetween(input.birthDate, input.hireDate),
      currentAge: this.yearsBetween(input.birthDate, now),
      tenureYears: this.yearsBetween(input.hireDate, endTenure),
    };
  }
}
