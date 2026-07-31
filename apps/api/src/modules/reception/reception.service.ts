import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import PDFDocument = require('pdfkit');
import { IsNull, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { ExitReceptionVisitorDto } from './dto/exit-visitor.dto';
import { RegisterReceptionVisitorDto } from './dto/register-visitor.dto';
import { ReceptionVisitor } from './entities/reception-visitor.entity';

/** Columnas mínimas para listados de recepción (tabla «dentro» / panel). */
const LIST_COLUMNS: (keyof ReceptionVisitor)[] = [
  'id',
  'documentNumber',
  'firstSurname',
  'secondSurname',
  'firstName',
  'secondName',
  'originPlace',
  'visitReason',
  'entryAt',
  'authorizedBy',
  'transportMeans',
  'travelTimeMinutes',
  'exitAt',
];

@Injectable()
export class ReceptionService {
  constructor(
    @InjectRepository(ReceptionVisitor)
    private readonly visitorsRepo: Repository<ReceptionVisitor>,
    private readonly audit: AuditService,
  ) {}

  async getDashboard() {
    const bounds = this.bogotaBounds();
    const tz = 'America/Bogota';

    const [statsRow, byDay, inside, todayList] = await Promise.all([
      this.visitorsRepo.query(
        `
        SELECT
          (SELECT COUNT(*)::int FROM reception_visitors WHERE exit_at IS NULL) AS inside_now,
          (SELECT COUNT(*)::int FROM reception_visitors
            WHERE entry_at >= $1 AND entry_at < $2) AS today_entries,
          (SELECT COUNT(*)::int FROM reception_visitors
            WHERE exit_at IS NULL AND entry_at >= $1 AND entry_at < $2) AS today_still_inside,
          (SELECT COUNT(*)::int FROM reception_visitors
            WHERE entry_at >= $3 AND entry_at < $4) AS month_entries,
          (SELECT COUNT(*)::int FROM reception_visitors
            WHERE entry_at >= $5 AND entry_at < $6) AS year_entries
        `,
        [
          bounds.dayStart,
          bounds.dayEnd,
          bounds.monthStart,
          bounds.monthEnd,
          bounds.yearStart,
          bounds.yearEnd,
        ],
      ) as Promise<
        {
          inside_now: number;
          today_entries: number;
          today_still_inside: number;
          month_entries: number;
          year_entries: number;
        }[]
      >,
      this.visitorsRepo.query(
        `
        SELECT
          (entry_at AT TIME ZONE $1)::date::text AS day,
          COUNT(*)::int AS entries
        FROM reception_visitors
        WHERE entry_at >= $2 AND entry_at < $3
        GROUP BY 1
        ORDER BY 1 ASC
        `,
        [tz, bounds.days14Start, bounds.dayEnd],
      ) as Promise<{ day: string; entries: number }[]>,
      this.visitorsRepo.find({
        select: LIST_COLUMNS,
        where: { exitAt: IsNull() },
        order: { entryAt: 'DESC' },
        take: 50,
      }),
      this.visitorsRepo
        .createQueryBuilder('v')
        .select([
          'v.id',
          'v.documentNumber',
          'v.firstSurname',
          'v.secondSurname',
          'v.firstName',
          'v.secondName',
          'v.originPlace',
          'v.visitReason',
          'v.entryAt',
          'v.authorizedBy',
          'v.transportMeans',
          'v.travelTimeMinutes',
          'v.exitAt',
        ])
        .where('v.entry_at >= :dayStart AND v.entry_at < :dayEnd', {
          dayStart: bounds.dayStart,
          dayEnd: bounds.dayEnd,
        })
        .orderBy('v.entry_at', 'DESC')
        .take(100)
        .getMany(),
    ]);

    const row = statsRow[0] ?? {};

    return {
      stats: {
        insideNow: Number(row.inside_now) || 0,
        todayEntries: Number(row.today_entries) || 0,
        todayStillInside: Number(row.today_still_inside) || 0,
        monthEntries: Number(row.month_entries) || 0,
        yearEntries: Number(row.year_entries) || 0,
        // Sin COUNT(*) full-table en el path caliente; el panel ya muestra "Este año".
        totalEntries: Number(row.year_entries) || 0,
      },
      last14Days: this.fillLast14Days(byDay, bounds),
      insideNow: inside.map((v) => this.toDto(v)),
      today: todayList.map((v) => this.toDto(v)),
    };
  }

  async list(params: { insideOnly?: boolean; limit?: number } = {}) {
    const take = Math.min(params.limit ?? 100, 500);

    if (params.insideOnly) {
      const rows = await this.visitorsRepo.find({
        select: LIST_COLUMNS,
        where: { exitAt: IsNull() },
        order: { entryAt: 'DESC' },
        take,
      });
      return rows.map((v) => this.toDto(v));
    }

    const rows = await this.visitorsRepo.find({
      select: LIST_COLUMNS,
      order: { entryAt: 'DESC' },
      take,
    });
    return rows.map((v) => this.toDto(v));
  }

  async register(dto: RegisterReceptionVisitorDto, userId: string) {
    const saved = await this.visitorsRepo.save(
      this.visitorsRepo.create({
        documentNumber: this.trimOrNull(dto.documentNumber),
        firstSurname: this.trimOrNull(dto.firstSurname),
        secondSurname: this.trimOrNull(dto.secondSurname),
        firstName: this.trimOrNull(dto.firstName),
        secondName: this.trimOrNull(dto.secondName),
        sex: dto.sex ?? null,
        birthDate: this.trimOrNull(dto.birthDate),
        arl: this.trimOrNull(dto.arl),
        eps: this.trimOrNull(dto.eps),
        originPlace: this.trimOrNull(dto.originPlace),
        visitReason: this.trimOrNull(dto.visitReason),
        entryAt: new Date(), // hora del servidor (equipo/API), no editable
        authorizedBy: this.trimOrNull(dto.authorizedBy),
        registeredBy: userId,
        transportMeans: dto.transportMeans ?? null,
        travelTimeMinutes:
          dto.travelTimeMinutes === undefined || dto.travelTimeMinutes === null
            ? null
            : Number(dto.travelTimeMinutes),
        notes: this.trimOrNull(dto.notes),
        exitAt: null,
      }),
    );

    await this.audit.log({
      userId,
      module: 'reception',
      action: 'register',
      entityType: 'reception_visitor',
      entityId: saved.id,
      newValue: saved as unknown as Record<string, unknown>,
    });

    return this.toDto(saved);
  }

  async registerExit(id: string, dto: ExitReceptionVisitorDto, userId: string) {
    const existing = await this.visitorsRepo.findOne({ where: { id } });
    if (!existing) throw new NotFoundException('Visitante no encontrado');
    if (existing.exitAt) {
      throw new BadRequestException('Este visitante ya tiene salida registrada');
    }

    const old = { ...existing };
    existing.exitAt = new Date();
    existing.exitedBy = userId;
    existing.exitNotes = this.trimOrNull(dto.exitNotes);

    const saved = await this.visitorsRepo.save(existing);

    // No bloquear la respuesta de salida por la auditoría.
    void this.audit.log({
      userId,
      module: 'reception',
      action: 'exit',
      entityType: 'reception_visitor',
      entityId: id,
      oldValue: old as unknown as Record<string, unknown>,
      newValue: saved as unknown as Record<string, unknown>,
    });

    return this.toDto(saved);
  }

  async buildHistoryPdf(fromDate: string, toDate: string): Promise<Buffer> {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fromDate) || !/^\d{4}-\d{2}-\d{2}$/.test(toDate)) {
      throw new BadRequestException('Usa fechas en formato YYYY-MM-DD');
    }
    if (fromDate > toDate) {
      throw new BadRequestException('La fecha "desde" no puede ser posterior a "hasta"');
    }

    const tz = 'America/Bogota';
    const rows = await this.visitorsRepo
      .createQueryBuilder('v')
      .where(`(v.entry_at AT TIME ZONE :tz)::date >= :fromDate::date`, { tz, fromDate })
      .andWhere(`(v.entry_at AT TIME ZONE :tz)::date <= :toDate::date`, { tz, toDate })
      .orderBy('v.entry_at', 'ASC')
      .getMany();

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    const finished = new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    doc.fontSize(16).text('Portal Coraza — Recepción', { align: 'center' });
    doc.moveDown(0.35);
    doc.fontSize(13).text('Historial de visitas', { align: 'center' });
    doc.fontSize(10).text(`Periodo: ${fromDate} a ${toDate}`, { align: 'center' });
    doc
      .fontSize(9)
      .text(`Generado: ${this.formatDateTime(new Date())} · Total: ${rows.length} visita(s)`, {
        align: 'center',
      });
    doc.moveDown();

    if (!rows.length) {
      doc.fontSize(11).text('No hay visitas registradas en el rango seleccionado.');
      doc.end();
      return finished;
    }

    for (const v of rows) {
      const dto = this.toDto(v);
      doc.fontSize(11).fillColor('#0f172a').text(dto.displayName, { continued: false });
      doc
        .fontSize(9)
        .fillColor('#334155')
        .text(
          [
            dto.documentNumber ? `C.C. ${dto.documentNumber}` : null,
            `Ingreso: ${this.formatDateTime(v.entryAt)}`,
            v.exitAt ? `Salida: ${this.formatDateTime(v.exitAt)}` : 'Salida: sin registrar',
            v.exitAt ? `Permanencia: ${this.durationLabel(v.entryAt, v.exitAt)}` : null,
            dto.visitReason ? `Motivo: ${dto.visitReason}` : null,
            dto.authorizedBy ? `Autorizado por: ${dto.authorizedBy}` : null,
            dto.originPlace ? `Origen: ${dto.originPlace}` : null,
            dto.arl ? `ARL: ${dto.arl}` : null,
            dto.eps ? `EPS: ${dto.eps}` : null,
            dto.transportMeans
              ? `Desplazamiento: ${this.transportLabel(dto.transportMeans)}${
                  dto.travelTimeMinutes != null ? ` (${dto.travelTimeMinutes} min)` : ''
                }`
              : null,
            dto.notes ? `Notas: ${dto.notes}` : null,
          ]
            .filter(Boolean)
            .join(' · '),
          { width: 515 },
        );
      doc.moveDown(0.55);
      if (doc.y > 760) doc.addPage();
    }

    doc.end();
    return finished;
  }

  private bogotaBounds(now = new Date()) {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Bogota',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(now);
    const num = (type: Intl.DateTimeFormatPartTypes) =>
      Number(parts.find((p) => p.type === type)?.value ?? '0');

    const y = num('year');
    const m = num('month');
    const d = num('day');

    const atBogotaMidnight = (year: number, month: number, day: number) =>
      new Date(
        `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T00:00:00-05:00`,
      );

    const dayStart = atBogotaMidnight(y, m, d);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    const monthStart = atBogotaMidnight(y, m, 1);
    const monthEnd =
      m === 12 ? atBogotaMidnight(y + 1, 1, 1) : atBogotaMidnight(y, m + 1, 1);
    const yearStart = atBogotaMidnight(y, 1, 1);
    const yearEnd = atBogotaMidnight(y + 1, 1, 1);
    const days14Start = new Date(dayStart.getTime() - 13 * 24 * 60 * 60 * 1000);

    return {
      y,
      m,
      d,
      dayStart,
      dayEnd,
      monthStart,
      monthEnd,
      yearStart,
      yearEnd,
      days14Start,
    };
  }

  private fillLast14Days(
    byDay: { day: string; entries: number }[],
    bounds: { dayStart: Date; days14Start: Date },
  ) {
    const map = new Map(
      byDay.map((row) => [row.day, Number(row.entries) || 0]),
    );
    const out: { day: string; entries: number }[] = [];
    for (let i = 0; i < 14; i++) {
      const t = new Date(bounds.days14Start.getTime() + i * 24 * 60 * 60 * 1000);
      const day = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Bogota',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(t);
      out.push({ day, entries: map.get(day) ?? 0 });
    }
    return out;
  }

  private formatDateTime(value: Date): string {
    return new Intl.DateTimeFormat('es-CO', {
      dateStyle: 'short',
      timeStyle: 'medium',
      timeZone: 'America/Bogota',
    }).format(value);
  }

  private durationLabel(entryAt: Date, exitAt: Date): string {
    const ms = exitAt.getTime() - entryAt.getTime();
    if (ms < 0) return '—';
    const totalMin = Math.round(ms / 60000);
    if (totalMin < 60) return `${totalMin} min`;
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return m ? `${h} h ${m} min` : `${h} h`;
  }

  private transportLabel(value: string): string {
    switch (value) {
      case 'MOTO':
        return 'Moto';
      case 'CARRO':
        return 'Carro';
      case 'TRANSPORTE_PUBLICO':
        return 'Transporte público';
      case 'OTRO':
        return 'Otro';
      case 'NINGUNO':
        return 'Ninguno / a pie';
      default:
        return value;
    }
  }

  private trimOrNull(v?: string | null): string | null {
    const t = v?.trim();
    return t ? t : null;
  }

  private displayName(v: ReceptionVisitor): string {
    const parts = [v.firstName, v.secondName, v.firstSurname, v.secondSurname].filter(Boolean);
    if (parts.length) return parts.join(' ');
    if (v.documentNumber) return `Doc. ${v.documentNumber}`;
    return 'Visitante sin nombre';
  }

  private toDto(v: ReceptionVisitor) {
    return {
      id: v.id,
      documentNumber: v.documentNumber ?? null,
      firstSurname: v.firstSurname ?? null,
      secondSurname: v.secondSurname ?? null,
      firstName: v.firstName ?? null,
      secondName: v.secondName ?? null,
      displayName: this.displayName(v),
      sex: v.sex ?? null,
      birthDate: v.birthDate ?? null,
      arl: v.arl ?? null,
      eps: v.eps ?? null,
      originPlace: v.originPlace ?? null,
      visitReason: v.visitReason ?? null,
      entryAt: v.entryAt,
      authorizedBy: v.authorizedBy ?? null,
      registeredBy: v.registeredBy ?? null,
      transportMeans: v.transportMeans ?? null,
      travelTimeMinutes: v.travelTimeMinutes ?? null,
      exitAt: v.exitAt ?? null,
      exitNotes: v.exitNotes ?? null,
      exitedBy: v.exitedBy ?? null,
      notes: v.notes ?? null,
      isInside: !v.exitAt,
      createdAt: v.createdAt ?? v.entryAt,
      updatedAt: v.updatedAt ?? v.entryAt,
    };
  }
}
