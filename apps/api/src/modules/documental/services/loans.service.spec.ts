import { BadRequestException } from '@nestjs/common';
import { LoansService } from './loans.service';

describe('LoansService state machine', () => {
  function svcWithLoan(status: string) {
    const loan = { id: '1', status, observations: '', loanDate: null as string | null, realReturnDate: null as string | null };
    const repo = {
      findOne: jest.fn(async () => ({ ...loan })),
      save: jest.fn(async (l: typeof loan) => l),
      createQueryBuilder: jest.fn(),
    };
    const audit = { log: jest.fn(async () => undefined) };
    return { service: new LoansService(repo as never, audit as never), repo, loan };
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
});
