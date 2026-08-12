import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('vigia_nomina')
export class VigiaNomina {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'associate_id', type: 'uuid' })
  associateId!: string;

  @Column({ type: 'text' })
  periodo!: string;

  @Column({ name: 'horas_ordinarias', type: 'numeric', default: 0 })
  horasOrdinarias!: string;

  @Column({ name: 'horas_extra', type: 'numeric', default: 0 })
  horasExtra!: string;

  @Column({ name: 'recargo_nocturno', type: 'numeric', default: 0 })
  recargoNocturno!: string;

  @Column({ name: 'recargo_festivo', type: 'numeric', default: 0 })
  recargoFestivo!: string;

  @Column({ type: 'numeric', default: 0 })
  neto!: string;

  @Column({ name: 'pdf_url', type: 'text', nullable: true })
  pdfUrl!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}

@Entity('vigia_nomina_reclamos')
export class VigiaNominaReclamo {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'associate_id', type: 'uuid' })
  associateId!: string;

  @Column({ type: 'text' })
  periodo!: string;

  @Column({ type: 'text' })
  motivo!: string;

  @Column({ type: 'text' })
  detalle!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}

@Entity('vigia_dotacion_firmas')
export class VigiaDotacionFirma {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'associate_id', type: 'uuid' })
  associateId!: string;

  @Column({ type: 'text' })
  items!: string;

  @Column({ name: 'firma_base64', type: 'text' })
  firmaBase64!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
