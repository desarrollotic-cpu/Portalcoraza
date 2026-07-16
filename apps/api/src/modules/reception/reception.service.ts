import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
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
        birthDate: dto.birthDate || null,
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

    await this.audit.log({
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
