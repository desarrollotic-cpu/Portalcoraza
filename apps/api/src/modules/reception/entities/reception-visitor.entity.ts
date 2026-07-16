import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ReceptionSex {
  M = 'M',
  F = 'F',
  OTRO = 'OTRO',
  NO_DECLARA = 'NO_DECLARA',
}

export enum ReceptionTransport {
  MOTO = 'MOTO',
  CARRO = 'CARRO',
  TRANSPORTE_PUBLICO = 'TRANSPORTE_PUBLICO',
  OTRO = 'OTRO',
  NINGUNO = 'NINGUNO',
}

@Entity('reception_visitors')
export class ReceptionVisitor {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'document_number', type: 'varchar', length: 40, nullable: true })
  documentNumber!: string | null;

  @Column({ name: 'first_surname', type: 'varchar', length: 100, nullable: true })
  firstSurname!: string | null;

  @Column({ name: 'second_surname', type: 'varchar', length: 100, nullable: true })
  secondSurname!: string | null;

  @Column({ name: 'first_name', type: 'varchar', length: 100, nullable: true })
  firstName!: string | null;

  @Column({ name: 'second_name', type: 'varchar', length: 100, nullable: true })
  secondName!: string | null;

  @Column({ type: 'enum', enum: ReceptionSex, nullable: true })
  sex!: ReceptionSex | null;

  @Column({ name: 'birth_date', type: 'varchar', length: 40, nullable: true })
  birthDate!: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  arl!: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  eps!: string | null;

  @Column({ name: 'origin_place', type: 'varchar', length: 200, nullable: true })
  originPlace!: string | null;

  @Column({ name: 'visit_reason', type: 'text', nullable: true })
  visitReason!: string | null;

  @Column({ name: 'entry_at', type: 'timestamptz' })
  entryAt!: Date;

  @Column({ name: 'authorized_by', type: 'varchar', length: 200, nullable: true })
  authorizedBy!: string | null;

  @Column({ name: 'registered_by', type: 'uuid', nullable: true })
  registeredBy!: string | null;

  @Column({
    name: 'transport_means',
    type: 'enum',
    enum: ReceptionTransport,
    nullable: true,
  })
  transportMeans!: ReceptionTransport | null;

  @Column({ name: 'travel_time_minutes', type: 'int', nullable: true })
  travelTimeMinutes!: number | null;

  @Column({ name: 'exit_at', type: 'timestamptz', nullable: true })
  exitAt!: Date | null;

  @Column({ name: 'exit_notes', type: 'text', nullable: true })
  exitNotes!: string | null;

  @Column({ name: 'exited_by', type: 'uuid', nullable: true })
  exitedBy!: string | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
