import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Associate, AssociateStatus } from '../associates/entities/associate.entity';
import { ShiftSchedule, ShiftType } from '../scheduling/entities/shift-schedule.entity';
import { AccountingService } from '../accounting/accounting.service';
import { getColombiaHolidays } from '../scheduling/utils/colombia-holidays';
import { PayrollPeriod } from './entities/payroll-period.entity';
import { PayrollSlipDetail } from './entities/payroll-slip-detail.entity';
import { PayrollSlip } from './entities/payroll-slip.entity';

@Injectable()
export class PayrollsService {
  constructor(
    @InjectRepository(PayrollPeriod)
    private readonly periodRepo: Repository<PayrollPeriod>,
    @InjectRepository(PayrollSlip)
    private readonly slipRepo: Repository<PayrollSlip>,
    @InjectRepository(PayrollSlipDetail)
    private readonly detailRepo: Repository<PayrollSlipDetail>,
    @InjectRepository(Associate)
    private readonly associateRepo: Repository<Associate>,
    @InjectRepository(ShiftSchedule)
    private readonly scheduleRepo: Repository<ShiftSchedule>,
    private readonly accountingService: AccountingService,
  ) {}

  async getPeriods(): Promise<PayrollPeriod[]> {
    return this.periodRepo.find({
      order: { startDate: 'DESC' },
    });
  }

  async getPeriodById(id: string): Promise<PayrollPeriod> {
    const period = await this.periodRepo.findOne({
      where: { id },
      relations: ['slips', 'slips.associate'],
    });
    if (!period) throw new NotFoundException('Periodo de nómina no encontrado');
    return period;
  }

  async createPeriod(dto: { periodName: string; startDate: string; endDate: string }): Promise<PayrollPeriod> {
    const period = this.periodRepo.create({
      periodName: dto.periodName,
      startDate: dto.startDate,
      endDate: dto.endDate,
      status: 'BORRADOR',
    });
    return this.periodRepo.save(period);
  }

  async calculatePeriod(periodId: string): Promise<PayrollPeriod> {
    const period = await this.getPeriodById(periodId);
    if (period.status === 'CERRADO') {
      throw new BadRequestException('El periodo de nómina ya está cerrado y no se puede reliquidar');
    }

    const associates = await this.associateRepo.find({
      where: { status: AssociateStatus.ACTIVO },
    });

    if (!associates || associates.length === 0) {
      throw new BadRequestException('No hay asociados activos para liquidar en este periodo');
    }

    // SMMLV y Auxilio de Transporte 2026 Colombia
    const SMMLV_2026 = 1450000;
    const AUX_TRANSPORTE_2026 = 180000;
    const hourlyRate = SMMLV_2026 / 240;

    const startDate = new Date(period.startDate);
    const year = startDate.getFullYear();
    const month = startDate.getMonth() + 1;
    const holidays = getColombiaHolidays(year);
    const holidayDates = new Set(holidays.map((h) => h.date));

    // Consultar todas las asignaciones oficiales de este mes y año
    const assignments = await this.scheduleRepo.manager.query(
      `
      SELECT sa.associate_id, sa.day, sa.codigo, sa.turno, sa.jornada, sa.inicio, sa.fin
      FROM schedule_assignments sa
      JOIN monthly_schedules ms ON ms.id = sa.schedule_id
      WHERE ms.year = $1 AND ms.month = $2 AND sa.associate_id IS NOT NULL
      `,
      [year, month],
    );

    // Agrupar asignaciones por asociado
    const assignmentsByAssociate = new Map<string, any[]>();
    for (const a of assignments) {
      const list = assignmentsByAssociate.get(a.associate_id) ?? [];
      list.push(a);
      assignmentsByAssociate.set(a.associate_id, list);
    }

    let totalNominaGasto = 0;

    for (const assoc of associates) {
      const assocAssignments = assignmentsByAssociate.get(assoc.id) ?? [];
      const basicSalary = SMMLV_2026;

      let workedDays = 0;
      let regularHours = 0;
      let nightHoursRegular = 0;
      let sundayHolidayDayHours = 0;
      let sundayHolidayNightHours = 0;

      for (const asig of assocAssignments) {
        const c = (asig.codigo || '').toUpperCase().trim();
        if (!c || c === 'DR' || c === 'NR' || c === 'VAC' || c === 'LC' || c === 'IN' || c === 'SP') {
          continue;
        }

        workedDays++;
        const dayNum = asig.day;
        const dObj = new Date(year, month - 1, dayNum);
        const iso = `${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
        const isSundayOrHoliday = dObj.getDay() === 0 || holidayDates.has(iso);

        if (c === 'D' || c === 'D12' || c === '12D') {
          regularHours += 12;
          if (isSundayOrHoliday) {
            sundayHolidayDayHours += 12;
          }
        } else if (c === 'N' || c === 'N12' || c === '12N') {
          regularHours += 12;
          if (isSundayOrHoliday) {
            sundayHolidayDayHours += 3;
            sundayHolidayNightHours += 9;
          } else {
            nightHoursRegular += 9;
          }
        } else if (c === 'D8' || c === '8D') {
          regularHours += 8;
          if (isSundayOrHoliday) {
            sundayHolidayDayHours += 8;
          }
        } else if (c === 'N8' || c === '8N') {
          regularHours += 8;
          if (isSundayOrHoliday) {
            sundayHolidayNightHours += 8;
          } else {
            nightHoursRegular += 8;
          }
        } else {
          regularHours += 8;
        }
      }

      // Si no tiene asignaciones en la malla, asumimos los 30 días base estándar
      if (workedDays === 0) {
        workedDays = 30;
      }

      const nightSurcharges = Number((nightHoursRegular * hourlyRate * 0.35).toFixed(2));
      const sundayHolidaySurcharges = Number(
        (sundayHolidayDayHours * hourlyRate * 0.75 + sundayHolidayNightHours * hourlyRate * 1.10).toFixed(2)
      );
      const totalRecargos = nightSurcharges + sundayHolidaySurcharges;
      const transportAllowance = basicSalary <= SMMLV_2026 * 2 ? AUX_TRANSPORTE_2026 : 0;
      const overtimeAmount = 0;

      const totalDevengado = basicSalary + transportAllowance + totalRecargos + overtimeAmount;
      const healthDeduction = Number((basicSalary * 0.04).toFixed(2));
      const pensionDeduction = Number((basicSalary * 0.04).toFixed(2));
      const totalDeducido = healthDeduction + pensionDeduction;
      const netPay = totalDevengado - totalDeducido;

      totalNominaGasto += totalDevengado;

      // Guardar o actualizar colilla
      let slip = await this.slipRepo.findOne({
        where: { periodId: period.id, associateId: assoc.id },
      });

      if (!slip) {
        slip = this.slipRepo.create({
          periodId: period.id,
          associateId: assoc.id,
        });
      }

      slip.basicSalary = basicSalary;
      slip.workedDays = Math.min(30, workedDays);
      slip.transportAllowance = transportAllowance;
      slip.nightSurcharges = totalRecargos;
      slip.overtimeAmount = overtimeAmount;
      slip.healthDeduction = healthDeduction;
      slip.pensionDeduction = pensionDeduction;
      slip.totalDevengado = totalDevengado;
      slip.totalDeducido = totalDeducido;
      slip.netPay = netPay;

      const savedSlip = await this.slipRepo.save(slip);

      // Guardar desglose oficial de conceptos
      await this.detailRepo.delete({ slipId: savedSlip.id });

      const details = [
        this.detailRepo.create({
          slipId: savedSlip.id,
          conceptCode: '510506',
          conceptName: 'Sueldo Básico',
          type: 'DEVENGADO',
          hours: Math.min(240, (workedDays || 30) * 8),
          amount: basicSalary,
        }),
        ...(transportAllowance > 0
          ? [
              this.detailRepo.create({
                slipId: savedSlip.id,
                conceptCode: '510527',
                conceptName: 'Auxilio de Transporte',
                type: 'DEVENGADO',
                hours: 0,
                amount: transportAllowance,
              }),
            ]
          : []),
        ...(nightSurcharges > 0
          ? [
              this.detailRepo.create({
                slipId: savedSlip.id,
                conceptCode: '510515',
                conceptName: `Recargo Nocturno Ordinario 35% (${nightHoursRegular}h)`,
                type: 'DEVENGADO',
                hours: nightHoursRegular,
                amount: nightSurcharges,
              }),
            ]
          : []),
        ...(sundayHolidaySurcharges > 0
          ? [
              this.detailRepo.create({
                slipId: savedSlip.id,
                conceptCode: '510518',
                conceptName: `Recargos Dominicales y Festivos (${sundayHolidayDayHours + sundayHolidayNightHours}h)`,
                type: 'DEVENGADO',
                hours: sundayHolidayDayHours + sundayHolidayNightHours,
                amount: sundayHolidaySurcharges,
              }),
            ]
          : []),
        this.detailRepo.create({
          slipId: savedSlip.id,
          conceptCode: '237005',
          conceptName: 'Deducción Salud (4%)',
          type: 'DEDUCCION',
          hours: 0,
          amount: healthDeduction,
        }),
        this.detailRepo.create({
          slipId: savedSlip.id,
          conceptCode: '237010',
          conceptName: 'Deducción Pensión (4%)',
          type: 'DEDUCCION',
          hours: 0,
          amount: pensionDeduction,
        }),
      ];

      await this.detailRepo.save(details);
    }

    period.status = 'LIQUIDADO';
    await this.periodRepo.save(period);

    // Asiento Contable Automático en PUC
    if (totalNominaGasto > 0) {
      const totalSaludPencionDeduccion = Number((totalNominaGasto * 0.08).toFixed(2));
      const totalNetoPagar = totalNominaGasto - totalSaludPencionDeduccion;

      await this.accountingService.createEntry({
        concept: `Causación de Nómina Periodo ${period.periodName}`,
        sourceModule: 'NOMINA',
        sourceId: period.id,
        details: [
          { accountCode: '510506', debitAmount: totalNominaGasto, creditAmount: 0, costCenter: 'OPERACION VIGILANCIA' },
          { accountCode: '237005', debitAmount: 0, creditAmount: Number((totalSaludPencionDeduccion / 2).toFixed(2)), costCenter: 'EPS' },
          { accountCode: '237010', debitAmount: 0, creditAmount: Number((totalSaludPencionDeduccion / 2).toFixed(2)), costCenter: 'AFP' },
          { accountCode: '250505', debitAmount: 0, creditAmount: totalNetoPagar, costCenter: 'ASOCIADOS' },
        ],
      });
    }

    return this.getPeriodById(periodId);
  }

  async getSlipsByPeriod(periodId: string): Promise<PayrollSlip[]> {
    return this.slipRepo.find({
      where: { periodId },
      relations: ['associate', 'details'],
      order: { createdAt: 'ASC' },
    });
  }

  async getSlipById(id: string): Promise<PayrollSlip> {
    const slip = await this.slipRepo.findOne({
      where: { id },
      relations: ['period', 'associate', 'details'],
    });
    if (!slip) throw new NotFoundException('Colilla de pago no encontrada');
    return slip;
  }

  async getMySlips(associateId: string): Promise<PayrollSlip[]> {
    return this.slipRepo.find({
      where: { associateId },
      relations: ['period', 'details'],
      order: { createdAt: 'DESC' },
    });
  }
}
