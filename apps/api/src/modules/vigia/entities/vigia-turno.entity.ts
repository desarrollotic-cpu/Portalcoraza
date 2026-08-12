import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Associate } from '../../associates/entities/associate.entity';
import { Post } from '../../posts/entities/post.entity';

@Entity('vigia_turnos')
export class VigiaTurno {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'associate_id', type: 'uuid' })
  associateId!: string;

  @ManyToOne(() => Associate)
  @JoinColumn({ name: 'associate_id' })
  associate!: Associate;

  @Column({ name: 'post_id', type: 'uuid' })
  postId!: string;

  @ManyToOne(() => Post)
  @JoinColumn({ name: 'post_id' })
  post!: Post;

  @Column({ name: 'started_at', type: 'timestamptz' })
  startedAt!: Date;

  @Column({ name: 'closed_at', type: 'timestamptz', nullable: true })
  closedAt!: Date | null;

  @Column({ name: 'relevo_nombre', type: 'text', nullable: true })
  relevoNombre!: string | null;

  @Column({ name: 'relevo_foto_base64', type: 'text', nullable: true })
  relevoFotoBase64!: string | null;

  @Column({ type: 'text', default: 'ABIERTO' })
  estado!: 'ABIERTO' | 'CERRADO';

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
