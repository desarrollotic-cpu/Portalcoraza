import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('doc_workflows')
export class Workflow {
  @PrimaryGeneratedColumn('uuid')
  id!: string;
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'workflow_type', type: 'varchar', length: 120, nullable: true })
  workflowType!: string | null;

  @Column({ name: 'document_id', type: 'uuid', nullable: true })
  documentId!: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  requester!: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  approver!: string | null;

  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate!: string | null;

  @Column({ type: 'varchar', length: 30, default: 'PENDIENTE' })
  status!: string;

  @Column({ type: 'text', nullable: true })
  comments!: string | null;

  @Column({ name: 'approval_comments', type: 'text', nullable: true })
  approvalComments!: string | null;

  @Column({ name: 'sla_days', type: 'int', nullable: true })
  slaDays!: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
