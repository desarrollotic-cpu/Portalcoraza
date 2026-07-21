import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('diagnosticos_cie10')
export class DiagnosisCie10 {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  codigo!: string;

  @Column({ type: 'text' })
  descripcion!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
