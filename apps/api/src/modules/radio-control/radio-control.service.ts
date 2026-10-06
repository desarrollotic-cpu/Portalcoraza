import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { MinutaService } from '../minuta/minuta.service';
import {
  RADIO_CONTROL_SLOTS,
  isRadioControlSlot,
  isRadioControlStatus,
  type RadioControlStatus,
} from './radio-control.constants';

export type UpsertRadioCheckDto = {
  rosterId: string;
  date: string;
  slot: string;
  status: string;
  notes?: string | null;
};

export type UpsertManyDto = {
  date: string;
  slot: string;
  status: string;
  rosterIds?: string[];
};

const CONTROL_POST_CODE = 'CONTROL-CORAZA';
const CONTROL_POST_NAME = 'CONTROL CORAZA';

@Injectable()
export class RadioControlService {
  constructor(
    private readonly ds: DataSource,
    private readonly minuta: MinutaService,
  ) {}

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
      updated_at: string;
    }>(
      `SELECT roster_id, status, notes, updated_at
       FROM radio_control_checks
       WHERE tenant_id = $1
         AND check_date = $2::date
         AND slot_time = $3::time`,
      [user.tenantId, d, s],
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
    const rosterId = String(dto.rosterId || '').trim();
    if (!rosterId) throw new BadRequestException('rosterId requerido');

    await this.assertRoster(user.tenantId, rosterId);
    const notes = dto.notes?.trim() ? dto.notes.trim().slice(0, 2000) : null;

    const [row] = await this.q(
      `INSERT INTO radio_control_checks (
         tenant_id, roster_id, check_date, slot_time, status, notes, checked_by, updated_at
       ) VALUES ($1,$2,$3::date,$4::time,$5,$6,$7,NOW())
       ON CONFLICT (tenant_id, roster_id, check_date, slot_time)
       DO UPDATE SET
         status = EXCLUDED.status,
         notes = EXCLUDED.notes,
         checked_by = EXCLUDED.checked_by,
         updated_at = NOW()
       RETURNING id, roster_id AS "rosterId", status, notes,
                 to_char(check_date,'YYYY-MM-DD') AS date,
                 to_char(slot_time,'HH24:MI') AS slot`,
      [user.tenantId, rosterId, d, s, status, notes, user.sub],
    );
    return row;
  }

  async upsertMany(user: JwtPayload, dto: UpsertManyDto) {
    const d = this.requireDate(dto.date);
    const s = this.requireSlot(dto.slot);
    const status = this.requireStatus(dto.status);

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
           tenant_id, roster_id, check_date, slot_time, status, notes, checked_by, updated_at
         ) VALUES ($1,$2,$3::date,$4::time,$5,NULL,$6,NOW())
         ON CONFLICT (tenant_id, roster_id, check_date, slot_time)
         DO UPDATE SET
           status = EXCLUDED.status,
           checked_by = EXCLUDED.checked_by,
           updated_at = NOW()`,
        [user.tenantId, rosterId, d, s, status, user.sub],
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

  async minutaHoy(user: JwtPayload) {
    const postId = await this.controlPostId(user.tenantId);
    const fecha = this.bogotaStamp().fecha;
    const rows = await this.q<{
      hora: string;
      registradoPor: string | null;
      anotaciones: string;
      novedades: string | null;
    }>(
      `SELECT hora, registrado_por AS "registradoPor", anotaciones, novedades
       FROM minuta_servicio
       WHERE tenant_id = $1 AND post_id = $2 AND fecha = $3
       ORDER BY created_at DESC
       LIMIT 30`,
      [user.tenantId, postId, fecha],
    );
    return { postName: CONTROL_POST_NAME, fecha, rows };
  }

  async saveMinuta(
    user: JwtPayload,
    body: { registradoPor?: string; anotaciones?: string; novedades?: string },
  ) {
    const registradoPor = String(body.registradoPor || '').trim();
    const anotaciones = String(body.anotaciones || '').trim();
    if (registradoPor.length < 2) throw new BadRequestException('Escriba quién registra');
    if (anotaciones.length < 3) throw new BadRequestException('Escriba la anotación de la minuta');
    const postId = await this.controlPostId(user.tenantId);
    await this.minuta.crearServicio(user, {
      registradoPor,
      anotaciones,
      novedades: String(body.novedades || '').trim() || undefined,
      postId,
    });
    return this.minutaHoy(user);
  }

  private async controlPostId(tenantId: string): Promise<string> {
    const [row] = await this.q<{ id: string }>(
      `INSERT INTO posts (id, tenant_id, code, name, type, status, client_name)
       VALUES (gen_random_uuid(), $1, $2, $3, 'SERVICIO_ESPECIAL', 'ACTIVO', 'Coraza Seguridad C.T.A.')
       ON CONFLICT (tenant_id, code) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [tenantId, CONTROL_POST_CODE, CONTROL_POST_NAME],
    );
    return row.id;
  }

  private bogotaStamp(): { fecha: string } {
    const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Bogota' }));
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return { fecha: `${dd}/${mm}/${d.getFullYear()}` };
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
