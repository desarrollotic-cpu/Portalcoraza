import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('vigia_minutas')
export class VigiaMinuta {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text' })
  tipo!: string;

  @Column({ name: 'post_id', type: 'uuid' })
  postId!: string;

  @Column({ name: 'nombre_puesto', type: 'text', nullable: true })
  nombrePuesto!: string | null;

  @Column({ name: 'associate_id', type: 'uuid', nullable: true })
  associateId!: string | null;

  @Column({ name: 'turno_id', type: 'uuid', nullable: true })
  turnoId!: string | null;

  @Column({ type: 'jsonb', default: {} })
  payload!: Record<string, unknown>;

  @Column({ name: 'entrada_at', type: 'timestamptz' })
  entradaAt!: Date;

  @Column({ name: 'salida_at', type: 'timestamptz', nullable: true })
  salidaAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
