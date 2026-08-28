import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SstResponse } from './sst-response.entity';

@Entity('sst_evidences')
export class SstEvidence {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'response_id', type: 'uuid' })
  responseId!: string;

  @ManyToOne(() => SstResponse, (r) => r.evidencias, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'response_id' })
  response!: SstResponse;

  @Column({ name: 'url_archivo', type: 'text' })
  urlArchivo!: string;

  @Column({ type: 'text', nullable: true })
  descripcion!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
