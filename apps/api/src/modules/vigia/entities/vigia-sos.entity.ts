import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('vigia_sos')
export class VigiaSos {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'associate_id', type: 'uuid' })
  associateId!: string;

  @Column({ name: 'turno_id', type: 'uuid', nullable: true })
  turnoId!: string | null;

  @Column({ name: 'post_id', type: 'uuid', nullable: true })
  postId!: string | null;

  @Column({ type: 'double precision', nullable: true })
  lat!: number | null;

  @Column({ type: 'double precision', nullable: true })
  lng!: number | null;

  @Column({ type: 'text', default: 'Pánico manual' })
  motivo!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
