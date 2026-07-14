import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { InventoryVariant } from './inventory-variant.entity';

export enum InventoryMovementType {
  IN = 'IN',
  OUT = 'OUT',
  ADJ = 'ADJ',
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

  @Column({ name: 'movement_type', type: 'varchar', length: 10 })
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

  @Column({ name: 'performed_by', type: 'uuid', nullable: true })
  performedBy!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
