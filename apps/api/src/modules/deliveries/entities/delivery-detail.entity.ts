import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { InventoryVariant } from '../../inventory/entities/inventory-variant.entity';
import { Delivery } from './delivery.entity';

@Entity('delivery_details')
export class DeliveryDetail {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'delivery_id', type: 'uuid' })
  deliveryId!: string;

  @ManyToOne(() => Delivery, (d) => d.details, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'delivery_id' })
  delivery!: Delivery;

  @Column({ name: 'variant_id', type: 'uuid' })
  variantId!: string;

  @ManyToOne(() => InventoryVariant, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'variant_id' })
  variant!: InventoryVariant;

  @Column({ type: 'int' })
  quantity!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
