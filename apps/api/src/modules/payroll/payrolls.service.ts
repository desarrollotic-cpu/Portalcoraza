import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Associate, AssociateStatus } from '../associates/entities/associate.entity';
import { ShiftSchedule, ShiftType } from '../scheduling/entities/shift-schedule.entity';
import { AccountingService } from '../accounting/accounting.service';
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

    // SMMLV y Auxilio de Transporte 2026 estimación base Colombia
    const SMMLV_2026 = 1450000;
    const AUX_TRANSPORTE_2026 = 180000;

    let totalNominaGasto = 0;

    for (const assoc of associates) {
      const basicSalary = SMMLV_2026;
      const workedDays = 30; // Mes laboral ordinario

      // Consultar turnos asignados en el rango de fechas
      const shifts = await this.scheduleRepo.find({
        where: {
          associateId: assoc.id,
        },
      });

      const nightShiftsCount = shifts.filter((s) => s.shiftType === ShiftType.NIGHT).length;
      const hourlyRate = basicSalary / 240;
      const nightSurcharges = Number((nightShiftsCount * 8 * hourlyRate * 0.35).toFixed(2));
      const overtimeAmount = 0; // Calculable según novedades extras

      const transportAllowance = basicSalary <= SMMLV_2026 * 2 ? AUX_TRANSPORTE_2026 : 0;

      const totalDevengado = basicSalary + transportAllowance + nightSurcharges + overtimeAmount;

      const healthDeduction = Number((basicSalary * 0.04).toFixed(2));
      const pensionDeduction = Number((basicSalary * 0.04).toFixed(2));
      const totalDeducido = healthDeduction + pensionDeduction;

      const netPay = totalDevengado - totalDeducido;

      totalNominaGasto += totalDevengado;

      // Buscar colilla existente o crear nueva
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
      slip.workedDays = workedDays;
      slip.transportAllowance = transportAllowance;
      slip.nightSurcharges = nightSurcharges;
      slip.overtimeAmount = overtimeAmount;
      slip.healthDeduction = healthDeduction;
      slip.pensionDeduction = pensionDeduction;
      slip.totalDevengado = totalDevengado;
      slip.totalDeducido = totalDeducido;
      slip.netPay = netPay;

      const savedSlip = await this.slipRepo.save(slip);

      // Guardar detalle de conceptos
      await this.detailRepo.delete({ slipId: savedSlip.id });

      const details = [
        this.detailRepo.create({ slipId: savedSlip.id, conceptCode: '510506', conceptName: 'Sueldo Básico', type: 'DEVENGADO', hours: 240, amount: basicSalary }),
        ...(transportAllowance > 0 ? [this.detailRepo.create({ slipId: savedSlip.id, conceptCode: '510527', conceptName: 'Auxilio de Transporte', type: 'DEVENGADO', hours: 0, amount: transportAllowance })] : []),
        ...(nightSurcharges > 0 ? [this.detailRepo.create({ slipId: savedSlip.id, conceptCode: '510515', conceptName: 'Recargos Nocturnos (35%)', type: 'DEVENGADO', hours: nightShiftsCount * 8, amount: nightSurcharges })] : []),
        this.detailRepo.create({ slipId: savedSlip.id, conceptCode: '237005', conceptName: 'Deducción Salud (4%)', type: 'DEDUCCION', hours: 0, amount: healthDeduction }),
        this.detailRepo.create({ slipId: savedSlip.id, conceptCode: '237010', conceptName: 'Deducción Pensión (4%)', type: 'DEDUCCION', hours: 0, amount: pensionDeduction }),
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
