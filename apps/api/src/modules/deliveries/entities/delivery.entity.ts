import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Associate } from '../../associates/entities/associate.entity';
import { DeliveryDetail } from './delivery-detail.entity';

export enum DeliveryStatus {
  PENDING = 'PENDING',
  DELIVERED = 'DELIVERED',
  REVERTED = 'REVERTED',
}

@Entity('deliveries')
export class Delivery {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'associate_id', type: 'uuid', nullable: true })
  associateId!: string | null;

  @ManyToOne(() => Associate, { nullable: true })
  @JoinColumn({ name: 'associate_id' })
  associate?: Associate | null;

  @Column({ name: 'post_id', type: 'uuid', nullable: true })
  postId!: string | null;

  @Column({ type: 'text', nullable: true })
  observations!: string | null;

  @Column({ type: 'varchar', length: 20, default: DeliveryStatus.PENDING })
  status!: DeliveryStatus;

  @Column({ name: 'signature_url', type: 'text', nullable: true })
  signatureUrl!: string | null;

  @Column({ name: 'is_immutable', type: 'boolean', default: false })
  isImmutable!: boolean;

  @Column({ name: 'delivered_at', type: 'timestamptz', nullable: true })
  deliveredAt!: Date | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy!: string | null;

  @Column({ name: 'reverted_at', type: 'timestamptz', nullable: true })
  revertedAt!: Date | null;

  @Column({ name: 'reverted_by', type: 'uuid', nullable: true })
  revertedBy!: string | null;

  @Column({ name: 'revert_reason', type: 'text', nullable: true })
  revertReason!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => DeliveryDetail, (d) => d.delivery)
  details!: DeliveryDetail[];
}
