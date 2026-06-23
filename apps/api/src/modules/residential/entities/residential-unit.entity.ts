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

export enum ReservationApprovalMode {
  MANUAL = 'manual_approval',
  AUTO = 'auto_approval',
}

@Entity('residential_units')
export class ResidentialUnit {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'post_id', type: 'uuid' })
  postId!: string;

  @ManyToOne(() => Post, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'post_id' })
  post!: Post;

  @Column({ type: 'varchar', length: 40, nullable: true })
  block!: string | null;

  @Column({ type: 'varchar', length: 40 })
  number!: string;

  @Column({ name: 'area_m2', type: 'numeric', precision: 10, scale: 2, nullable: true })
  areaM2!: string | null;

  @Column({
    name: 'reservation_approval_mode',
    type: 'enum',
    enum: ReservationApprovalMode,
    enumName: 'reservation_approval_mode',
    default: ReservationApprovalMode.MANUAL,
  })
  reservationApprovalMode!: ReservationApprovalMode;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
