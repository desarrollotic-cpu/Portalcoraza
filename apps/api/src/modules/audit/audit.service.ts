import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { CENTRAL_ORGANIZATION_ID } from '../../common/tenant/tenant.constants';
import { TenantContext } from '../../common/tenant/tenant.context';
import { Associate } from '../associates/entities/associate.entity';
import { Post } from '../posts/entities/post.entity';
import { User } from '../users/entities/user.entity';
import {
  buildMovementSummary,
  collectSummaryIds,
  type AuditSummaryCtx,
} from './audit-movement-summary';
import { AuditLog } from './entities/audit-log.entity';

/** Historial de movimientos / control de actividades: no se conserva más de 30 días. */
export const AUDIT_RETENTION_DAYS = 30;

export interface AuditEntry {
  userId?: string;
  module: string;
  action: string;
  entityType?: string;
  entityId?: string;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  ipAddress?: string;
  userAgent?: string;
}

/** Dotación ya tiene historial propio; no saturar el feed del auditor. */
const DASHBOARD_EXCLUDE_MODULES = ['deliveries', 'inventory', 'post_equipment'];
/** Ruido que no aporta al auditor (consultas y acceso). */
const DASHBOARD_EXCLUDE_ACTIONS = [
  'view_record',
  'login',
  'logout',
  'gh_legacy_leer_ficha',
];
/** Recepción es frecuente: limitar cupo para no tapar HR/puestos/etc. */
const RECEPTION_CAP = 4;

export type DashboardAuditRow = AuditLog & {
  userName: string | null;
  /** Resumen legible para Gerencia / historial de movimientos. */
  summary?: string;
};

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    @InjectRepository(Associate)
    private readonly associatesRepo: Repository<Associate>,
    @InjectRepository(Post)
    private readonly postsRepo: Repository<Post>,
    private readonly ds: DataSource,
  ) {}

  async log(entry: AuditEntry): Promise<void> {
    const tenantId =
      TenantContext.getOptional() || CENTRAL_ORGANIZATION_ID;
    const log = this.auditRepo.create({
      tenantId,
      userId: entry.userId ?? null,
      module: entry.module,
      action: entry.action,
      entityType: entry.entityType ?? null,
      entityId: entry.entityId ?? null,
      oldValue: entry.oldValue ?? null,
      newValue: entry.newValue ?? null,
      ipAddress: entry.ipAddress ?? null,
      userAgent: entry.userAgent ?? null,
    });
    await this.auditRepo.save(log);
  }

  /**
   * Historial global de movimientos (Auditor / Gerencia).
   * Incluye auth, RRHH, recepción, dotación, etc. — sin los filtros del dashboard.
   */
  async listMovements(query: {
    module?: string;
    /** Varios módulos separados por coma (ej. deliveries,inventory). */
    modules?: string;
    action?: string;
    userId?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    items: DashboardAuditRow[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(Math.max(Number(query.limit) || 50, 1), 200);
    const qb = this.auditRepo.createQueryBuilder('a');

    const multi = (query.modules ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (multi.length > 0) {
      qb.andWhere('a.module IN (:...mods)', { mods: multi });
    } else if (query.module?.trim()) {
      qb.andWhere('a.module = :module', { module: query.module.trim() });
    }
    if (query.action?.trim()) {
      qb.andWhere('a.action ILIKE :action', {
        action: `%${query.action.trim()}%`,
      });
    }
    if (query.userId?.trim()) {
      qb.andWhere('a.user_id = :userId', { userId: query.userId.trim() });
    }
    // No servir historial más viejo que la retención (aunque aún no se haya purgado).
    const retentionFloor = new Date(
      Date.now() - AUDIT_RETENTION_DAYS * 86_400_000,
    );
    let from = query.from?.trim() || '';
    if (from) {
      const fromDate = new Date(from.length <= 10 ? `${from}T00:00:00.000Z` : from);
      if (Number.isNaN(fromDate.getTime()) || fromDate < retentionFloor) {
        from = retentionFloor.toISOString();
      }
    } else {
      from = retentionFloor.toISOString();
    }
    qb.andWhere('a.created_at >= :from', { from });
    if (query.to?.trim()) {
      // inclusive end-of-day if date-only
      const to = query.to.trim();
      qb.andWhere('a.created_at <= :to', {
        to: to.length <= 10 ? `${to}T23:59:59.999Z` : to,
      });
    }

    qb.orderBy('a.created_at', 'DESC');
    const total = await qb.getCount();
    const rows = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    const userIds = [
      ...new Set(rows.map((r) => r.userId).filter((x): x is string => !!x)),
    ];
    const users = userIds.length
      ? await this.usersRepo.find({
          where: { id: In(userIds) },
          select: ['id', 'fullName', 'email'],
        })
      : [];
    const names = new Map(
      users.map((u) => [
        u.id,
        (u.fullName?.trim() || u.email || null) as string | null,
      ]),
    );

    const summaryCtx = await this.buildSummaryCtx(rows);

    return {
      items: rows.map((r) => ({
        ...r,
        userName: r.userId ? (names.get(r.userId) ?? null) : null,
        summary: buildMovementSummary(r, summaryCtx),
      })),
      total,
      page,
      limit,
    };
  }

  private async buildSummaryCtx(rows: AuditLog[]): Promise<AuditSummaryCtx> {
    const { associateIds, postIds } = collectSummaryIds(rows);
    const associates = associateIds.length
      ? await this.associatesRepo.find({
          where: { id: In(associateIds) },
          select: [
            'id',
            'firstName',
            'secondName',
            'firstLastName',
            'secondLastName',
            'documentNumber',
          ],
        })
      : [];
    const posts = postIds.length
      ? await this.postsRepo.find({
          where: { id: In(postIds) },
          select: ['id', 'code', 'name'],
        })
      : [];
    return {
      associateById: new Map(
        associates.map((a) => {
          const name = [a.firstName, a.secondName, a.firstLastName, a.secondLastName]
            .filter(Boolean)
            .join(' ')
            .trim();
          return [
            a.id,
            { name: name || 'Asociado', documentNumber: a.documentNumber || '' },
          ] as const;
        }),
      ),
      postById: new Map(
        posts.map((p) => [p.id, { code: p.code, name: p.name }] as const),
      ),
    };
  }

  listByActions(module: string, actions: string[], take = 200) {
    return this.auditRepo.find({
      where: { module, action: In(actions) },
      order: { createdAt: 'DESC' },
      take,
    });
  }

  /** Últimas entradas de auditoría (actividad reciente del portal). */
  listRecent(take = 25) {
    return this.auditRepo.find({
      order: { createdAt: 'DESC' },
      take: Math.min(Math.max(take, 1), 50),
    });
  }

  /**
   * Feed del dashboard admin/auditor:
   * - sin dotación (historial propio)
   * - sin login/logout ni view_record
   * - prioriza HR/puestos/admin/etc.; recepción con cupo limitado
   */
  async listRecentForDashboard(take = 40): Promise<DashboardAuditRow[]> {
    const capped = Math.min(Math.max(take, 1), 60);
    const pool = await this.auditRepo
      .createQueryBuilder('a')
      .where('a.module NOT IN (:...mods)', { mods: DASHBOARD_EXCLUDE_MODULES })
      .andWhere('a.action NOT IN (:...acts)', { acts: DASHBOARD_EXCLUDE_ACTIONS })
      .orderBy('a.created_at', 'DESC')
      .take(220)
      .getMany();

    const business: AuditLog[] = [];
    const reception: AuditLog[] = [];
    for (const row of pool) {
      if (row.module === 'reception') reception.push(row);
      else business.push(row);
    }

    const mixed = [
      ...business.slice(0, Math.max(0, capped - Math.min(RECEPTION_CAP, reception.length))),
      ...reception.slice(0, RECEPTION_CAP),
    ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const rows = mixed.slice(0, capped);
    const userIds = [
      ...new Set(rows.map((r) => r.userId).filter((x): x is string => !!x)),
    ];
    const users = userIds.length
      ? await this.usersRepo.find({
          where: { id: In(userIds) },
          select: ['id', 'fullName', 'email'],
        })
      : [];
    const names = new Map(
      users.map((u) => [u.id, (u.fullName?.trim() || u.email || null) as string | null]),
    );

    return rows.map((r) => ({
      ...r,
      userName: r.userId ? (names.get(r.userId) ?? null) : null,
    }));
  }

  /**
   * Borra historial con más de `days` días:
   * - audit_logs (Historial de movimientos / Control de Actividades)
   * - marcas y pasadas cerradas de control de radio
   */
  async purgeOlderThanDays(days = AUDIT_RETENTION_DAYS): Promise<{
    auditLogs: number;
    radioChecks: number;
    radioPasses: number;
  }> {
    const cutoff = new Date(Date.now() - Math.max(1, days) * 86_400_000);
    const iso = cutoff.toISOString();
    const batch = 2000;

    let auditLogs = 0;
    for (;;) {
      const res = await this.ds.query(
        `WITH doomed AS (
           SELECT id FROM audit_logs
           WHERE created_at < $1::timestamptz
           ORDER BY created_at
           LIMIT $2
         )
         DELETE FROM audit_logs a
         USING doomed d
         WHERE a.id = d.id
         RETURNING a.id`,
        [iso, batch],
      );
      const n = Array.isArray(res) ? res.length : 0;
      auditLogs += n;
      if (n < batch) break;
    }

    let radioChecks = 0;
    try {
      for (;;) {
        const res = await this.ds.query(
          `WITH doomed AS (
             SELECT id FROM radio_control_checks
             WHERE checked_at < $1::timestamptz
             ORDER BY checked_at
             LIMIT $2
           )
           DELETE FROM radio_control_checks c
           USING doomed d
           WHERE c.id = d.id
           RETURNING c.id`,
          [iso, batch],
        );
        const n = Array.isArray(res) ? res.length : 0;
        radioChecks += n;
        if (n < batch) break;
      }
    } catch (err) {
      this.logger.warn(`Purga radio_control_checks omitida: ${(err as Error).message}`);
    }

    let radioPasses = 0;
    try {
      for (;;) {
        const res = await this.ds.query(
          `WITH doomed AS (
             SELECT id FROM radio_control_passes
             WHERE closed_at IS NOT NULL
               AND closed_at < $1::timestamptz
             ORDER BY closed_at
             LIMIT $2
           )
           DELETE FROM radio_control_passes p
           USING doomed d
           WHERE p.id = d.id
           RETURNING p.id`,
          [iso, batch],
        );
        const n = Array.isArray(res) ? res.length : 0;
        radioPasses += n;
        if (n < batch) break;
      }
    } catch (err) {
      this.logger.warn(`Purga radio_control_passes omitida: ${(err as Error).message}`);
    }

    return { auditLogs, radioChecks, radioPasses };
  }
}
