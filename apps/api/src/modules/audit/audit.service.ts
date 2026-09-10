import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { AuditLog } from './entities/audit-log.entity';

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
const DASHBOARD_EXCLUDE_ACTIONS = ['view_record'];

export type DashboardAuditRow = AuditLog & { userName: string | null };

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  async log(entry: AuditEntry): Promise<void> {
    const log = this.auditRepo.create({
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
   * Feed del dashboard admin/auditor: excluye dotación e incluye nombre de usuario.
   */
  async listRecentForDashboard(take = 40): Promise<DashboardAuditRow[]> {
    const capped = Math.min(Math.max(take, 1), 80);
    const rows = await this.auditRepo
      .createQueryBuilder('a')
      .where('a.module NOT IN (:...mods)', { mods: DASHBOARD_EXCLUDE_MODULES })
      .andWhere('a.action NOT IN (:...acts)', { acts: DASHBOARD_EXCLUDE_ACTIONS })
      .orderBy('a.created_at', 'DESC')
      .take(capped)
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
      users.map((u) => [u.id, (u.fullName?.trim() || u.email || null) as string | null]),
    );

    return rows.map((r) => ({
      ...r,
      userName: r.userId ? (names.get(r.userId) ?? null) : null,
    }));
  }
}
