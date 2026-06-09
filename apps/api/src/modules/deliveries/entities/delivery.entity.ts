import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DeliveryDetail } from './delivery-detail.entity';

export enum DeliveryStatus {
  PENDING = 'PENDING',
  DELIVERED = 'DELIVERED',
}

@Entity('deliveries')
export class Delivery {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'associate_id', type: 'uuid' })
  associateId!: string;

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

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => DeliveryDetail, (d) => d.delivery)
  details!: DeliveryDetail[];
}
