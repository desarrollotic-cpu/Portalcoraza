import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import PDFDocument = require('pdfkit');
import { Brackets, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { NotificationsService } from '../notifications/notifications.service';
import { AssociateDerivedService } from '../hr-shared/services/associate-derived.service';
import { HrAuditService } from '../hr-shared/services/hr-audit.service';
import { SensitiveDataService } from '../hr-shared/services/sensitive-data.service';
import { Retirement } from '../hr-retirements/entities/retirement.entity';
import { AssociatesQueryDto } from './dto/associates-query.dto';
import { CreateAssociateDto } from './dto/create-associate.dto';
import { ReadmitAssociateDto } from './dto/readmit-associate.dto';
import { UpdateAssociateDto } from './dto/update-associate.dto';
import { AssociateHistory } from './entities/associate-history.entity';
import { Associate, AssociateStatus } from './entities/associate.entity';
import { PositionHistory } from './entities/position-history.entity';

/**
 * Reglas de negocio para el módulo de asociados (RRHH).
 *
 * Aplica:
 *   • auditoría campo-a-campo (delegada a HrAuditService)
 *   • cálculo de campos derivados (edad, antigüedad)
 *   • enmascaramiento Ley 1581 sobre raza / religión / orientación sexual
 *   • preservación de historial de cargos en cada cambio
 *   • flujo de reingreso desde estado RETIRADO
 */
@Injectable()
export class AssociatesService {
  private static readonly RELATIONS = [
    'jobPosition',
    'workCenter',
    'eps',
    'pensionFund',
    'bloodType',
    'gender',
    'sexualOrientation',
    'religion',
    'race',
    'housingType',
    'educationLevel',
    'incomeRange',
    'transportMean',
    'commuteTime',
  ];

  constructor(
    @InjectRepository(Associate)
    private readonly associatesRepo: Repository<Associate>,
    @InjectRepository(AssociateHistory)
    private readonly historyRepo: Repository<AssociateHistory>,
    @InjectRepository(PositionHistory)
    private readonly positionHistoryRepo: Repository<PositionHistory>,
    @InjectRepository(Retirement)
    private readonly retirementRepo: Repository<Retirement>,
    private readonly hrAudit: HrAuditService,
    private readonly derived: AssociateDerivedService,
    private readonly sensitive: SensitiveDataService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
  ) {}

  async lookup(status?: string) {
    const qb = this.associatesRepo
      .createQueryBuilder('a')
      .select([
        'a.id',
        'a.documentNumber',
        'a.firstName',
        'a.secondName',
        'a.firstLastName',
        'a.secondLastName',
        'a.status',
      ]);

    if (status) {
      qb.where('a.status = :status', { status });
    }

    qb.orderBy('a.firstLastName', 'ASC').addOrderBy('a.firstName', 'ASC');

    const rows = await qb.getMany();
    return rows.map((r) => ({
      id: r.id,
      documentNumber: r.documentNumber,
      firstName: [r.firstName, r.secondName].filter(Boolean).join(' '),
      lastName: [r.firstLastName, r.secondLastName].filter(Boolean).join(' '),
      status: r.status,
    }));
  }

  // ─── Consultas ────────────────────────────────────────────────────────
  async list(query: AssociatesQueryDto, user: JwtPayload) {
    const qb = this.associatesRepo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.jobPosition', 'jobPosition')
      .leftJoinAndSelect('a.workCenter', 'workCenter')
      .leftJoinAndSelect('a.eps', 'eps')
      .leftJoinAndSelect('a.gender', 'gender')
      .leftJoinAndSelect('a.bloodType', 'bloodType')
      .leftJoinAndSelect('a.educationLevel', 'educationLevel');

    if (query.status) qb.andWhere('a.status = :status', { status: query.status });
    if (query.workCenterId) qb.andWhere('a.workCenterId = :wcId', { wcId: query.workCenterId });
    if (query.jobPositionId) qb.andWhere('a.jobPositionId = :jpId', { jpId: query.jobPositionId });
    if (query.educationLevelId) {
      qb.andWhere('a.educationLevelId = :eduId', { eduId: query.educationLevelId });
    }

    if (query.isCritical !== undefined) {
      qb.andWhere('jobPosition.isCritical = :isCritical', {
        isCritical: query.isCritical === 'true',
      });
    }

    if (query.search) {
      const term = `%${query.search.trim().toUpperCase()}%`;
      qb.andWhere(
        new Brackets((sub) => {
          sub
            .where('UPPER(a.documentNumber) LIKE :term', { term })
            .orWhere('UPPER(a.firstName) LIKE :term', { term })
            .orWhere('UPPER(a.secondName) LIKE :term', { term })
            .orWhere('UPPER(a.firstLastName) LIKE :term', { term })
            .orWhere('UPPER(a.secondLastName) LIKE :term', { term });
        }),
      );
    }

    qb.orderBy('a.firstLastName', 'ASC').addOrderBy('a.firstName', 'ASC');

    const page = Math.max(1, parseInt(query.page ?? '1', 10) || 1);
    const limit = Math.min(2000, Math.max(1, parseInt(query.limit ?? '50', 10) || 50));
    const skip = (page - 1) * limit;
    const tenureFilter = !!(query.tenureMinYears || query.tenureMaxYears);

    let rows: Associate[];
    let total: number;
    if (tenureFilter) {
      rows = await qb.getMany();
      const retiredIds = rows
        .filter((a) => a.status === AssociateStatus.RETIRADO)
        .map((a) => a.id);
      const retirementByAssociate = await this.latestRetirementDates(retiredIds);
      const min = query.tenureMinYears ? parseFloat(query.tenureMinYears) : 0;
      const max = query.tenureMaxYears ? parseFloat(query.tenureMaxYears) : Number.MAX_SAFE_INTEGER;
      rows = rows.filter((a) => {
        const { tenureYears } = this.derived.compute({
          birthDate: a.birthDate,
          hireDate: a.hireDate,
          status: a.status,
          retirementDate: retirementByAssociate.get(a.id) ?? null,
        });
        return tenureYears >= min && tenureYears <= max;
      });
      total = rows.length;
      rows = rows.slice(skip, skip + limit);
      const pageRetired = rows
        .filter((a) => a.status === AssociateStatus.RETIRADO)
        .map((a) => a.id);
      const pageRetirements = await this.latestRetirementDates(pageRetired);
      return {
        items: rows.map((a) => this.enrich(a, user, pageRetirements.get(a.id))),
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      };
    }

    [rows, total] = await qb.skip(skip).take(limit).getManyAndCount();
    const retiredIds = rows
      .filter((a) => a.status === AssociateStatus.RETIRADO)
      .map((a) => a.id);
    const retirementByAssociate = await this.latestRetirementDates(retiredIds);

    return {
      items: rows.map((a) => this.enrich(a, user, retirementByAssociate.get(a.id))),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async findOne(id: string, user: JwtPayload) {
    const associate = await this.associatesRepo.findOne({
      where: { id },
      relations: AssociatesService.RELATIONS,
    });
    if (!associate) throw new NotFoundException('Asociado no encontrado');

    // Bitácora de acceso a ficha (Ley 1581 / trazabilidad) — no bloquea la respuesta.
    void this.audit
      .log({
        userId: user.sub,
        module: 'hr',
        action: 'view_record',
        entityType: 'associate',
        entityId: id,
      })
      .catch(() => undefined);

    const retirementDate = await this.latestRetirementDate(id);
    return this.enrich(associate, user, retirementDate);
  }

  async history(id: string) {
    await this.assertExists(id);
    return this.historyRepo.find({
      where: { associateId: id },
      order: { createdAt: 'DESC' },
    });
  }

  async positionHistory(id: string) {
    await this.assertExists(id);
    return this.positionHistoryRepo.find({
      where: { associateId: id },
      relations: ['jobPosition', 'workCenter'],
      order: { changedAt: 'DESC' },
    });
  }

  // ─── Comandos ────────────────────────────────────────────────────────
  async create(dto: CreateAssociateDto, user: JwtPayload, ipAddress?: string) {
    const documentNumber = dto.documentNumber.trim();

    const duplicate = await this.associatesRepo.findOne({ where: { documentNumber } });
    if (duplicate) {
      const label = duplicate.status === AssociateStatus.RETIRADO
        ? 'ya existe como RETIRADO — usa la opción de reingreso'
        : 'ya existe como ACTIVO o SUSPENDIDO';
      throw new BadRequestException(
        `El asociado con documento ${documentNumber} ${label}.`,
      );
    }

    const associate = this.associatesRepo.create({
      ...this.normalizeDto(dto),
      documentNumber,
      status: dto.status ?? AssociateStatus.ACTIVO,
      createdBy: user.sub,
      updatedBy: user.sub,
    } as unknown as Associate);

    const saved = await this.associatesRepo.save(associate);

    // Historial de cargo inicial
    if (saved.jobPositionId) {
      await this.positionHistoryRepo.save(
        this.positionHistoryRepo.create({
          associateId: saved.id,
          jobPositionId: saved.jobPositionId,
          workCenterId: saved.workCenterId,
          changeReason: dto.positionChangeReason ?? 'Ingreso inicial',
          changedBy: user.sub,
        }),
      );
    }

    await this.hrAudit.recordAssociateChange({
      userId: user.sub,
      associateId: saved.id,
      action: 'CREATE',
      oldValues: {},
      newValues: saved as unknown as Record<string, unknown>,
      ipAddress,
    });

    return this.findOne(saved.id, user);
  }

  async update(id: string, dto: UpdateAssociateDto, user: JwtPayload, ipAddress?: string) {
    const existing = await this.associatesRepo.findOne({ where: { id } });
    if (!existing) throw new NotFoundException('Asociado no encontrado');

    // Verificar duplicado de documento si cambia
    if (dto.documentNumber && dto.documentNumber !== existing.documentNumber) {
      const dup = await this.associatesRepo.findOne({
        where: { documentNumber: dto.documentNumber.trim() },
      });
      if (dup && dup.id !== existing.id) {
        throw new BadRequestException(
          `Ya existe otro asociado con el documento ${dto.documentNumber}`,
        );
      }
    }

    const oldSnapshot = { ...existing };
    const previousPositionId = existing.jobPositionId;

    Object.assign(existing, this.normalizeDto(dto), { updatedBy: user.sub });
    const saved = await this.associatesRepo.save(existing);

    // Cambio de cargo → historial de cargos
    if (dto.jobPositionId && dto.jobPositionId !== previousPositionId) {
      await this.positionHistoryRepo.save(
        this.positionHistoryRepo.create({
          associateId: saved.id,
          jobPositionId: saved.jobPositionId!,
          workCenterId: saved.workCenterId,
          changeReason: dto.positionChangeReason ?? 'Cambio de cargo',
          changedBy: user.sub,
        }),
      );
    }

    await this.hrAudit.recordAssociateChange({
      userId: user.sub,
      associateId: saved.id,
      action: 'EDIT',
      oldValues: oldSnapshot as unknown as Record<string, unknown>,
      newValues: dto as unknown as Record<string, unknown>,
      ipAddress,
    });

    return this.findOne(saved.id, user);
  }

  async readmit(
    id: string,
    dto: ReadmitAssociateDto,
    user: JwtPayload,
    ipAddress?: string,
  ) {
    const associate = await this.associatesRepo.findOne({ where: { id } });
    if (!associate) throw new NotFoundException('Asociado no encontrado');
    if (associate.status !== AssociateStatus.RETIRADO) {
      throw new BadRequestException(
        `El asociado no está en estado RETIRADO (estado actual: ${associate.status}).`,
      );
    }

    const oldSnapshot = { ...associate };
    associate.status = AssociateStatus.ACTIVO;
    associate.hireDate = dto.hireDate;
    associate.jobPositionId = dto.jobPositionId;
    if (dto.workCenterId !== undefined) associate.workCenterId = dto.workCenterId;
    if (dto.folderNumber !== undefined) associate.folderNumber = dto.folderNumber;
    associate.updatedBy = user.sub;

    const saved = await this.associatesRepo.save(associate);

    await this.positionHistoryRepo.save(
      this.positionHistoryRepo.create({
        associateId: saved.id,
        jobPositionId: saved.jobPositionId!,
        workCenterId: saved.workCenterId,
        changeReason: dto.reason ?? 'Reingreso',
        changedBy: user.sub,
      }),
    );

    await this.hrAudit.recordAssociateChange({
      userId: user.sub,
      associateId: saved.id,
      action: 'READMIT',
      oldValues: oldSnapshot as unknown as Record<string, unknown>,
      newValues: saved as unknown as Record<string, unknown>,
      ipAddress,
    });

    return this.findOne(saved.id, user);
  }

  /**
   * Marca al asociado como RETIRADO sin generar la encuesta de salida. La
   * encuesta se registra por el módulo de retiros (retirements).
   */
  async markRetired(id: string, user: JwtPayload, ipAddress?: string) {
    const associate = await this.associatesRepo.findOne({ where: { id } });
    if (!associate) throw new NotFoundException('Asociado no encontrado');

    const oldSnapshot = { ...associate };
    associate.status = AssociateStatus.RETIRADO;
    associate.updatedBy = user.sub;
    const saved = await this.associatesRepo.save(associate);

    await this.hrAudit.recordAssociateChange({
      userId: user.sub,
      associateId: saved.id,
      action: 'RETIRE',
      oldValues: oldSnapshot as unknown as Record<string, unknown>,
      newValues: saved as unknown as Record<string, unknown>,
      ipAddress,
    });

    const name = [saved.firstName, saved.firstLastName].filter(Boolean).join(' ') || 'Sin nombre';
    await this.notifications.sendToRole('RRHH', `Asociado retirado: ${name}`, saved.documentNumber, 'rrhh');
    await this.notifications.sendToRole('GERENCIA', `Asociado retirado: ${name}`, saved.documentNumber, 'rrhh');

    return this.findOne(saved.id, user);
  }

  // ─── Helpers ─────────────────────────────────────────────────────────
  private async assertExists(id: string) {
    const exists = await this.associatesRepo.exists({ where: { id } });
    if (!exists) throw new NotFoundException('Asociado no encontrado');
  }

  /** Normaliza fechas y strings del DTO antes de persistir. */
  private normalizeDto(dto: Partial<CreateAssociateDto>): Partial<Associate> {
    const clean: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(dto)) {
      if (v === undefined) continue;
      if (v === '') {
        clean[k] = null;
        continue;
      }
      clean[k] = v;
    }
    delete clean.positionChangeReason;
    return clean as Partial<Associate>;
  }

  /** Añade campos derivados y aplica enmascaramiento sensible. */
  private enrich(
    associate: Associate,
    user: JwtPayload,
    retirementDate?: string | null,
  ) {
    const derived = this.derived.compute({
      birthDate: associate.birthDate,
      hireDate: associate.hireDate,
      status: associate.status,
      retirementDate: retirementDate ?? null,
    });
    const enriched = {
      ...associate,
      ageAtHire: derived.ageAtHire,
      currentAge: derived.currentAge,
      tenureYears: derived.tenureYears,
      fullName: [
        associate.firstName,
        associate.secondName,
        associate.firstLastName,
        associate.secondLastName,
      ]
        .filter(Boolean)
        .join(' ')
        .trim(),
    };
    return this.sensitive.maskAssociate(enriched, user);
  }

  private async latestRetirementDate(associateId: string): Promise<string | null> {
    const row = await this.retirementRepo.findOne({
      where: { associateId },
      order: { retirementDate: 'DESC' },
    });
    return row?.retirementDate ?? null;
  }

  async generateCertificatePdf(id: string, user: JwtPayload): Promise<Buffer> {
    const assoc = await this.findOne(id, user);
    if (!assoc) throw new NotFoundException('Asociado no encontrado');

    const fullName = (assoc as any).fullName || `${assoc.firstName || ''} ${assoc.firstLastName || ''}`.trim();
    const docNum = assoc.documentNumber || '—';
    const cargo = (assoc as any).jobPosition?.name || 'Vigilante / Operativo';
    const centro = (assoc as any).workCenter?.name || 'Sede Principal';
    const fechaIngreso = assoc.hireDate ? new Date(assoc.hireDate).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' }) : '—';
    const estado = assoc.status === AssociateStatus.ACTIVO ? 'ACTIVO(A)' : 'RETIRADO(A)';
    const fechaExpedicion = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ size: 'LETTER', margins: { top: 50, bottom: 50, left: 60, right: 60 } });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err: Error) => reject(err));

      // Encabezado Corporativo
      doc.rect(0, 0, 612, 12).fill('#1d4ed8');
      doc.moveDown(1.5);
      
      doc.fillColor('#0f172a').fontSize(16).font('Helvetica-Bold').text('CORAZA SEGURIDAD C.T.A.', { align: 'center' });
      doc.fontSize(9).font('Helvetica').fillColor('#64748b').text('COOPERATIVA DE TRABAJO ASOCIADO DE SEGURIDAD PRIVADA', { align: 'center' });
      doc.text('NIT: 811.026.837-1 · Personería Jurídica y Licencia SuperVigilancia Res. No. 202112000', { align: 'center' });
      doc.moveDown(2);

      // Título
      doc.rect(60, doc.y, 492, 28).fill('#f1f5f9');
      doc.fillColor('#1e293b').fontSize(12).font('Helvetica-Bold').text('EL DEPARTAMENTO DE GESTIÓN HUMANA Y TALENTO', 60, doc.y - 20, { align: 'center' });
      doc.moveDown(1.5);
      
      doc.fillColor('#0f172a').fontSize(14).font('Helvetica-Bold').text('CERTIFICA:', { align: 'center' });
      doc.moveDown(1.5);

      // Cuerpo del Certificado
      doc.fontSize(11).font('Helvetica').fillColor('#334155').lineGap(6);
      doc.text(
        `Que el(la) señor(a) ${fullName.toUpperCase()}, identificado(a) con Cédula de Ciudadanía No. ${docNum}, se encuentra vinculado(a) a nuestra cooperativa en calidad de ASOCIADO(A) TRABAJADOR(A) desde el ${fechaIngreso}, desempeñando actualmente las funciones correspondientes al cargo de:`
      );
      doc.moveDown(0.5);

      // Cuadro de Detalles
      const boxY = doc.y;
      doc.rect(60, boxY, 492, 70).fillAndStroke('#f8fafc', '#cbd5e1');
      doc.fillColor('#0f172a').fontSize(10).font('Helvetica-Bold');
      doc.text(`• CARGO / ESPECIALIDAD:`, 80, boxY + 12);
      doc.font('Helvetica').fillColor('#1e293b').text(`${cargo.toUpperCase()}`, 240, boxY + 12);

      doc.font('Helvetica-Bold').fillColor('#0f172a').text(`• CENTRO DE ASIGNACIÓN:`, 80, boxY + 30);
      doc.font('Helvetica').fillColor('#1e293b').text(`${centro.toUpperCase()}`, 240, boxY + 30);

      doc.font('Helvetica-Bold').fillColor('#0f172a').text(`• ESTADO OPERATIVO:`, 80, boxY + 48);
      doc.font('Helvetica').fillColor(estado.includes('ACTIVO') ? '#047857' : '#b91c1c').text(`${estado}`, 240, boxY + 48);

      doc.y = boxY + 85;
      doc.moveDown(1);
      doc.fillColor('#334155').fontSize(11).font('Helvetica').text(
        `Durante el tiempo de su vinculación, ha demostrado un estricto cumplimiento de los deberes cooperativos, principios de lealtad, disciplina y estándares de seguridad privada exigidos por la legislación colombiana y la Superintendencia de Vigilancia y Seguridad Privada.`
      );
      doc.moveDown(1);
      doc.text(
        `El presente certificado se expide a solicitud de la parte interesada en la ciudad de Medellín, a los ${fechaExpedicion}.`
      );
      doc.moveDown(3);

      // Firma Autorizada
      const sigY = doc.y;
      doc.strokeColor('#94a3b8').lineWidth(1).moveTo(60, sigY).lineTo(260, sigY).stroke();
      doc.fillColor('#0f172a').fontSize(10).font('Helvetica-Bold').text('GESTIÓN HUMANA Y BIENESTAR', 60, sigY + 6);
      doc.fontSize(9).font('Helvetica').fillColor('#64748b').text('Coraza Seguridad C.T.A.', 60, sigY + 18);
      doc.text('PBX: (604) 444-0000 · Medellín, Colombia', 60, sigY + 30);

      // Pie de Página
      doc.rect(0, 780, 612, 12).fill('#1d4ed8');
      doc.fontSize(7.5).font('Helvetica').fillColor('#94a3b8').text('Documento oficial generado automáticamente por Portal Coraza · Validez con firma institucional', 60, 765, { align: 'center' });

      doc.end();
    });
  }

  private async latestRetirementDates(
    associateIds: string[],
  ): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    if (!associateIds.length) return map;
    const rows = await this.retirementRepo
      .createQueryBuilder('r')
      .where('r.associateId IN (:...ids)', { ids: associateIds })
      .orderBy('r.retirementDate', 'DESC')
      .getMany();
    for (const r of rows) {
      if (!map.has(r.associateId)) {
        map.set(r.associateId, r.retirementDate);
      }
    }
    return map;
  }
}
