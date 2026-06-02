import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum PostStatus {
  ACTIVO = 'ACTIVO',
  INACTIVO = 'INACTIVO',
}

export enum PostType {
  UNIDAD_RESIDENCIAL = 'UNIDAD_RESIDENCIAL',
  HOSPITAL = 'HOSPITAL',
  UNIVERSIDAD = 'UNIVERSIDAD',
  OBRA = 'OBRA',
  SERVICIO_ESPECIAL = 'SERVICIO_ESPECIAL',
}

@Entity('posts')
export class Post {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true, length: 50 })
  code!: string;

  @Column({ length: 200 })
  name!: string;

  @Column({
    type: 'enum',
    enum: PostType,
    default: PostType.SERVICIO_ESPECIAL,
  })
  type!: PostType;

  @Column({
    type: 'enum',
    enum: PostStatus,
    default: PostStatus.ACTIVO,
  })
  status!: PostStatus;

  @Column({ type: 'text', nullable: true })
  address!: string | null;

  @Column({ name: 'client_name', type: 'varchar', nullable: true, length: 200 })
  clientName!: string | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
