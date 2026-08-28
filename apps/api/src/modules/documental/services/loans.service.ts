import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditService } from '../../audit/audit.service';
import { CreateLoanDto } from '../dto/create-loan.dto';
import { PublicLoanRequestDto } from '../dto/public-loan-request.dto';
import { Loan } from '../entities/loan.entity';
import { DocumentalMailService } from './documental-mail.service';

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
   * Marca como VENCIDO los préstamos ACTIVOS cuya fecha de devolución ya pasó
   * y envía automáticamente el correo de recordatorio a los que no han sido notificados.
   */
  private async autoExpire(): Promise<void> {
    // 1. Actualizar estado a VENCIDO
    await this.repo
      .createQueryBuilder()
      .update(Loan)
      .set({ status: 'VENCIDO' })
      .where('status = :active AND return_date < CURRENT_DATE', { active: 'ACTIVO' })
      .execute();

    // 2. Buscar préstamos vencidos que tengan correo y aún no hayan sido notificados
    const pendingNotifications = await this.repo
      .createQueryBuilder('l')
      .where("(l.status = 'VENCIDO' OR (l.status = 'ACTIVO' AND l.return_date < CURRENT_DATE))")
      .andWhere('l.email IS NOT NULL')
      .andWhere("l.email != ''")
      .andWhere('l.overdue_notified_at IS NULL')
      .getMany();

    for (const loan of pendingNotifications) {
      if (loan.email) {
        await this.mailService.sendOverdueReminder({
          id: loan.id,
          requester: loan.requester,
          email: loan.email,
          document: loan.document || loan.documentCode || 'Expediente Documental',
          returnDate: loan.returnDate ? String(loan.returnDate).slice(0, 10) : 'Fecha no especificada',
          department: loan.department || undefined,
        });
        loan.overdueNotifiedAt = new Date();
        await this.repo.save(loan);
      }
    }
  }

  async list() {
    await this.autoExpire();
    return this.repo.find({ order: { loanDate: 'DESC' } });
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

  /** Endpoint público: crea solicitud PENDIENTE_APROBACION con correo de notificación. */
  async publicRequest(dto: PublicLoanRequestDto) {
    const saved = await this.repo.save(
      this.repo.create({
        requester: `${dto.nombre} (CC: ${dto.cedula})`,
        department: dto.departamento ?? null,
        document: dto.documento ?? null,
        email: dto.email ?? null,
        loanDate: new Date().toISOString().slice(0, 10),
        returnDate: dto.fechaDevolucion ?? null,
        observations: `SOLICITUD PUBLICA: ${dto.motivo ?? ''}`,
        status: 'PENDIENTE_APROBACION',
      }),
    );
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

    // Enviar correo formal de confirmación de aprobación al solicitante
    if (saved.email) {
      await this.mailService.sendLoanApprovalEmail({
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

    // Enviar correo formal de rechazo con el motivo al solicitante
    if (saved.email) {
      await this.mailService.sendLoanRejectionEmail({
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
}
