import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CatalogValue } from '../../hr-catalogs/entities/catalog-value.entity';
import { JobPosition } from '../../hr-positions/entities/job-position.entity';
import { WorkCenter } from '../../hr-work-centers/entities/work-center.entity';

export enum AssociateStatus {
  ACTIVO = 'ACTIVO',
  INACTIVO = 'INACTIVO',
  SUSPENDIDO = 'SUSPENDIDO',
  VACACIONES = 'VACACIONES',
  RETIRADO = 'RETIRADO',
}

export enum AssociateDocumentType {
  CC = 'CC',
  CE = 'CE',
  PA = 'PA',
  PEP = 'PEP',
}

export enum AssociateSexAtBirth {
  MASCULINO = 'MASCULINO',
  FEMENINO = 'FEMENINO',
  OTRO = 'OTRO',
}

export enum AssociateMaritalStatus {
  SOLTERO = 'SOLTERO',
  CASADO = 'CASADO',
  UNION_LIBRE = 'UNION_LIBRE',
  DIVORCIADO = 'DIVORCIADO',
  VIUDO = 'VIUDO',
}

@Entity('associates')
@Index('uidx_associates_document', ['documentNumber'], { unique: true })
export class Associate {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // ─── Identidad ──────────────────────────────────────────────────────────
  @Column({ name: 'folder_number', type: 'integer', nullable: true })
  folderNumber!: number | null;

  @Column({ name: 'act_reference', type: 'varchar', length: 120, nullable: true })
  actReference!: string | null;

  @Column({
    name: 'document_type',
    type: 'enum',
    enum: AssociateDocumentType,
    enumName: 'associate_document_type',
    default: AssociateDocumentType.CC,
  })
  documentType!: AssociateDocumentType;

  @Column({ name: 'document_number', type: 'varchar', length: 30 })
  documentNumber!: string;

  @Column({ name: 'document_expedition_date', type: 'date', nullable: true })
  documentExpeditionDate!: string | null;

  @Column({ name: 'first_name', type: 'varchar', length: 80 })
  firstName!: string;

  @Column({ name: 'second_name', type: 'varchar', length: 80, nullable: true })
  secondName!: string | null;

  @Column({ name: 'first_last_name', type: 'varchar', length: 80 })
  firstLastName!: string;

  @Column({ name: 'second_last_name', type: 'varchar', length: 80, nullable: true })
  secondLastName!: string | null;

  @Column({ name: 'birth_date', type: 'date' })
  birthDate!: string;

  @Column({
    name: 'sex_at_birth',
    type: 'enum',
    enum: AssociateSexAtBirth,
    enumName: 'associate_sex_at_birth',
    nullable: true,
  })
  sexAtBirth!: AssociateSexAtBirth | null;

  @Column({
    name: 'marital_status',
    type: 'enum',
    enum: AssociateMaritalStatus,
    enumName: 'associate_marital_status',
    nullable: true,
  })
  maritalStatus!: AssociateMaritalStatus | null;

  // ─── Contacto ──────────────────────────────────────────────────────────
  @Column({ type: 'varchar', length: 200, nullable: true })
  email!: string | null;

  @Column({ type: 'text', nullable: true })
  address!: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  landline!: string | null;

  @Column({ type: 'varchar', length: 30 })
  mobile!: string;

  // ─── Contacto de emergencia ─────────────────────────────────────────────
  @Column({ name: 'emergency_contact_name', type: 'varchar', length: 150, nullable: true })
  emergencyContactName!: string | null;

  @Column({ name: 'emergency_contact_relationship', type: 'varchar', length: 80, nullable: true })
  emergencyContactRelationship!: string | null;

  @Column({ name: 'emergency_contact_phone', type: 'varchar', length: 30, nullable: true })
  emergencyContactPhone!: string | null;

  // ─── Laboral y contrato ─────────────────────────────────────────────────
  @Column({ name: 'hire_date', type: 'date' })
  hireDate!: string;

  @Column({ name: 'job_position_id', type: 'uuid', nullable: true })
  jobPositionId!: string | null;

  @ManyToOne(() => JobPosition, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'job_position_id' })
  jobPosition!: JobPosition | null;

  @Column({ name: 'work_center_id', type: 'uuid', nullable: true })
  workCenterId!: string | null;

  @ManyToOne(() => WorkCenter, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'work_center_id' })
  workCenter!: WorkCenter | null;

  @Column({
    name: 'ordinary_compensation',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: {
      to: (v: number) => v,
      from: (v: string | null) => (v === null ? 0 : parseFloat(v)),
    },
  })
  ordinaryCompensation!: number;

  @Column({
    name: 'average_monthly_salary',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: {
      to: (v: number) => v,
      from: (v: string | null) => (v === null ? 0 : parseFloat(v)),
    },
  })
  averageMonthlySalary!: number;

  @Column({ name: 'bank_account', type: 'varchar', length: 80, nullable: true })
  bankAccount!: string | null;

  // ─── Salud ocupacional y vigilancia ─────────────────────────────────────
  @Column({ name: 'psychophysical_valid', type: 'boolean', default: false })
  psychophysicalValid!: boolean;

  @Column({ name: 'psychosensometric_valid', type: 'boolean', default: false })
  psychosensometricValid!: boolean;

  @Column({ name: 'course_code', type: 'varchar', length: 80, nullable: true })
  courseCode!: string | null;

  @Column({ name: 'school_nit', type: 'varchar', length: 50, nullable: true })
  schoolNit!: string | null;

  @Column({ name: 'course_certificate_number', type: 'varchar', length: 80, nullable: true })
  courseCertificateNumber!: string | null;

  @Column({ name: 'has_sura_policy', type: 'boolean', default: false })
  hasSuraPolicy!: boolean;

  @Column({ name: 'funeral_service', type: 'varchar', length: 120, nullable: true })
  funeralService!: string | null;

  // ─── Sociodemográfico ───────────────────────────────────────────────────
  @Column({ name: 'children_count', type: 'integer', default: 0 })
  childrenCount!: number;

  @Column({ name: 'dependents_count', type: 'integer', default: 0 })
  dependentsCount!: number;

  @Column({ type: 'smallint', nullable: true })
  estrato!: number | null;

  @Column({ name: 'life_plan', type: 'text', nullable: true })
  lifePlan!: string | null;

  // ─── Relaciones a catálogos maestros ────────────────────────────────────
  @Column({ name: 'eps_id', type: 'uuid', nullable: true })
  epsId!: string | null;

  @ManyToOne(() => CatalogValue, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'eps_id' })
  eps!: CatalogValue | null;

  @Column({ name: 'pension_fund_id', type: 'uuid', nullable: true })
  pensionFundId!: string | null;

  @ManyToOne(() => CatalogValue, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'pension_fund_id' })
  pensionFund!: CatalogValue | null;

  @Column({ name: 'blood_type_id', type: 'uuid', nullable: true })
  bloodTypeId!: string | null;

  @ManyToOne(() => CatalogValue, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'blood_type_id' })
  bloodType!: CatalogValue | null;

  @Column({ name: 'gender_id', type: 'uuid', nullable: true })
  genderId!: string | null;

  @ManyToOne(() => CatalogValue, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'gender_id' })
  gender!: CatalogValue | null;

  // Datos sensibles Ley 1581 (raza, religión, orientación sexual)
  @Column({ name: 'sexual_orientation_id', type: 'uuid', nullable: true })
  sexualOrientationId!: string | null;

  @ManyToOne(() => CatalogValue, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'sexual_orientation_id' })
  sexualOrientation!: CatalogValue | null;

  @Column({ name: 'religion_id', type: 'uuid', nullable: true })
  religionId!: string | null;

  @ManyToOne(() => CatalogValue, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'religion_id' })
  religion!: CatalogValue | null;

  @Column({ name: 'race_id', type: 'uuid', nullable: true })
  raceId!: string | null;

  @ManyToOne(() => CatalogValue, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'race_id' })
  race!: CatalogValue | null;

  @Column({ name: 'housing_type_id', type: 'uuid', nullable: true })
  housingTypeId!: string | null;

  @ManyToOne(() => CatalogValue, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'housing_type_id' })
  housingType!: CatalogValue | null;

  @Column({ name: 'education_level_id', type: 'uuid', nullable: true })
  educationLevelId!: string | null;

  @ManyToOne(() => CatalogValue, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'education_level_id' })
  educationLevel!: CatalogValue | null;

  @Column({ name: 'income_range_id', type: 'uuid', nullable: true })
  incomeRangeId!: string | null;

  @ManyToOne(() => CatalogValue, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'income_range_id' })
  incomeRange!: CatalogValue | null;

  @Column({ name: 'transport_mean_id', type: 'uuid', nullable: true })
  transportMeanId!: string | null;

  @ManyToOne(() => CatalogValue, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'transport_mean_id' })
  transportMean!: CatalogValue | null;

  @Column({ name: 'commute_time_id', type: 'uuid', nullable: true })
  commuteTimeId!: string | null;

  @ManyToOne(() => CatalogValue, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'commute_time_id' })
  commuteTime!: CatalogValue | null;

  // ─── Estado y auditoría ─────────────────────────────────────────────────
  @Column({
    type: 'enum',
    enum: AssociateStatus,
    enumName: 'associate_status',
    default: AssociateStatus.ACTIVO,
  })
  status!: AssociateStatus;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy!: string | null;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
