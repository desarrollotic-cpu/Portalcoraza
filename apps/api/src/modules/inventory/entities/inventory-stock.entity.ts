import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { InventoryVariant } from './inventory-variant.entity';
import { InventoryWarehouse } from './inventory-warehouse.entity';

@Entity('inventory_stock')
@Unique(['variantId', 'warehouseId'])
export class InventoryStock {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'variant_id', type: 'uuid' })
  variantId!: string;

  @ManyToOne(() => InventoryVariant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'variant_id' })
  variant!: InventoryVariant;

  @Column({ name: 'warehouse_id', type: 'uuid' })
  warehouseId!: string;

  @ManyToOne(() => InventoryWarehouse, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'warehouse_id' })
  warehouse!: InventoryWarehouse;

  @Column({ type: 'int', default: 0 })
  quantity!: number;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
