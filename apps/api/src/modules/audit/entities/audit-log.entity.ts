import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId!: string | null;

  @Column({ length: 50 })
  module!: string;

  @Column({ length: 80 })
  action!: string;

  @Column({ name: 'entity_type', nullable: true, length: 80 })
  entityType!: string | null;

  @Column({ name: 'entity_id', type: 'uuid', nullable: true })
  entityId!: string | null;

  @Column({ name: 'old_value', type: 'jsonb', nullable: true })
  oldValue!: Record<string, unknown> | null;

  @Column({ name: 'new_value', type: 'jsonb', nullable: true })
  newValue!: Record<string, unknown> | null;

  @Column({ name: 'ip_address', nullable: true, length: 45 })
  ipAddress!: string | null;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
