import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity('puc_accounts')
export class PucAccount {
  @PrimaryColumn({ length: 10 })
  code!: string;

  @Column({ length: 150 })
  name!: string;

  @Column({ length: 20 })
  type!: 'ACTIVO' | 'PASIVO' | 'PATRIMONIO' | 'INGRESO' | 'GASTO' | 'COSTO';

  @Column({ type: 'int' })
  level!: number;

  @Column({ name: 'allows_movement', default: true })
  allowsMovement!: boolean;

  @Column({ name: 'parent_code', nullable: true, length: 10 })
  parentCode!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
