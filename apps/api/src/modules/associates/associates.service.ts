import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as fs from 'fs';
import * as path from 'path';
import PDFDocument = require('pdfkit');
import { Brackets, Repository } from 'typeorm';
import {
  getMembreteBascBuffer,
  getMembreteHuellaBuffer,
  getMembreteIso45001Buffer,
  getMembreteIso9001Buffer,
  getMembreteLogoBuffer,
  getMembreteRespSocialBuffer,
} from './membrete-assets';
import { AuditService } from '../audit/audit.service';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { NotificationsService } from '../notifications/notifications.service';
import { AssociateDerivedService } from '../hr-shared/services/associate-derived.service';
import { HrAuditService } from '../hr-shared/services/hr-audit.service';
import { SensitiveDataService } from '../hr-shared/services/sensitive-data.service';
import { HrDocumentsService } from '../hr-documents/hr-documents.service';
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
    private readonly documents: HrDocumentsService,
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

    if (dto.credentials?.length) {
      await this.documents.registerCredentials(saved.id, dto.credentials, user.sub);
    }

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

    if (dto.credentials?.length) {
      await this.documents.registerCredentials(saved.id, dto.credentials, user.sub);
    }

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
    delete clean.credentials;
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
      profileComplete: this.isProfileComplete(associate),
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

  /** Completa = celular + fecha ingreso + cargo (identidad ya es obligatoria al crear). */
  private isProfileComplete(a: Associate): boolean {
    const mobile = (a.mobile ?? '').trim();
    const hireDate = (a.hireDate ?? '').toString().trim();
    return mobile.length >= 4 && !!hireDate && !!a.jobPositionId;
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
      const doc = new PDFDocument({ size: 'LETTER', margins: { top: 40, bottom: 40, left: 55, right: 55 } });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err: Error) => reject(err));

      // Franja superior azul corporativa
      doc.rect(0, 0, 612, 10).fill('#1d4ed8');

      // Logo Oficial Coraza en Memoria (100% garantizado en cualquier servidor)
      try {
        const logoBuf = getMembreteLogoBuffer();
        doc.image(logoBuf, 55, 18, { width: 54, height: 54 });
      } catch (e) {
        console.error('Error rendering logo buffer:', e);
      }

      const headerTextX = 118;

      // Encabezado Corporativo Oficial 2025
      doc.fillColor('#0f172a').fontSize(14).font('Helvetica-Bold').text('CORAZA SEGURIDAD C.T.A.', headerTextX, 22);
      doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#1d4ed8').text('La Seguridad un Compromiso de Todos', headerTextX, 39);
      doc.fontSize(7.5).font('Helvetica').fillColor('#64748b').text('NIT: 811.026.837-1 · VIGILADO Supervigilancia Resolución 6889 del 29 de septiembre de 2011', headerTextX, 52);

      doc.strokeColor('#1d4ed8').lineWidth(1.5).moveTo(55, 82).lineTo(557, 82).stroke();
      doc.y = 98;
      doc.moveDown(1);

      // Título
      doc.rect(55, doc.y, 502, 24).fill('#f1f5f9');
      doc.fillColor('#1e293b').fontSize(10.5).font('Helvetica-Bold').text('EL DEPARTAMENTO DE GESTIÓN HUMANA Y BIENESTAR LABORAL', 55, doc.y - 17, { align: 'center' });
      doc.moveDown(1.5);
      
      doc.fillColor('#0f172a').fontSize(13).font('Helvetica-Bold').text('CERTIFICA:', { align: 'center' });
      doc.moveDown(1.2);

      // Cuerpo del Certificado
      doc.fontSize(10.5).font('Helvetica').fillColor('#334155').lineGap(5);
      doc.text(
        `Que el(la) señor(a) ${fullName.toUpperCase()}, identificado(a) con Cédula de Ciudadanía No. ${docNum}, se encuentra vinculado(a) a nuestra cooperativa en calidad de ASOCIADO(A) TRABAJADOR(A) desde el ${fechaIngreso}, desempeñando actualmente las funciones correspondientes al cargo de:`,
        55,
        doc.y,
        { align: 'justify', width: 502 }
      );
      doc.moveDown(0.8);

      // Cuadro de Detalles
      const boxY = doc.y;
      doc.rect(55, boxY, 502, 70).fillAndStroke('#f8fafc', '#cbd5e1');
      doc.fillColor('#0f172a').fontSize(9.5).font('Helvetica-Bold');
      doc.text(`• CARGO / ESPECIALIDAD:`, 75, boxY + 12);
      doc.font('Helvetica').fillColor('#1e293b').text(`${cargo.toUpperCase()}`, 235, boxY + 12);

      doc.font('Helvetica-Bold').fillColor('#0f172a').text(`• CENTRO DE ASIGNACIÓN:`, 75, boxY + 30);
      doc.font('Helvetica').fillColor('#1e293b').text(`${centro.toUpperCase()}`, 235, boxY + 30);

      doc.font('Helvetica-Bold').fillColor('#0f172a').text(`• ESTADO OPERATIVO:`, 75, boxY + 48);
      doc.font('Helvetica').fillColor(estado.includes('ACTIVO') ? '#047857' : '#b91c1c').text(`${estado}`, 235, boxY + 48);

      doc.y = boxY + 84;
      doc.moveDown(1);
      doc.fillColor('#334155').fontSize(10.5).font('Helvetica').text(
        `Durante el tiempo de su vinculación, ha demostrado un estricto cumplimiento de los deberes cooperativos, principios de lealtad, disciplina y estándares de seguridad privada exigidos por la legislación colombiana y la Superintendencia de Vigilancia y Seguridad Privada.`,
        55,
        doc.y,
        { align: 'justify', width: 502 }
      );
      doc.moveDown(1);
      doc.text(
        `El presente certificado se expide a solicitud de la parte interesada en la ciudad de Medellín, a los ${fechaExpedicion}.`,
        55,
        doc.y,
        { align: 'justify', width: 502 }
      );
      doc.moveDown(3);

      // Firma Autorizada
      const sigY = doc.y;
      doc.strokeColor('#94a3b8').lineWidth(1).moveTo(55, sigY).lineTo(250, sigY).stroke();
      doc.fillColor('#0f172a').fontSize(9.5).font('Helvetica-Bold').text('GESTIÓN HUMANA Y BIENESTAR', 55, sigY + 6);
      doc.fontSize(8.5).font('Helvetica').fillColor('#64748b').text('Coraza Seguridad C.T.A.', 55, sigY + 18);
      doc.text('PBX: (604) 4447929 · Medellín, Colombia', 55, sigY + 28);

      // 5 Sellos de certificación oficiales en el pie de página exactamente como en la plantilla
      const footerSealsY = 692;
      try {
        doc.image(getMembreteIso9001Buffer(), 55, footerSealsY, { height: 32 });
        doc.image(getMembreteIso45001Buffer(), 150, footerSealsY, { height: 32 });
        doc.image(getMembreteHuellaBuffer(), 245, footerSealsY + 2, { height: 28 });
        doc.image(getMembreteRespSocialBuffer(), 390, footerSealsY, { height: 32 });
        doc.image(getMembreteBascBuffer(), 480, footerSealsY - 2, { height: 36 });
      } catch (e) {
        console.error('Error rendering footer seals:', e);
      }

      // Pie de Página Membrete Oficial 2025 (Texto limpio sin caracteres especiales)
      doc.strokeColor('#1d4ed8').lineWidth(1.5).moveTo(55, 735).lineTo(557, 735).stroke();
      doc.fontSize(8).font('Helvetica').fillColor('#475569').text('info@corazaseguridadcta.com   |   www.corazaseguridadcta.com   |   PBX: (604) 4447929   |   Medellín - Colombia', 55, 742, { align: 'center' });
      doc.rect(0, 782, 612, 10).fill('#1d4ed8');

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
