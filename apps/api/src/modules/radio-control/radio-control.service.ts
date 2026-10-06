import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import {
  RADIO_CONTROL_SLOTS,
  isRadioControlSlot,
  isRadioControlStatus,
  type RadioControlStatus,
} from './radio-control.constants';

export type UpsertRadioCheckDto = {
  postId: string;
  date: string;
  slot: string;
  status: string;
  notes?: string | null;
};

export type UpsertManyDto = {
  date: string;
  slot: string;
  status: string;
  postIds?: string[];
};

@Injectable()
export class RadioControlService {
  constructor(private readonly ds: DataSource) {}

  private q<T = Record<string, unknown>>(sql: string, params: unknown[] = []) {
    return this.ds.query(sql, params) as Promise<T[]>;
  }

  slots() {
    return [...RADIO_CONTROL_SLOTS];
  }

  async board(user: JwtPayload, date: string, slot: string, q?: string) {
    const d = this.requireDate(date);
    const s = this.requireSlot(slot);
    const like = q?.trim() ? `%${q.trim()}%` : null;

    const posts = await this.q<{
      id: string;
      code: string;
      name: string;
      zone: string | null;
      phone: string | null;
    }>(
      `SELECT id, code, name, zone, phone
       FROM posts
       WHERE tenant_id = $1
         AND status = 'ACTIVO'
         AND ($2::text IS NULL OR name ILIKE $2 OR code ILIKE $2 OR COALESCE(zone,'') ILIKE $2)
       ORDER BY zone NULLS LAST, name`,
      [user.tenantId, like],
    );

    const checks = await this.q<{
      post_id: string;
      status: string;
      notes: string | null;
      updated_at: string;
    }>(
      `SELECT post_id, status, notes, updated_at
       FROM radio_control_checks
       WHERE tenant_id = $1
         AND check_date = $2::date
         AND slot_time = $3::time`,
      [user.tenantId, d, s],
    );
    const byPost = new Map(checks.map((c) => [c.post_id, c]));

    const rows = posts.map((p) => {
      const c = byPost.get(p.id);
      return {
        postId: p.id,
        code: p.code,
        name: p.name,
        zone: p.zone,
        phone: p.phone,
        status: (c?.status as RadioControlStatus | null) ?? null,
        notes: c?.notes ?? null,
        updatedAt: c?.updated_at ?? null,
      };
    });

    const filled = rows.filter((r) => r.status).length;
    return {
      date: d,
      slot: s,
      total: rows.length,
      filled,
      rows,
    };
  }

  async upsert(user: JwtPayload, dto: UpsertRadioCheckDto) {
    const d = this.requireDate(dto.date);
    const s = this.requireSlot(dto.slot);
    const status = this.requireStatus(dto.status);
    const postId = String(dto.postId || '').trim();
    if (!postId) throw new BadRequestException('postId requerido');

    await this.assertActivePost(user.tenantId, postId);
    const notes = dto.notes?.trim() ? dto.notes.trim().slice(0, 2000) : null;

    const [row] = await this.q(
      `INSERT INTO radio_control_checks (
         tenant_id, post_id, check_date, slot_time, status, notes, checked_by, updated_at
       ) VALUES ($1,$2,$3::date,$4::time,$5,$6,$7,NOW())
       ON CONFLICT (tenant_id, post_id, check_date, slot_time)
       DO UPDATE SET
         status = EXCLUDED.status,
         notes = EXCLUDED.notes,
         checked_by = EXCLUDED.checked_by,
         updated_at = NOW()
       RETURNING id, post_id AS "postId", status, notes,
                 to_char(check_date,'YYYY-MM-DD') AS date,
                 to_char(slot_time,'HH24:MI') AS slot`,
      [user.tenantId, postId, d, s, status, notes, user.sub],
    );
    return row;
  }

  /** Marca muchos puestos con el mismo estado (p. ej. S/N masivo). */
  async upsertMany(user: JwtPayload, dto: UpsertManyDto) {
    const d = this.requireDate(dto.date);
    const s = this.requireSlot(dto.slot);
    const status = this.requireStatus(dto.status);

    let postIds = (dto.postIds || []).filter(Boolean);
    if (postIds.length === 0) {
      const all = await this.q<{ id: string }>(
        `SELECT id FROM posts WHERE tenant_id = $1 AND status = 'ACTIVO'`,
        [user.tenantId],
      );
      postIds = all.map((p) => p.id);
    }

    let n = 0;
    for (const postId of postIds) {
      await this.q(
        `INSERT INTO radio_control_checks (
           tenant_id, post_id, check_date, slot_time, status, notes, checked_by, updated_at
         ) VALUES ($1,$2,$3::date,$4::time,$5,NULL,$6,NOW())
         ON CONFLICT (tenant_id, post_id, check_date, slot_time)
         DO UPDATE SET
           status = EXCLUDED.status,
           checked_by = EXCLUDED.checked_by,
           updated_at = NOW()`,
        [user.tenantId, postId, d, s, status, user.sub],
      );
      n += 1;
    }
    return { updated: n, date: d, slot: s, status };
  }

  async daySummary(user: JwtPayload, date: string) {
    const d = this.requireDate(date);
    const rows = await this.q<{
      slot: string;
      status: string;
      n: string;
    }>(
      `SELECT to_char(slot_time,'HH24:MI') AS slot, status, COUNT(*)::text AS n
       FROM radio_control_checks
       WHERE tenant_id = $1 AND check_date = $2::date
       GROUP BY slot_time, status
       ORDER BY slot_time, status`,
      [user.tenantId, d],
    );
    return { date: d, slots: RADIO_CONTROL_SLOTS, counts: rows };
  }

  private async assertActivePost(tenantId: string, postId: string) {
    const [p] = await this.q(
      `SELECT id FROM posts WHERE id = $1 AND tenant_id = $2 AND status = 'ACTIVO'`,
      [postId, tenantId],
    );
    if (!p) throw new BadRequestException('Puesto no encontrado o inactivo');
  }

  private requireDate(raw: string): string {
    const d = String(raw || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) {
      throw new BadRequestException('Fecha inválida (YYYY-MM-DD)');
    }
    return d;
  }

  private requireSlot(raw: string): string {
    const s = String(raw || '').trim();
    if (!isRadioControlSlot(s)) {
      throw new BadRequestException(`Franja inválida. Use: ${RADIO_CONTROL_SLOTS.join(', ')}`);
    }
    return s;
  }

  private requireStatus(raw: string): RadioControlStatus {
    const s = String(raw || '').trim().toUpperCase();
    const normalized =
      s === 'SN' ? 'S/N' : s === 'NC' ? 'N/C' : s === 'NA' ? 'N/A' : s === 'CN' ? 'C/N' : s;
    if (!isRadioControlStatus(normalized)) {
      throw new BadRequestException('Estado inválido (S/N, N/C, N/A, C/N)');
    }
    return normalized;
  }
}
