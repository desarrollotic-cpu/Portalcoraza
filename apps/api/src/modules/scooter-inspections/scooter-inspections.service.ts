import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import {
  NOVELTY_LABELS,
  hasNegativeAnswer,
  isNoveltyType,
  parseAnswers,
  type ScooterAnswers,
} from './scooter-form';

export type CreateScooterInspectionDto = {
  postId?: string;
  receivingScooter: boolean;
  answers: ScooterAnswers;
  aptForOperation: boolean;
  noveltyType?: string | null;
  noveltyReportedToSupervisor?: boolean | null;
  noveltyWithdrawnFromService?: boolean | null;
};

@Injectable()
export class ScooterInspectionsService {
  constructor(private readonly ds: DataSource) {}

  private q<T = Record<string, unknown>>(sql: string, params: unknown[] = []) {
    return this.ds.query(sql, params) as Promise<T[]>;
  }

  async eligiblePosts(user: JwtPayload) {
    const postIds = await this.userPostIds(user);
    if (postIds.length === 0) return [];
    return this.q(
      `SELECT id, code, name
       FROM posts
       WHERE tenant_id = $1
         AND id = ANY($2::uuid[])
         AND status = 'ACTIVO'
         AND tiene_patineta_electrica = true
       ORDER BY name`,
      [user.tenantId, postIds],
    );
  }

  async create(user: JwtPayload, dto: CreateScooterInspectionDto) {
    if (typeof dto.receivingScooter !== 'boolean') {
      throw new BadRequestException('Indique si recibe la patineta');
    }
    if (typeof dto.aptForOperation !== 'boolean') {
      throw new BadRequestException('Indique si es apta para operar');
    }
    let answers: ScooterAnswers;
    try {
      answers = parseAnswers(dto.answers);
    } catch (e) {
      throw new BadRequestException((e as Error).message);
    }

    const needsNovelty = hasNegativeAnswer(
      dto.receivingScooter,
      answers,
      dto.aptForOperation,
    );
    let noveltyType: string | null = null;
    let noveltyReported: boolean | null = null;
    let noveltyWithdrawn: boolean | null = null;
    if (needsNovelty) {
      if (!isNoveltyType(dto.noveltyType)) {
        throw new BadRequestException('Seleccione la novedad identificada');
      }
      if (typeof dto.noveltyReportedToSupervisor !== 'boolean') {
        throw new BadRequestException('Indique si reportó al supervisor');
      }
      if (typeof dto.noveltyWithdrawnFromService !== 'boolean') {
        throw new BadRequestException('Indique si retiró la patineta de operación');
      }
      noveltyType = dto.noveltyType;
      noveltyReported = dto.noveltyReportedToSupervisor;
      noveltyWithdrawn = dto.noveltyWithdrawnFromService;
    }

    const postId = await this.resolvePostId(user, dto.postId);
    await this.assertPostHasScooter(user.tenantId, postId);

    const [u] = await this.q<{ full_name: string | null; email: string }>(
      `SELECT full_name, email FROM users WHERE id = $1`,
      [user.sub],
    );
    const inspectorName = (u?.full_name || u?.email || 'Vigilante').trim();

    const [row] = await this.q(
      `INSERT INTO scooter_inspections (
         tenant_id, post_id, inspector_user_id, inspector_name,
         receiving_scooter, answers, apt_for_operation, has_novelty,
         novelty_type, novelty_reported_to_supervisor, novelty_withdrawn_from_service
       ) VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9,$10,$11)
       RETURNING id, inspected_at AS "inspectedAt"`,
      [
        user.tenantId,
        postId,
        user.sub,
        inspectorName,
        dto.receivingScooter,
        JSON.stringify(answers),
        dto.aptForOperation,
        needsNovelty,
        noveltyType,
        noveltyReported,
        noveltyWithdrawn,
      ],
    );
    return row;
  }

  async list(
    user: JwtPayload,
    q: {
      postId?: string;
      from?: string;
      to?: string;
      apt?: string;
      novelty?: string;
      q?: string;
      limit?: number;
    },
  ) {
    const params: unknown[] = [user.tenantId];
    const where = ['i.tenant_id = $1'];
    if (q.postId) {
      params.push(q.postId);
      where.push(`i.post_id = $${params.length}`);
    }
    if (q.from) {
      params.push(q.from);
      where.push(`i.inspected_at >= $${params.length}::timestamptz`);
    }
    if (q.to) {
      params.push(q.to);
      where.push(`i.inspected_at < ($${params.length}::date + INTERVAL '1 day')`);
    }
    if (q.apt === 'true' || q.apt === 'false') {
      params.push(q.apt === 'true');
      where.push(`i.apt_for_operation = $${params.length}`);
    }
    if (q.novelty === 'true' || q.novelty === 'false') {
      params.push(q.novelty === 'true');
      where.push(`i.has_novelty = $${params.length}`);
    }
    if (q.q?.trim()) {
      params.push(`%${q.q.trim()}%`);
      where.push(`i.inspector_name ILIKE $${params.length}`);
    }
    const limit = Math.min(Math.max(Number(q.limit) || 100, 1), 500);
    params.push(limit);
    return this.q(
      `SELECT i.id,
              i.inspected_at AS "inspectedAt",
              i.inspector_name AS "inspectorName",
              i.receiving_scooter AS "receivingScooter",
              i.apt_for_operation AS "aptForOperation",
              i.has_novelty AS "hasNovelty",
              i.novelty_type AS "noveltyType",
              p.id AS "postId",
              p.code AS "postCode",
              p.name AS "postName"
       FROM scooter_inspections i
       JOIN posts p ON p.id = i.post_id
       WHERE ${where.join(' AND ')}
       ORDER BY i.inspected_at DESC
       LIMIT $${params.length}`,
      params,
    );
  }

  async getOne(user: JwtPayload, id: string) {
    const [row] = await this.q(
      `SELECT i.id,
              i.inspected_at AS "inspectedAt",
              i.inspector_user_id AS "inspectorUserId",
              i.inspector_name AS "inspectorName",
              i.receiving_scooter AS "receivingScooter",
              i.answers,
              i.apt_for_operation AS "aptForOperation",
              i.has_novelty AS "hasNovelty",
              i.novelty_type AS "noveltyType",
              i.novelty_reported_to_supervisor AS "noveltyReportedToSupervisor",
              i.novelty_withdrawn_from_service AS "noveltyWithdrawnFromService",
              p.id AS "postId",
              p.code AS "postCode",
              p.name AS "postName"
       FROM scooter_inspections i
       JOIN posts p ON p.id = i.post_id
       WHERE i.tenant_id = $1 AND i.id = $2`,
      [user.tenantId, id],
    );
    if (!row) throw new NotFoundException('Inspección no encontrada');
    const noveltyType = row['noveltyType'] as string | null;
    return {
      ...row,
      noveltyLabel: noveltyType
        ? NOVELTY_LABELS[noveltyType as keyof typeof NOVELTY_LABELS] || noveltyType
        : null,
    };
  }

  private async userPostIds(user: JwtPayload): Promise<string[]> {
    if (user.roleCode === 'PUESTO') {
      const rows = await this.q<{ post_id: string }>(
        `SELECT post_id FROM user_posts WHERE user_id = $1`,
        [user.sub],
      );
      if (rows.length === 0) {
        throw new ForbiddenException('Cuenta de puesto sin puesto asignado');
      }
      return rows.map((r) => r.post_id);
    }
    const rows = await this.q<{ id: string }>(
      `SELECT id FROM posts WHERE tenant_id = $1 AND status = 'ACTIVO'`,
      [user.tenantId],
    );
    return rows.map((r) => r.id);
  }

  private async resolvePostId(user: JwtPayload, requested?: string): Promise<string> {
    const ids = await this.userPostIds(user);
    if (user.roleCode === 'PUESTO') {
      if (requested && !ids.includes(requested)) {
        throw new ForbiddenException('No puede registrar en otro puesto');
      }
      return requested && ids.includes(requested) ? requested : ids[0];
    }
    if (!requested) throw new BadRequestException('Indique el puesto');
    if (!ids.includes(requested)) throw new BadRequestException('Puesto inválido');
    return requested;
  }

  private async assertPostHasScooter(tenantId: string, postId: string) {
    const [p] = await this.q<{ tiene_patineta_electrica: boolean }>(
      `SELECT tiene_patineta_electrica FROM posts WHERE id = $1 AND tenant_id = $2`,
      [postId, tenantId],
    );
    if (!p) throw new BadRequestException('Puesto no encontrado');
    if (!p.tiene_patineta_electrica) {
      throw new BadRequestException('Este puesto no tiene patineta eléctrica habilitada');
    }
  }
}
