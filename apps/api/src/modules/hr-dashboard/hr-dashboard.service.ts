import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Associate, AssociateStatus } from '../associates/entities/associate.entity';
import { AssociateDerivedService } from '../hr-shared/services/associate-derived.service';
import { Retirement } from '../hr-retirements/entities/retirement.entity';

/**
 * Servicio que alimenta el Dashboard HRM. Todas las queries son agregadas
 * (no exponen datos personales por asociado) para servir como fuente de
 * verdad de los KPIs y gráficos del panel principal.
 */
@Injectable()
export class HrDashboardService {
  constructor(
    @InjectRepository(Associate)
    private readonly associatesRepo: Repository<Associate>,
    @InjectRepository(Retirement)
    private readonly retirementsRepo: Repository<Retirement>,
    private readonly derived: AssociateDerivedService,
  ) {}

  /** KPIs principales: activos, retirados, suspendidos, vacaciones. */
  async counts() {
    const rows = await this.associatesRepo
      .createQueryBuilder('a')
      .select('a.status', 'status')
      .addSelect('COUNT(a.id)::int', 'total')
      .groupBy('a.status')
      .getRawMany<{ status: AssociateStatus; total: number }>();

    const result: Record<AssociateStatus, number> = {
      [AssociateStatus.ACTIVO]: 0,
      [AssociateStatus.INACTIVO]: 0,
      [AssociateStatus.SUSPENDIDO]: 0,
      [AssociateStatus.VACACIONES]: 0,
      [AssociateStatus.RETIRADO]: 0,
    };
    for (const row of rows) result[row.status] = Number(row.total);
    return result;
  }

  /**
   * Rotación mensual de los últimos 6 meses.
   * rotationRate = retiros del mes / plantilla activa promedio del mes.
   */
  async monthlyRotation() {
    const months: { key: string; retirements: number; activeAtEnd: number; rate: number }[] = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const key = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, '0')}`;

      const retirements = await this.retirementsRepo
        .createQueryBuilder('r')
        .where('r.retirementDate BETWEEN :from AND :to', {
          from: monthStart.toISOString().slice(0, 10),
          to: monthEnd.toISOString().slice(0, 10),
        })
        .getCount();

      const activeAtEnd = await this.associatesRepo
        .createQueryBuilder('a')
        .where('a.hireDate <= :to', { to: monthEnd.toISOString().slice(0, 10) })
        .andWhere(
          `(a.status = 'ACTIVO' OR (a.status = 'RETIRADO' AND NOT EXISTS (
            SELECT 1 FROM associate_retirements ar WHERE ar.associate_id = a.id AND ar.retirement_date <= :to
          )))`,
          { to: monthEnd.toISOString().slice(0, 10) },
        )
        .getCount();

      const rate = activeAtEnd > 0 ? Number(((retirements / activeAtEnd) * 100).toFixed(2)) : 0;
      months.push({ key, retirements, activeAtEnd, rate });
    }

    return months;
  }

  /** Distribución demográfica: agrupación por catálogo (EPS, género…). */
  async demographics() {
    const [byEps, byGender, byEducation] = await Promise.all([
      this.groupByCatalog('epsId', 'eps'),
      this.groupByCatalog('genderId', 'gender'),
      this.groupByCatalog('educationLevelId', 'educationLevel'),
    ]);
    return { byEps, byGender, byEducation, byAgeBucket: await this.ageBuckets() };
  }

  private async groupByCatalog(fkColumn: string, alias: string) {
    const rows = await this.associatesRepo
      .createQueryBuilder('a')
      .leftJoin(`a.${alias}`, alias)
      .select(`${alias}.value`, 'label')
      .addSelect('COUNT(a.id)::int', 'total')
      .where('a.status = :status', { status: AssociateStatus.ACTIVO })
      .andWhere(`a.${fkColumn} IS NOT NULL`)
      .groupBy(`${alias}.value`)
      .orderBy('total', 'DESC')
      .getRawMany<{ label: string; total: number }>();
    return rows.map((r) => ({ label: r.label ?? 'Sin dato', total: Number(r.total) }));
  }

  private async ageBuckets() {
    const rows = await this.associatesRepo.find({
      where: { status: AssociateStatus.ACTIVO },
      select: ['id', 'birthDate', 'hireDate', 'status'],
    });
    const buckets = { '18-25': 0, '26-35': 0, '36-45': 0, '46-55': 0, '56+': 0 };
    for (const a of rows) {
      const { currentAge } = this.derived.compute({
        birthDate: a.birthDate,
        hireDate: a.hireDate,
        status: a.status,
      });
      if (currentAge < 26) buckets['18-25'] += 1;
      else if (currentAge < 36) buckets['26-35'] += 1;
      else if (currentAge < 46) buckets['36-45'] += 1;
      else if (currentAge < 56) buckets['46-55'] += 1;
      else buckets['56+'] += 1;
    }
    return Object.entries(buckets).map(([label, total]) => ({ label, total }));
  }

  /** Top 8 motivos de retiro más comunes de los últimos 12 meses. */
  async retirementReasons() {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const rows = await this.retirementsRepo
      .createQueryBuilder('r')
      .leftJoin('r.reason', 'reason')
      .select('reason.value', 'label')
      .addSelect('COUNT(r.id)::int', 'total')
      .where('r.retirementDate >= :from', { from: oneYearAgo.toISOString().slice(0, 10) })
      .groupBy('reason.value')
      .orderBy('total', 'DESC')
      .limit(8)
      .getRawMany<{ label: string; total: number }>();

    return rows.map((r) => ({ label: r.label ?? 'Sin dato', total: Number(r.total) }));
  }

  /** Distribución de plantilla activa por cargo (top 10). */
  async byPosition() {
    const rows = await this.associatesRepo
      .createQueryBuilder('a')
      .leftJoin('a.jobPosition', 'jp')
      .select('jp.name', 'label')
      .addSelect('COUNT(a.id)::int', 'total')
      .addSelect('jp.isCritical', 'isCritical')
      .where('a.status = :status', { status: AssociateStatus.ACTIVO })
      .groupBy('jp.name')
      .addGroupBy('jp.isCritical')
      .orderBy('total', 'DESC')
      .limit(10)
      .getRawMany<{ label: string; total: number; isCritical: boolean }>();
    return rows.map((r) => ({
      label: r.label ?? 'Sin cargo',
      total: Number(r.total),
      isCritical: Boolean(r.isCritical),
    }));
  }

  /** Distribución de plantilla activa por centro de trabajo. */
  async byWorkCenter() {
    const rows = await this.associatesRepo
      .createQueryBuilder('a')
      .leftJoin('a.workCenter', 'wc')
      .select('wc.clientName', 'label')
      .addSelect('wc.code', 'code')
      .addSelect('COUNT(a.id)::int', 'total')
      .where('a.status = :status', { status: AssociateStatus.ACTIVO })
      .groupBy('wc.clientName')
      .addGroupBy('wc.code')
      .orderBy('total', 'DESC')
      .getRawMany<{ label: string; code: string; total: number }>();
    return rows.map((r) => ({
      label: r.label ?? 'Sin asignar',
      code: r.code ?? '—',
      total: Number(r.total),
    }));
  }

  /**
   * Matriz SST: personal activo en cargos críticos con 4 requisitos
   * (curso, psicofísico, psicosensométrico, póliza SURA).
   */
  async complianceMatrix() {
    const rows = await this.associatesRepo.query<
      {
        associate_id: string;
        document_number: string;
        full_name: string;
        position_name: string | null;
        work_center_code: string | null;
        is_critical: boolean;
        psychophysical_valid: boolean;
        psychosensometric_valid: boolean;
        has_sura_policy: boolean;
        psychophysical_expires_at: string | null;
        psychosensometric_expires_at: string | null;
        course_expires_at: string | null;
        sura_policy_expires_at: string | null;
      }[]
    >(
      `SELECT
         v.associate_id,
         v.document_number,
         v.full_name,
         v.position_name,
         wc.code AS work_center_code,
         v.is_critical,
         v.psychophysical_valid,
         v.psychosensometric_valid,
         v.has_sura_policy,
         v.psychophysical_expires_at,
         v.psychosensometric_expires_at,
         v.course_expires_at,
         v.sura_policy_expires_at
       FROM v_hr_compliance_matrix v
       LEFT JOIN associates a ON a.id = v.associate_id
       LEFT JOIN work_centers wc ON wc.id = a.work_center_id
       WHERE v.is_critical = true
       ORDER BY v.position_name NULLS LAST, v.full_name`,
    );

    const today = new Date().toISOString().slice(0, 10);
    const isFuture = (d: string | null) => !!d && d.slice(0, 10) >= today;

    return rows.map((r) => {
      const courseValid = isFuture(r.course_expires_at);
      const psychophysicalValid =
        r.psychophysical_valid || isFuture(r.psychophysical_expires_at);
      const psychosensometricValid =
        r.psychosensometric_valid || isFuture(r.psychosensometric_expires_at);
      const hasSuraPolicy = r.has_sura_policy || isFuture(r.sura_policy_expires_at);

      return {
        associateId: r.associate_id,
        documentNumber: r.document_number,
        fullName: r.full_name,
        positionName: r.position_name,
        workCenterCode: r.work_center_code,
        isCritical: r.is_critical,
        courseValid,
        psychophysicalValid,
        psychosensometricValid,
        hasSuraPolicy,
        isComplete:
          courseValid && psychophysicalValid && psychosensometricValid && hasSuraPolicy,
      };
    });
  }

  /** Bundle único para pintar el dashboard en un solo request. */
  async overview() {
    const [counts, rotation, demographics, reasons, positions, workCenters] = await Promise.all([
      this.counts(),
      this.monthlyRotation(),
      this.demographics(),
      this.retirementReasons(),
      this.byPosition(),
      this.byWorkCenter(),
    ]);
    return { counts, rotation, demographics, retirementReasons: reasons, positions, workCenters };
  }
}
