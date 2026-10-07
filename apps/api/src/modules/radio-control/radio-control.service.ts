import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import {
  isRadioControlStatus,
  parseClientCheckedAt,
  type RadioControlStatus,
} from './radio-control.constants';

export type UpsertRadioCheckDto = {
  rosterId: string;
  /** Fecha del tablero (día operativo). */
  date: string;
  status: string;
  /** ISO datetime del equipo del operador. */
  checkedAt?: string;
  notes?: string | null;
};

export type UpsertManyDto = {
  date: string;
  status: string;
  checkedAt?: string;
  rosterIds?: string[];
};

@Injectable()
export class RadioControlService {
  constructor(private readonly ds: DataSource) {}

  private q<T = Record<string, unknown>>(sql: string, params: unknown[] = []) {
    return this.ds.query(sql, params) as Promise<T[]>;
  }

  async board(user: JwtPayload, date: string, q?: string) {
    const d = this.requireDate(date);
    const like = q?.trim() ? `%${q.trim()}%` : null;

    const roster = await this.q<{
      id: string;
      sort_order: number;
      label: string;
      callsign: string | null;
    }>(
      `SELECT id, sort_order, label, callsign
       FROM radio_control_roster
       WHERE tenant_id = $1
         AND active = true
         AND (
           $2::text IS NULL
           OR label ILIKE $2
           OR COALESCE(callsign,'') ILIKE $2
         )
       ORDER BY sort_order`,
      [user.tenantId, like],
    );

    // Último marcado del día por radio (hora real del equipo).
    const checks = await this.q<{
      roster_id: string;
      status: string;
      notes: string | null;
      checked_at: string;
      slot_hm: string | null;
      checks_today: string;
    }>(
      `SELECT c.roster_id,
              c.status,
              c.notes,
              c.checked_at,
              to_char(c.checked_at AT TIME ZONE 'America/Bogota', 'HH24:MI') AS slot_hm,
              cnt.n::text AS checks_today
       FROM radio_control_checks c
       INNER JOIN (
         SELECT roster_id, MAX(checked_at) AS mx
         FROM radio_control_checks
         WHERE tenant_id = $1 AND check_date = $2::date
         GROUP BY roster_id
       ) latest ON latest.roster_id = c.roster_id AND latest.mx = c.checked_at
       INNER JOIN (
         SELECT roster_id, COUNT(*)::int AS n
         FROM radio_control_checks
         WHERE tenant_id = $1 AND check_date = $2::date
         GROUP BY roster_id
       ) cnt ON cnt.roster_id = c.roster_id
       WHERE c.tenant_id = $1 AND c.check_date = $2::date`,
      [user.tenantId, d],
    );
    const byRoster = new Map(checks.map((c) => [c.roster_id, c]));

    const rows = roster.map((r) => {
      const c = byRoster.get(r.id);
      return {
        rosterId: r.id,
        sortOrder: Number(r.sort_order),
        callsign: r.callsign,
        label: r.label,
        status: (c?.status as RadioControlStatus | null) ?? null,
        notes: c?.notes ?? null,
        checkedAt: c?.checked_at ?? null,
        checkedTime: c?.slot_hm ?? null,
        checksToday: c ? Number(c.checks_today) : 0,
      };
    });

    const filled = rows.filter((r) => r.status).length;
    return {
      date: d,
      total: rows.length,
      filled,
      rows,
    };
  }

  async upsert(user: JwtPayload, dto: UpsertRadioCheckDto) {
    const d = this.requireDate(dto.date);
    const status = this.requireStatus(dto.status);
    const rosterId = String(dto.rosterId || '').trim();
    if (!rosterId) throw new BadRequestException('rosterId requerido');

    await this.assertRoster(user.tenantId, rosterId);
    const notes = dto.notes?.trim() ? dto.notes.trim().slice(0, 2000) : null;

    let at: Date;
    try {
      at = parseClientCheckedAt(dto.checkedAt);
    } catch {
      throw new BadRequestException('Hora del equipo inválida');
    }

    const [row] = await this.q(
      `INSERT INTO radio_control_checks (
         tenant_id, roster_id, check_date, slot_time, checked_at, status, notes, checked_by, updated_at
       ) VALUES (
         $1, $2, $3::date,
         (($4::timestamptz AT TIME ZONE 'America/Bogota')::time),
         $4::timestamptz,
         $5, $6, $7, NOW()
       )
       RETURNING id, roster_id AS "rosterId", status, notes,
                 to_char(check_date,'YYYY-MM-DD') AS date,
                 to_char(checked_at AT TIME ZONE 'America/Bogota', 'HH24:MI') AS "checkedTime",
                 checked_at AS "checkedAt"`,
      [user.tenantId, rosterId, d, at.toISOString(), status, notes, user.sub],
    );
    return row;
  }

  async upsertMany(user: JwtPayload, dto: UpsertManyDto) {
    const d = this.requireDate(dto.date);
    const status = this.requireStatus(dto.status);
    let at: Date;
    try {
      at = parseClientCheckedAt(dto.checkedAt);
    } catch {
      throw new BadRequestException('Hora del equipo inválida');
    }

    let rosterIds = (dto.rosterIds || []).filter(Boolean);
    if (rosterIds.length === 0) {
      const all = await this.q<{ id: string }>(
        `SELECT id FROM radio_control_roster
         WHERE tenant_id = $1 AND active = true
         ORDER BY sort_order`,
        [user.tenantId],
      );
      rosterIds = all.map((r) => r.id);
    }

    let n = 0;
    for (const rosterId of rosterIds) {
      await this.q(
        `INSERT INTO radio_control_checks (
           tenant_id, roster_id, check_date, slot_time, checked_at, status, notes, checked_by, updated_at
         ) VALUES (
           $1, $2, $3::date,
           (($4::timestamptz AT TIME ZONE 'America/Bogota')::time),
           $4::timestamptz,
           $5, NULL, $6, NOW()
         )`,
        [user.tenantId, rosterId, d, at.toISOString(), status, user.sub],
      );
      n += 1;
    }
    return { updated: n, date: d, status, checkedAt: at.toISOString() };
  }

  async daySummary(user: JwtPayload, date: string) {
    const d = this.requireDate(date);
    const rows = await this.q<{
      hour: string;
      status: string;
      n: string;
    }>(
      `SELECT to_char(checked_at AT TIME ZONE 'America/Bogota', 'HH24:00') AS hour,
              status, COUNT(*)::text AS n
       FROM radio_control_checks
       WHERE tenant_id = $1 AND check_date = $2::date
       GROUP BY 1, status
       ORDER BY 1, status`,
      [user.tenantId, d],
    );
    return { date: d, counts: rows };
  }

  private async assertRoster(tenantId: string, rosterId: string) {
    const [r] = await this.q(
      `SELECT id FROM radio_control_roster
       WHERE id = $1 AND tenant_id = $2 AND active = true`,
      [rosterId, tenantId],
    );
    if (!r) throw new BadRequestException('Radio no encontrado en el roster');
  }

  private requireDate(raw: string): string {
    const d = String(raw || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) {
      throw new BadRequestException('Fecha inválida (YYYY-MM-DD)');
    }
    return d;
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
