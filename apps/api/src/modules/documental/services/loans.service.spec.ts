import { BadRequestException } from '@nestjs/common';
import { LoansService } from './loans.service';

jest.mock('./email-mailbox.check', () => ({
  emailDomainReceivesMail: jest.fn(async () => null),
}));

describe('LoansService state machine', () => {
  function svcWithLoan(status: string) {
    const loan = { id: '1', status, observations: '', loanDate: null as string | null, realReturnDate: null as string | null };
    const repo = {
      findOne: jest.fn(async () => ({ ...loan })),
      save: jest.fn(async (l: typeof loan) => l),
      createQueryBuilder: jest.fn(),
    };
    const audit = { log: jest.fn(async () => undefined) };
    const mailService = {
      sendLoanApprovalEmail: jest.fn(async () => ({ ok: true, via: 'smtp', error: null, subject: 'ok', to: 'a@b.com' })),
      sendLoanRejectionEmail: jest.fn(async () => ({ ok: true, via: 'smtp', error: null, subject: 'ok', to: 'a@b.com' })),
      sendLoanReturnEmail: jest.fn(async () => ({ ok: true, via: 'smtp', error: null, subject: 'ok', to: 'a@b.com' })),
      sendNewLoanRequestToArchive: jest.fn(async () => ({ ok: true, via: 'smtp', error: null, subject: 'ok', to: 'a@b.com' })),
    };
    const mailLogRepo = { save: jest.fn(async (x: unknown) => x), create: (x: unknown) => x, find: jest.fn() };
    return { service: new LoansService(repo as never, mailLogRepo as never, audit as never, mailService as never), repo, loan };
  }

  it('rejects approve when not pending', async () => {
    const { service } = svcWithLoan('ACTIVO');
    await expect(service.approve('1', 'u')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects return when not active/vencido', async () => {
    const { service } = svcWithLoan('RECHAZADO');
    await expect(service.returnLoan('1', 'u')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('approves pending request', async () => {
    const { service, repo } = svcWithLoan('PENDIENTE_APROBACION');
    const saved = await service.approve('1', 'u');
    expect(saved.status).toBe('ACTIVO');
    expect(repo.save).toHaveBeenCalled();
  });

  it('publicRequest arma ficha de personal retirado (nombres, apellidos, cédula)', async () => {
    const repo = {
      save: jest.fn(async (row: Record<string, unknown>) => ({ id: 'loan-1', ...row })),
      create: (row: Record<string, unknown>) => row,
    };
    const mailService = {
      sendNewLoanRequestToArchive: jest.fn(async () => ({
        ok: true,
        via: 'smtp',
        error: null,
        subject: 'ok',
        to: 'documental@corazaseguridadcta.com',
      })),
    };
    const mailLogRepo = { save: jest.fn(async (x: unknown) => x), create: (x: unknown) => x };
    const service = new LoansService(
      repo as never,
      mailLogRepo as never,
      { log: jest.fn() } as never,
      mailService as never,
    );
    const res = await service.publicRequest({
      tipo: 'PERSONAL_RETIRADO',
      nombre: 'Ana Ruiz',
      cedula: '10101010',
      departamento: 'GESTION_HUMANA',
      email: 'ana@corazaseguridadcta.com',
      fechaDevolucion: '2026-09-20',
      motivo: 'Consulta de hoja de vida para proceso laboral',
      nombresRetirado: 'Carlos Andres',
      apellidosRetirado: 'Perez Gomez',
      cedulaRetirado: '1.098.765.432',
      carpeta: 'HV-44',
    });
    expect(res.id).toBe('loan-1');
    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        document: expect.stringMatching(/Personal retirado: Carlos Andres Perez Gomez — CC 1098765432/),
        documentCode: 'HV-44',
        observations: expect.stringContaining('Cédula del expediente: 1098765432'),
      }),
    );
  });
});
