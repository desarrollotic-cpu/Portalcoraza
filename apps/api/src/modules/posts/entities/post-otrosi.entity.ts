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

@Entity('post_otrosi')
export class PostOtrosi {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'post_id', type: 'uuid' })
  postId!: string;

  @ManyToOne(() => Post, (post) => post.otrosi, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'post_id' })
  post!: Post;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  @Column({ type: 'varchar', nullable: true, length: 80 })
  number!: string | null;

  @Column({ name: 'type_text', type: 'varchar', nullable: true, length: 200 })
  typeText!: string | null;

  @Column({ name: 'date_text', type: 'varchar', nullable: true, length: 80 })
  dateText!: string | null;

  @Column({ type: 'varchar', nullable: true, length: 80 })
  term!: string | null;

  @Column({ name: 'date_end', type: 'varchar', nullable: true, length: 80 })
  dateEnd!: string | null;

  @Column({ name: 'invoice_value', type: 'varchar', nullable: true, length: 80 })
  invoiceValue!: string | null;

  @Column({ name: 'service_type', type: 'varchar', nullable: true, length: 80 })
  serviceType!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
