import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Post } from './post.entity';

@Entity('post_contracts')
export class PostContract {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'post_id', type: 'uuid' })
  postId!: string;

  @ManyToOne(() => Post, (post) => post.contracts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'post_id' })
  post!: Post;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  @Column({ name: 'contract_number', type: 'varchar', nullable: true, length: 80 })
  contractNumber!: string | null;

  @Column({ name: 'contract_start', type: 'varchar', nullable: true, length: 80 })
  contractStart!: string | null;

  @Column({ name: 'contract_term', type: 'varchar', nullable: true, length: 80 })
  contractTerm!: string | null;

  @Column({ name: 'contract_end', type: 'varchar', nullable: true, length: 80 })
  contractEnd!: string | null;

  @Column({ type: 'varchar', nullable: true, length: 20 })
  basc!: string | null;

  @Column({ name: 'service_type', type: 'varchar', nullable: true, length: 80 })
  serviceType!: string | null;

  @Column({ name: 'invoice_value', type: 'varchar', nullable: true, length: 80 })
  invoiceValue!: string | null;

  @Column({ type: 'boolean', default: false })
  armed!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
