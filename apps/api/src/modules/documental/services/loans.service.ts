import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditService } from '../../audit/audit.service';
import { CreateLoanDto } from '../dto/create-loan.dto';
import { PublicLoanRequestDto } from '../dto/public-loan-request.dto';
import { Loan } from '../entities/loan.entity';
import { DocumentalMailService } from './documental-mail.service';

const TIPO_LABEL: Record<string, string> = {
  PERSONAL_RETIRADO: 'Personal retirado',
  CONTRATO: 'Contrato',
  MINUTA: 'Minuta',
  OTRO: 'Otro documento',
};

function digits(v: string | undefined): string {
  return String(v ?? '').replace(/\D/g, '');
}

function formatPublicLoan(dto: PublicLoanRequestDto): {
  document: string;
  documentCode: string | null;
  observations: string;
} {
  const lines: string[] = [`TIPO: ${TIPO_LABEL[dto.tipo] ?? dto.tipo}`];
  let document = '';
  let documentCode: string | null = null;

  if (dto.tipo === 'PERSONAL_RETIRADO') {
    const full = `${dto.nombresRetirado ?? ''} ${dto.apellidosRetirado ?? ''}`.replace(/\s+/g, ' ').trim();
    const cc = digits(dto.cedulaRetirado);
    document = `Personal retirado: ${full} — CC ${cc}`;
    documentCode = dto.carpeta?.trim() || null;
    lines.push(`Nombres: ${(dto.nombresRetirado ?? '').trim()}`);
    lines.push(`Apellidos: ${(dto.apellidosRetirado ?? '').trim()}`);
    lines.push(`Cédula del expediente: ${cc}`);
    if (documentCode) lines.push(`N° carpeta: ${documentCode}`);
  } else if (dto.tipo === 'CONTRATO') {
    const nit = (dto.nitContrato ?? '').trim();
    const num = dto.numeroContrato?.trim() || '';
    document = `Contrato${num ? ` ${num}` : ''} — ${(dto.clienteContrato ?? '').trim()} (NIT ${nit})`;
    documentCode = num || null;
    if (dto.tipoContrato) lines.push(`Tipo de contrato: ${dto.tipoContrato}`);
    lines.push(`Cliente: ${(dto.clienteContrato ?? '').trim()}`);
    lines.push(`NIT: ${nit}`);
    if (num) lines.push(`N° contrato: ${num}`);
  } else if (dto.tipo === 'MINUTA') {
    document = `Minuta ${dto.tipoMinuta} — Puesto ${(dto.puestoMinuta ?? '').trim()}`;
    documentCode = dto.codigoMinuta?.trim() || null;
    lines.push(`Tipo de minuta: ${dto.tipoMinuta ?? ''}`);
    lines.push(`Puesto: ${(dto.puestoMinuta ?? '').trim()}`);
    if (dto.fechaMinuta) lines.push(`Fecha / período: ${dto.fechaMinuta}`);
    if (documentCode) lines.push(`Código minuta: ${documentCode}`);
  } else {
    document = (dto.documento ?? '').trim();
    lines.push(`Documento: ${document}`);
  }

  lines.push(`Motivo: ${dto.motivo.trim()}`);
  return {
    document: document.slice(0, 200),
    documentCode,
    observations: `SOLICITUD PUBLICA\n${lines.join('\n')}`,
  };
}

@Injectable()
export class LoansService {
  private readonly logger = new Logger(LoansService.name);

  constructor(
    @InjectRepository(Loan)
    private readonly repo: Repository<Loan>,
    private readonly audit: AuditService,
    private readonly mailService: DocumentalMailService,
  ) {}

  /**
   * Tarea programada automática:
   * Revisa préstamos vencidos todos los días a las 8:00 AM y 2:00 PM
   * y envía correos de recordatorio recurrentes de forma automática
   * hasta que el funcionario realice la devolución física.
   */
  @Cron('0 8,14 * * *')
  async handleRecurringOverdueCheck(): Promise<void> {
    this.logger.log('⏰ [CRON GESTIÓN DOCUMENTAL] Verificación automática de préstamos vencidos...');
    await this.checkAndSendOverdueReminders();
  }

  /**
   * Marca como VENCIDO los préstamos cuya fecha límite ya pasó
   * y envía automáticamente recordatorio diario a cada solicitante
   * hasta que el estado cambie a DEVUELTO.
   */
  /** Solo marca VENCIDO. No envía correo (eso es del cron, no del GET). */
  async markOverdueStatuses(): Promise<void> {
    await this.repo
      .createQueryBuilder()
      .update(Loan)
      .set({ status: 'VENCIDO' })
      .where("status = 'ACTIVO' AND return_date < CURRENT_DATE")
      .execute();
  }

  async checkAndSendOverdueReminders(): Promise<void> {
    await this.markOverdueStatuses();

    // 2. Buscar todos los préstamos vencidos pendientes de devolución
    const overdueLoans = await this.repo
      .createQueryBuilder('l')
      .where("l.status = 'VENCIDO'")
      .andWhere("l.status != 'DEVUELTO'")
      .andWhere("l.status != 'RECHAZADO'")
      .andWhere("l.email IS NOT NULL AND l.email != ''")
      .getMany();

    const now = Date.now();
    const TWENTY_HOURS_MS = 20 * 60 * 60 * 1000;

    for (const loan of overdueLoans) {
      if (!loan.email) continue;

      // Si nunca fue notificado o pasaron más de 20 horas desde el último aviso (aviso diario recurrente)
      const lastNotified = loan.overdueNotifiedAt ? new Date(loan.overdueNotifiedAt).getTime() : 0;
      if (!lastNotified || now - lastNotified > TWENTY_HOURS_MS) {
        this.logger.log(`📧 [RECORDATORIO RECURRENTE] Enviando aviso diario de devolución para préstamo #${loan.id} a ${loan.email}`);
        await this.mailService.sendOverdueReminder({
          id: loan.id,
          requester: loan.requester,
          email: loan.email,
          document: loan.document || loan.documentCode || 'Expediente Documental',
          returnDate: loan.returnDate ? String(loan.returnDate).slice(0, 10) : 'Fecha no especificada',
          department: loan.department || undefined,
        }).catch((err) => {
          this.logger.error(`Error enviando recordatorio diario a ${loan.email}:`, err);
        });

        loan.overdueNotifiedAt = new Date();
        await this.repo.save(loan);
      }
    }
  }

  async list() {
    await this.markOverdueStatuses();
    return this.repo.find({
      order: { loanDate: 'DESC', createdAt: 'DESC' },
      take: 500,
    });
  }

  async create(dto: CreateLoanDto, userId: string) {
    const saved = await this.repo.save(
      this.repo.create({
        requester: dto.requester,
        department: dto.department ?? null,
        document: dto.document ?? null,
        documentCode: dto.documentCode ?? null,
        email: dto.email ?? null,
        loanDate: dto.loanDate ?? new Date().toISOString().slice(0, 10),
        returnDate: dto.returnDate ?? null,
        status: 'ACTIVO',
      }),
    );
    await this.audit.log({
      userId,
      module: 'documental',
      action: 'loan.create',
      entityType: 'doc_loans',
      entityId: saved.id,
      newValue: saved as unknown as Record<string, unknown>,
    });
    return saved;
  }

  /** Endpoint público: crea solicitud PENDIENTE_APROBACION y avisa a archivo con ficha completa. */
  async publicRequest(dto: PublicLoanRequestDto) {
    const ficha = formatPublicLoan(dto);
    const saved = await this.repo.save(
      this.repo.create({
        requester: `${dto.nombre.trim()} (CC: ${digits(dto.cedula)})`,
        department: dto.departamento ?? null,
        document: ficha.document,
        documentCode: ficha.documentCode,
        email: dto.email ?? null,
        loanDate: new Date().toISOString().slice(0, 10),
        returnDate: dto.fechaDevolucion ?? null,
        observations: ficha.observations,
        status: 'PENDIENTE_APROBACION',
      }),
    );

    void this.mailService
      .sendNewLoanRequestToArchive({
        id: saved.id,
        requester: saved.requester,
        email: saved.email ?? '',
        department: saved.department ?? undefined,
        document: saved.document ?? '',
        observations: ficha.observations,
        returnDate: saved.returnDate ? String(saved.returnDate).slice(0, 10) : undefined,
      })
      .catch((err) => {
        this.logger.error(`Error notificando solicitud nueva ${saved.id}:`, err);
      });

    return { id: saved.id };
  }

  private async setStatus(id: string): Promise<Loan> {
    const loan = await this.repo.findOne({ where: { id } });
    if (!loan) {
      throw new NotFoundException('Préstamo no encontrado');
    }
    return loan;
  }

  async approve(id: string, userId: string) {
    const loan = await this.setStatus(id);
    if (loan.status !== 'PENDIENTE_APROBACION' && loan.status !== 'RECHAZADO') {
      throw new BadRequestException(`Solo se aprueban o reconsideran solicitudes pendientes o rechazadas (estado actual: ${loan.status})`);
    }
    loan.status = 'ACTIVO';
    loan.loanDate = new Date().toISOString().slice(0, 10);
    const saved = await this.repo.save(loan);

    // Enviar correo formal de confirmación de aprobación al solicitante de manera asíncrona
    if (saved.email) {
      void this.mailService.sendLoanApprovalEmail({
        id: saved.id,
        requester: saved.requester,
        email: saved.email,
        document: saved.document || saved.documentCode || 'Expediente Documental',
        loanDate: saved.loanDate || new Date().toISOString().slice(0, 10),
        returnDate: saved.returnDate ? String(saved.returnDate).slice(0, 10) : undefined,
        department: saved.department || undefined,
      }).catch((err) => {
        this.logger.error(`Error enviando correo de aprobación a ${saved.email}:`, err);
      });
    }

    await this.audit.log({
      userId,
      module: 'documental',
      action: 'loan.approve',
      entityType: 'doc_loans',
      entityId: id,
    });
    return saved;
  }

  async reject(id: string, motivo: string | undefined, userId: string) {
    const loan = await this.setStatus(id);
    if (loan.status !== 'PENDIENTE_APROBACION' && loan.status !== 'ACTIVO') {
      throw new BadRequestException(`Solo se rechazan solicitudes pendientes o activas (estado actual: ${loan.status})`);
    }
    const motivoFinal = motivo?.trim() || 'No cumple con los requisitos o expediente no disponible temporalmente';
    loan.status = 'RECHAZADO';
    loan.observations = `${loan.observations ? loan.observations + ' | ' : ''}RECHAZADO: ${motivoFinal}`;
    const saved = await this.repo.save(loan);

    // Enviar correo formal de rechazo con el motivo al solicitante de manera asíncrona
    if (saved.email) {
      void this.mailService.sendLoanRejectionEmail({
        id: saved.id,
        requester: saved.requester,
        email: saved.email,
        document: saved.document || saved.documentCode || 'Expediente Documental',
        motivoRechazo: motivoFinal,
        department: saved.department || undefined,
      }).catch((err) => {
        this.logger.error(`Error enviando correo de rechazo a ${saved.email}:`, err);
      });
    }

    await this.audit.log({
      userId,
      module: 'documental',
      action: 'loan.reject',
      entityType: 'doc_loans',
      entityId: id,
    });
    return saved;
  }

  async returnLoan(id: string, userId: string) {
    const loan = await this.setStatus(id);
    if (loan.status !== 'ACTIVO' && loan.status !== 'VENCIDO') {
      throw new BadRequestException(`Solo se devuelven préstamos activos o vencidos (estado actual: ${loan.status})`);
    }
    loan.status = 'DEVUELTO';
    loan.realReturnDate = new Date().toISOString().slice(0, 10);
    const saved = await this.repo.save(loan);

    if (saved.email) {
      void this.mailService.sendLoanReturnEmail({
        id: saved.id,
        requester: saved.requester,
        email: saved.email,
        document: saved.document || saved.documentCode || 'Expediente Documental',
        returnDate: saved.realReturnDate || undefined,
        department: saved.department || undefined,
      }).catch((err) => {
        this.logger.error(`Error enviando correo de devolución a ${saved.email}:`, err);
      });
    }

    await this.audit.log({
      userId,
      module: 'documental',
      action: 'loan.return',
      entityType: 'doc_loans',
      entityId: id,
    });
    return saved;
  }

  /** Permite al administrador reenviar manualmente la notificación por correo al solicitante. */
  async sendOverdueEmailManual(id: string, userId: string) {
    const loan = await this.setStatus(id);
    if (!loan.email) {
      throw new BadRequestException('Este préstamo no tiene registrado un correo electrónico.');
    }

    const success = await this.mailService.sendOverdueReminder({
      id: loan.id,
      requester: loan.requester,
      email: loan.email,
      document: loan.document || loan.documentCode || 'Expediente Documental',
      returnDate: loan.returnDate ? String(loan.returnDate).slice(0, 10) : 'Fecha no especificada',
      department: loan.department || undefined,
    });

    loan.overdueNotifiedAt = new Date();
    await this.repo.save(loan);

    await this.audit.log({
      userId,
      module: 'documental',
      action: 'loan.send_email_reminder',
      entityType: 'doc_loans',
      entityId: id,
    });

    return { success, message: `Correo de recordatorio enviado a ${loan.email}` };
  }

  async testDirectEmail() {
    return this.mailService.sendLoanApprovalEmail({
      id: 'test-direct-id',
      requester: 'Jhon Fredy Direct Test',
      email: 'documental@corazaseguridadcta.com',
      document: 'Expediente Test Directo #001',
      loanDate: new Date().toISOString().slice(0, 10),
      returnDate: '2026-08-31',
      department: 'Gestion Documental',
    });
  }
}
