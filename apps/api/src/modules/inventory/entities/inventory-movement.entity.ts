import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { InventoryVariant } from './inventory-variant.entity';
import { InventoryWarehouse } from './inventory-warehouse.entity';

export enum InventoryMovementType {
  IN = 'IN',
  OUT = 'OUT',
  ADJ = 'ADJ',
  TRANSFER = 'TRANSFER',
}

@Entity('inventory_movements')
export class InventoryMovement {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'variant_id', type: 'uuid' })
  variantId!: string;

  @ManyToOne(() => InventoryVariant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'variant_id' })
  variant!: InventoryVariant;

  @Column({ name: 'movement_type', type: 'varchar', length: 12 })
  movementType!: InventoryMovementType;

  @Column({ type: 'int' })
  quantity!: number;

  /** Texto legado / resumen (motivo + observaciones). */
  @Column({ type: 'text', nullable: true })
  reason!: string | null;

  /** Motivo estructurado: Compra, Devolución, Donación, etc. */
  @Column({ name: 'entry_reason', type: 'varchar', length: 80, nullable: true })
  entryReason!: string | null;

  @Column({ type: 'text', nullable: true })
  observations!: string | null;

  @Column({ type: 'varchar', nullable: true, length: 120 })
  reference!: string | null;

  @Column({ name: 'warehouse_id', type: 'uuid', nullable: true })
  warehouseId!: string | null;

  @ManyToOne(() => InventoryWarehouse, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'warehouse_id' })
  warehouse?: InventoryWarehouse | null;

  @Column({ name: 'dest_warehouse_id', type: 'uuid', nullable: true })
  destWarehouseId!: string | null;

  @ManyToOne(() => InventoryWarehouse, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'dest_warehouse_id' })
  destWarehouse?: InventoryWarehouse | null;

  @Column({ name: 'performed_by', type: 'uuid', nullable: true })
  performedBy!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
