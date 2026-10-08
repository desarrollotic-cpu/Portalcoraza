import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import {
  isRadioControlStatus,
  parseClientCheckedAt,
  type RadioControlStatus,
} from './radio-control.constants';

export type UpsertRadioCheckDto = {
  rosterId: string;
  date: string;
  status: string;
  checkedAt?: string;
  notes?: string | null;
};

export type UpsertManyDto = {
  date: string;
  status: string;
  checkedAt?: string;
  rosterIds?: string[];
};

export type NextPassDto = {
  date: string;
  checkedAt?: string;
  /** Si true, marca pendientes de la pasada abierta como S/N antes de cerrar. */
  fillPendingSn?: boolean;
};

@Injectable()
export class RadioControlService {
  constructor(
    private readonly ds: DataSource,
    private readonly audit: AuditService,
  ) {}

  private q<T = Record<string, unknown>>(sql: string, params: unknown[] = []) {
    return this.ds.query(sql, params) as Promise<T[]>;
  }

  /**
   * Cierra las pasadas abandonadas: abiertas y sin ninguna actividad (apertura o marca) en las
   * últimas 12 horas. Una pasada que sigue en uso NUNCA se cierra aunque cruce la medianoche
   * (el turno de noche marca antes y después de las 00:00). Cierre = su última actividad.
   * Idempotente: sin pasadas abandonadas no toca nada.
   */
  private async closeStalePasses(tenantId: string) {
    await this.q(
      `UPDATE radio_control_passes p
       SET closed_at = act.last_at
       FROM (
         SELECT p2.id,
                GREATEST(p2.opened_at, COALESCE(MAX(c.checked_at), p2.opened_at)) AS last_at
         FROM radio_control_passes p2
         LEFT JOIN radio_control_checks c ON c.pass_id = p2.id
         WHERE p2.tenant_id = $1 AND p2.closed_at IS NULL
         GROUP BY p2.id
       ) act
       WHERE p.id = act.id
         AND act.last_at < now() - interval '12 hours'`,
      [tenantId],
    );
  }
  async board(user: JwtPayload, date: string, q?: string) {
    const d = this.requireDate(date);
    const like = q?.trim() ? `%${q.trim()}%` : null;
    const pass = await this.getOrCreateOpenPass(user.tenantId, d);

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

    const checks = await this.q<{
      roster_id: string;
      status: string;
      notes: string | null;
      checked_at: string;
      slot_hm: string | null;
    }>(
      `SELECT c.roster_id, c.status, c.notes, c.checked_at,
              to_char(c.checked_at AT TIME ZONE 'America/Bogota', 'HH24:MI') AS slot_hm
       FROM radio_control_checks c
       INNER JOIN (
         SELECT roster_id, MAX(checked_at) AS mx
         FROM radio_control_checks
         WHERE tenant_id = $1 AND pass_id = $2
         GROUP BY roster_id
       ) latest ON latest.roster_id = c.roster_id AND latest.mx = c.checked_at
       WHERE c.tenant_id = $1 AND c.pass_id = $2`,
      [user.tenantId, pass.id],
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
      };
    });

    const filled = rows.filter((r) => r.status).length;
    return {
      date: d,
      pass: this.mapPass(pass),
      total: rows.length,
      filled,
      rows,
    };
  }

  async history(user: JwtPayload, date: string) {
    const d = this.requireDate(date);
    await this.closeStalePasses(user.tenantId);
    const passes = await this.q<{
      id: string;
      pass_number: number;
      opened_at: string;
      closed_at: string | null;
      marked: string;
      auto_filled: string;
      first_mark: string | null;
      last_mark: string | null;
      total_roster: string;
    }>(
      `SELECT p.id, p.pass_number, p.opened_at, p.closed_at,
              COALESCE(cnt.marked, 0)::text AS marked,
              COALESCE(cnt.auto_filled, 0)::text AS auto_filled,
              cnt.first_mark, cnt.last_mark,
              (SELECT COUNT(*)::text FROM radio_control_roster r
               WHERE r.tenant_id = p.tenant_id AND r.active = true) AS total_roster
       FROM radio_control_passes p
       LEFT JOIN (
         -- "Automática" = el S/N que "Guardar y siguiente pasada" pone a los radios sin marcar:
         -- lleva exactamente la hora de cierre de la pasada. No es una marca del operador.
         SELECT k.pass_id,
                COUNT(DISTINCT k.roster_id) FILTER (WHERE NOT k.auto)::int AS marked,
                COUNT(DISTINCT k.roster_id) FILTER (WHERE k.auto)::int AS auto_filled,
                MIN(k.checked_at) FILTER (WHERE NOT k.auto) AS first_mark,
                MAX(k.checked_at) FILTER (WHERE NOT k.auto) AS last_mark
         FROM (
           SELECT c.pass_id, c.roster_id, c.checked_at,
                  (pp.closed_at IS NOT NULL AND c.checked_at = pp.closed_at
                   AND c.status = 'S/N' AND c.notes IS NULL) AS auto
           FROM radio_control_checks c
           JOIN radio_control_passes pp ON pp.id = c.pass_id
           WHERE c.tenant_id = $1
         ) k
         GROUP BY k.pass_id
       ) cnt ON cnt.pass_id = p.id
       WHERE p.tenant_id = $1 AND p.pass_date = $2::date
       ORDER BY p.pass_number DESC`,
      [user.tenantId, d],
    );

    return {
      date: d,
      passes: passes.map((p) => ({
        id: p.id,
        passNumber: Number(p.pass_number),
        openedAt: p.opened_at,
        closedAt: p.closed_at,
        open: !p.closed_at,
        marked: Number(p.marked),
        autoFilled: Number(p.auto_filled),
        firstMarkTime: p.first_mark ? this.hmBogota(p.first_mark) : null,
        lastMarkTime: p.last_mark ? this.hmBogota(p.last_mark) : null,
        total: Number(p.total_roster),
        openedTime: this.hmBogota(p.opened_at),
        closedTime: p.closed_at ? this.hmBogota(p.closed_at) : null,
      })),
    };
  }

  async passDetail(user: JwtPayload, passId: string) {
    const [pass] = await this.q<{
      id: string;
      pass_date: string;
      pass_number: number;
      opened_at: string;
      closed_at: string | null;
    }>(
      `SELECT id, to_char(pass_date,'YYYY-MM-DD') AS pass_date, pass_number, opened_at, closed_at
       FROM radio_control_passes
       WHERE id = $1 AND tenant_id = $2`,
      [passId, user.tenantId],
    );
    if (!pass) throw new BadRequestException('Pasada no encontrada');

    const rows = await this.q<{
      sort_order: number;
      callsign: string | null;
      label: string;
      status: string;
      notes: string | null;
      checked_at: string;
      slot_hm: string;
      marks: Array<{ time: string; status: string; auto: boolean }> | null;
    }>(
      `SELECT r.sort_order, r.callsign, r.label, c.status, c.notes, c.checked_at,
              to_char(c.checked_at AT TIME ZONE 'America/Bogota', 'HH24:MI') AS slot_hm,
              (SELECT json_agg(json_build_object(
                        'time', to_char(k.checked_at AT TIME ZONE 'America/Bogota', 'HH24:MI'),
                        'status', k.status,
                        'auto', (($3::timestamptz) IS NOT NULL AND k.checked_at = $3::timestamptz
                                 AND k.status = 'S/N' AND k.notes IS NULL)) ORDER BY k.checked_at)
               FROM radio_control_checks k
               WHERE k.tenant_id = $1 AND k.pass_id = $2 AND k.roster_id = c.roster_id) AS marks
       FROM radio_control_checks c
       JOIN radio_control_roster r ON r.id = c.roster_id
       INNER JOIN (
         SELECT roster_id, MAX(checked_at) AS mx
         FROM radio_control_checks
         WHERE tenant_id = $1 AND pass_id = $2
         GROUP BY roster_id
       ) latest ON latest.roster_id = c.roster_id AND latest.mx = c.checked_at
       WHERE c.tenant_id = $1 AND c.pass_id = $2
       ORDER BY r.sort_order`,
      [user.tenantId, passId, pass.closed_at],
    );

    return {
      pass: {
        id: pass.id,
        date: pass.pass_date,
        passNumber: Number(pass.pass_number),
        openedAt: pass.opened_at,
        closedAt: pass.closed_at,
        open: !pass.closed_at,
        openedTime: this.hmBogota(pass.opened_at),
        closedTime: pass.closed_at ? this.hmBogota(pass.closed_at) : null,
      },
      rows: rows.map((r) => ({
        sortOrder: Number(r.sort_order),
        callsign: r.callsign,
        label: r.label,
        status: r.status,
        notes: r.notes,
        checkedTime: r.slot_hm,
        checkedAt: r.checked_at,
        /** Todas las marcas del radio en la pasada (hora y estado), en orden. */
        marks: r.marks ?? [],
      })),
    };
  }

  /**
   * Cierra la pasada abierta (opcionalmente marca pendientes S/N) y abre una nueva vacía.
   */
  async nextPass(user: JwtPayload, dto: NextPassDto) {
    const d = this.requireDate(dto.date);
    const open = await this.getOrCreateOpenPass(user.tenantId, d);
    let at: Date;
    try {
      at = parseClientCheckedAt(dto.checkedAt);
    } catch {
      throw new BadRequestException('Hora del equipo inválida');
    }

    if (dto.fillPendingSn !== false) {
      const pending = await this.q<{ id: string }>(
        `SELECT r.id
         FROM radio_control_roster r
         WHERE r.tenant_id = $1 AND r.active = true
           AND NOT EXISTS (
             SELECT 1 FROM radio_control_checks c
             WHERE c.tenant_id = $1 AND c.pass_id = $2 AND c.roster_id = r.id
           )
         ORDER BY r.sort_order`,
        [user.tenantId, open.id],
      );
      for (const row of pending) {
        await this.insertCheck(user, open.id, row.id, d, at, 'S/N', null);
      }
    }

    await this.q(
      `UPDATE radio_control_passes
       SET closed_at = $1::timestamptz, closed_by = $2
       WHERE id = $3 AND closed_at IS NULL`,
      [at.toISOString(), user.sub, open.id],
    );

    const next = await this.createPass(user.tenantId, d);
    const closed = this.mapPass({ ...open, closed_at: at.toISOString() });
    const opened = this.mapPass(next);
    await this.audit.log({
      userId: user.sub,
      module: 'radio_control',
      action: 'radio_control.next_pass',
      entityType: 'radio_control_pass',
      entityId: open.id,
      newValue: {
        date: d,
        passNumber: closed.passNumber,
        closedTime: closed.closedTime,
        nextPassNumber: opened.passNumber,
      },
    });
    return { closed, open: opened };
  }

  async upsert(user: JwtPayload, dto: UpsertRadioCheckDto) {
    const d = this.requireDate(dto.date);
    const status = this.requireStatus(dto.status);
    const rosterId = String(dto.rosterId || '').trim();
    if (!rosterId) throw new BadRequestException('rosterId requerido');
    const roster = await this.assertRoster(user.tenantId, rosterId);

    const pass = await this.getOrCreateOpenPass(user.tenantId, d);
    let at: Date;
    try {
      at = parseClientCheckedAt(dto.checkedAt);
    } catch {
      throw new BadRequestException('Hora del equipo inválida');
    }
    const notes = dto.notes?.trim() ? dto.notes.trim().slice(0, 2000) : null;
    const row = (await this.insertCheck(
      user,
      pass.id,
      rosterId,
      d,
      at,
      status,
      notes,
    )) as {
      id: string;
      rosterId: string;
      status: string;
      notes: string | null;
      date: string;
      checkedTime: string;
      checkedAt: string;
    };
    await this.audit.log({
      userId: user.sub,
      module: 'radio_control',
      action: 'radio_control.check',
      entityType: 'radio_control_check',
      entityId: row.id,
      newValue: {
        date: d,
        status,
        notes,
        label: roster.label,
        callsign: roster.callsign,
        passNumber: pass.pass_number,
        checkedTime: row.checkedTime,
      },
    });
    return row;
  }

  async upsertMany(user: JwtPayload, dto: UpsertManyDto) {
    const d = this.requireDate(dto.date);
    const status = this.requireStatus(dto.status);
    const pass = await this.getOrCreateOpenPass(user.tenantId, d);
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
         WHERE tenant_id = $1 AND active = true ORDER BY sort_order`,
        [user.tenantId],
      );
      rosterIds = all.map((r) => r.id);
    }

    let n = 0;
    for (const rosterId of rosterIds) {
      await this.insertCheck(user, pass.id, rosterId, d, at, status, null);
      n += 1;
    }
    await this.audit.log({
      userId: user.sub,
      module: 'radio_control',
      action: 'radio_control.fill',
      entityType: 'radio_control_pass',
      entityId: pass.id,
      newValue: {
        date: d,
        status,
        updated: n,
        passNumber: pass.pass_number,
      },
    });
    return { updated: n, date: d, status, passId: pass.id };
  }

  private async insertCheck(
    user: JwtPayload,
    passId: string,
    rosterId: string,
    date: string,
    at: Date,
    status: RadioControlStatus,
    notes: string | null,
  ) {
    const [row] = await this.q(
      `INSERT INTO radio_control_checks (
         tenant_id, roster_id, pass_id, check_date, slot_time, checked_at, status, notes, checked_by, updated_at
       ) VALUES (
         $1, $2, $3, $4::date,
         (($5::timestamptz AT TIME ZONE 'America/Bogota')::time),
         $5::timestamptz, $6, $7, $8, NOW()
       )
       RETURNING id, roster_id AS "rosterId", status, notes,
                 to_char(check_date,'YYYY-MM-DD') AS date,
                 to_char(checked_at AT TIME ZONE 'America/Bogota', 'HH24:MI') AS "checkedTime",
                 checked_at AS "checkedAt"`,
      [user.tenantId, rosterId, passId, date, at.toISOString(), status, notes, user.sub],
    );
    return row;
  }

  private async getOrCreateOpenPass(tenantId: string, date: string) {
    await this.closeStalePasses(tenantId);
    const [open] = await this.q<{
      id: string;
      pass_number: number;
      opened_at: string;
      closed_at: string | null;
    }>(
      `SELECT id, pass_number, opened_at, closed_at
       FROM radio_control_passes
       WHERE tenant_id = $1 AND pass_date = $2::date AND closed_at IS NULL
       ORDER BY pass_number DESC
       LIMIT 1`,
      [tenantId, date],
    );
    if (open) return open;
    // Turno de noche: tras la medianoche se sigue usando la pasada abierta del día anterior
    // (si no está abandonada) en vez de abrir una vacía y dejar las marcas "perdidas".
    const [previa] = await this.q<{
      id: string;
      pass_number: number;
      opened_at: string;
      closed_at: string | null;
    }>(
      `SELECT id, pass_number, opened_at, closed_at
       FROM radio_control_passes
       WHERE tenant_id = $1 AND pass_date = $2::date - 1 AND closed_at IS NULL
       ORDER BY pass_number DESC
       LIMIT 1`,
      [tenantId, date],
    );
    if (previa) return previa;
    return this.createPass(tenantId, date);
  }

  private async createPass(tenantId: string, date: string) {
    const [row] = await this.q<{
      id: string;
      pass_number: number;
      opened_at: string;
      closed_at: string | null;
    }>(
      `INSERT INTO radio_control_passes (tenant_id, pass_date, pass_number)
       VALUES (
         $1, $2::date,
         COALESCE((
           SELECT MAX(pass_number) FROM radio_control_passes
           WHERE tenant_id = $1 AND pass_date = $2::date
         ), 0) + 1
       )
       RETURNING id, pass_number, opened_at, closed_at`,
      [tenantId, date],
    );
    return row;
  }

  private mapPass(p: {
    id: string;
    pass_number: number;
    opened_at: string;
    closed_at?: string | null;
  }) {
    return {
      id: p.id,
      passNumber: Number(p.pass_number),
      openedAt: p.opened_at,
      closedAt: p.closed_at ?? null,
      open: !p.closed_at,
      openedTime: this.hmBogota(p.opened_at),
      closedTime: p.closed_at ? this.hmBogota(p.closed_at) : null,
    };
  }

  private hmBogota(iso: string): string {
    try {
      return new Intl.DateTimeFormat('en-GB', {
        timeZone: 'America/Bogota',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(new Date(iso));
    } catch {
      return '';
    }
  }

  private async assertRoster(tenantId: string, rosterId: string) {
    const [r] = await this.q<{
      id: string;
      label: string;
      callsign: string | null;
    }>(
      `SELECT id, label, callsign FROM radio_control_roster
       WHERE id = $1 AND tenant_id = $2 AND active = true`,
      [rosterId, tenantId],
    );
    if (!r) throw new BadRequestException('Radio no encontrado en el roster');
    return r;
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
