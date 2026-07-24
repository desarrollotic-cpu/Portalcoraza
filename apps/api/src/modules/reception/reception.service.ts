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

@Injectable()
export class ReceptionService {
  constructor(
    @InjectRepository(ReceptionVisitor)
    private readonly visitorsRepo: Repository<ReceptionVisitor>,
    private readonly audit: AuditService,
  ) {}

  async getDashboard() {
    const tz = 'America/Bogota';

    const raw = await this.visitorsRepo.query(
      `
      SELECT
        COUNT(*) FILTER (WHERE exit_at IS NULL)::int AS inside_now,
        COUNT(*) FILTER (
          WHERE (entry_at AT TIME ZONE $1)::date = (NOW() AT TIME ZONE $1)::date
        )::int AS today_entries,
        COUNT(*) FILTER (
          WHERE exit_at IS NULL
            AND (entry_at AT TIME ZONE $1)::date = (NOW() AT TIME ZONE $1)::date
        )::int AS today_still_inside,
        COUNT(*) FILTER (
          WHERE date_trunc('month', entry_at AT TIME ZONE $1)
              = date_trunc('month', NOW() AT TIME ZONE $1)
        )::int AS month_entries,
        COUNT(*) FILTER (
          WHERE date_trunc('year', entry_at AT TIME ZONE $1)
              = date_trunc('year', NOW() AT TIME ZONE $1)
        )::int AS year_entries,
        COUNT(*)::int AS total_entries
      FROM reception_visitors
      `,
      [tz],
    );

    const row = raw[0] ?? {};

    const byDay = await this.visitorsRepo.query(
      `
      SELECT
        (entry_at AT TIME ZONE $1)::date::text AS day,
        COUNT(*)::int AS entries
      FROM reception_visitors
      WHERE (entry_at AT TIME ZONE $1)::date
        >= ((NOW() AT TIME ZONE $1)::date - INTERVAL '13 days')
      GROUP BY 1
      ORDER BY 1 ASC
      `,
      [tz],
    );

    const inside = await this.visitorsRepo.find({
      where: { exitAt: IsNull() },
      order: { entryAt: 'DESC' },
      take: 50,
    });

    const todayList = await this.visitorsRepo
      .createQueryBuilder('v')
      .where(`(v.entry_at AT TIME ZONE :tz)::date = (NOW() AT TIME ZONE :tz)::date`, {
        tz,
      })
      .orderBy('v.entry_at', 'DESC')
      .take(100)
      .getMany();

    return {
      stats: {
        insideNow: Number(row.inside_now) || 0,
        todayEntries: Number(row.today_entries) || 0,
        todayStillInside: Number(row.today_still_inside) || 0,
        monthEntries: Number(row.month_entries) || 0,
        yearEntries: Number(row.year_entries) || 0,
        totalEntries: Number(row.total_entries) || 0,
      },
      last14Days: byDay.map((d: { day: string; entries: number }) => ({
        day: d.day,
        entries: Number(d.entries) || 0,
      })),
      insideNow: inside.map((v) => this.toDto(v)),
      today: todayList.map((v) => this.toDto(v)),
    };
  }

  async list(params: { insideOnly?: boolean; limit?: number } = {}) {
    const qb = this.visitorsRepo.createQueryBuilder('v').orderBy('v.entry_at', 'DESC');
    if (params.insideOnly) {
      qb.andWhere('v.exit_at IS NULL');
    }
    qb.take(Math.min(params.limit ?? 100, 500));
    const rows = await qb.getMany();
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
      documentNumber: v.documentNumber,
      firstSurname: v.firstSurname,
      secondSurname: v.secondSurname,
      firstName: v.firstName,
      secondName: v.secondName,
      displayName: this.displayName(v),
      sex: v.sex,
      birthDate: v.birthDate,
      arl: v.arl,
      eps: v.eps,
      originPlace: v.originPlace,
      visitReason: v.visitReason,
      entryAt: v.entryAt,
      authorizedBy: v.authorizedBy,
      registeredBy: v.registeredBy,
      transportMeans: v.transportMeans,
      travelTimeMinutes: v.travelTimeMinutes,
      exitAt: v.exitAt,
      exitNotes: v.exitNotes,
      exitedBy: v.exitedBy,
      notes: v.notes,
      isInside: !v.exitAt,
      createdAt: v.createdAt,
      updatedAt: v.updatedAt,
    };
  }
}
