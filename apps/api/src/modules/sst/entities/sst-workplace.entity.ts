import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Post } from '../../posts/entities/post.entity';
import { SstClient } from './sst-client.entity';

export enum SstWorkplaceType {
  PORTERIA = 'PORTERIA',
  RECEPCION = 'RECEPCION',
  PERIMETRO = 'PERIMETRO',
  CCTV = 'CCTV',
  MOVIL = 'MOVIL',
  ALTURAS = 'ALTURAS',
  OTRO = 'OTRO',
}

@Entity('sst_workplaces')
export class SstWorkplace {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'client_id', type: 'uuid' })
  clientId!: string;

  @ManyToOne(() => SstClient, (c) => c.workplaces, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_id' })
  client!: SstClient;

  @Column({ name: 'post_id', type: 'uuid', nullable: true })
  postId!: string | null;

  @ManyToOne(() => Post, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'post_id' })
  post!: Post | null;

  @Column({ type: 'text' })
  nombre!: string;

  @Column({ type: 'text', nullable: true })
  direccion!: string | null;

  @Column({ type: 'text', default: 'Medellín' })
  ciudad!: string;

  @Column({
    name: 'tipo_puesto',
    type: 'enum',
    enum: SstWorkplaceType,
    default: SstWorkplaceType.OTRO,
  })
  tipoPuesto!: SstWorkplaceType;

  @Column({ type: 'boolean', default: true })
  activo!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
