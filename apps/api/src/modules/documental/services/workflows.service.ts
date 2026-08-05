import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditService } from '../../audit/audit.service';
import { ResolveWorkflowDto } from '../dto/resolve-workflow.dto';
import { Workflow } from '../entities/workflow.entity';

@Injectable()
export class WorkflowsService {
  constructor(
    @InjectRepository(Workflow)
    private readonly repo: Repository<Workflow>,
    private readonly audit: AuditService,
  ) {}

  pending() {
    return this.repo.find({ where: { status: 'PENDIENTE' }, order: { createdAt: 'DESC' } });
  }

  async resolve(dto: ResolveWorkflowDto, userId: string) {
    const wf = await this.repo.findOne({ where: { id: dto.id } });
    if (!wf) {
      throw new NotFoundException('Workflow no encontrado');
    }
    if (wf.status !== 'PENDIENTE') {
      throw new BadRequestException(`El workflow ya está resuelto (estado: ${wf.status})`);
    }
    wf.status = dto.decision === 'APROBAR' ? 'APROBADO' : 'RECHAZADO';
    wf.approvalComments = dto.comment ?? '';
    const saved = await this.repo.save(wf);

    await this.audit.log({
      userId,
      module: 'documental',
      action: 'workflow.resolve',
      entityType: 'doc_workflows',
      entityId: wf.id,
      newValue: { status: saved.status } as Record<string, unknown>,
    });

    return saved;
  }
}
