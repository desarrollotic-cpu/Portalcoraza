import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('vigia_consignas')
export class VigiaConsigna {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'post_id', type: 'uuid' })
  postId!: string;

  @Column({ type: 'text' })
  tipo!: 'CONTACTS' | 'RULES';

  @Column({ type: 'text' })
  titulo!: string;

  @Column({ type: 'text', nullable: true })
  detalle!: string | null;

  @Column({ type: 'text', nullable: true })
  telefono!: string | null;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  @Column({ type: 'boolean', default: true })
  activo!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
