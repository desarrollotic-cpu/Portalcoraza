import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  AssociateDocumentType,
  AssociateMaritalStatus,
  AssociateSexAtBirth,
  AssociateStatus,
} from '../entities/associate.entity';

export class CreateAssociateDto {
  // ─── Identidad ────────────────────────────────────────────────────────
  @IsOptional() @IsInt() @Min(0)
  folderNumber?: number | null;

  @IsOptional() @IsString() @MaxLength(120)
  actReference?: string | null;

  @IsEnum(AssociateDocumentType)
  documentType!: AssociateDocumentType;

  @IsString() @Length(4, 30)
  documentNumber!: string;

  @IsOptional() @IsDateString()
  documentExpeditionDate?: string | null;

  @IsString() @Length(1, 80)
  firstName!: string;

  @IsOptional() @IsString() @MaxLength(80)
  secondName?: string | null;

  @IsString() @Length(1, 80)
  firstLastName!: string;

  @IsOptional() @IsString() @MaxLength(80)
  secondLastName?: string | null;

  @IsDateString()
  birthDate!: string;

  @IsOptional() @IsEnum(AssociateSexAtBirth)
  sexAtBirth?: AssociateSexAtBirth | null;

  @IsOptional() @IsEnum(AssociateMaritalStatus)
  maritalStatus?: AssociateMaritalStatus | null;

  // ─── Contacto ─────────────────────────────────────────────────────────
  @IsOptional() @IsString() @MaxLength(200)
  email?: string | null;

  @IsOptional() @IsString()
  address?: string | null;

  @IsOptional() @IsString() @MaxLength(30)
  landline?: string | null;

  @IsString() @Length(4, 30)
  mobile!: string;

  // ─── Emergencia ───────────────────────────────────────────────────────
  @IsOptional() @IsString() @MaxLength(150)
  emergencyContactName?: string | null;

  @IsOptional() @IsString() @MaxLength(80)
  emergencyContactRelationship?: string | null;

  @IsOptional() @IsString() @MaxLength(30)
  emergencyContactPhone?: string | null;

  // ─── Laboral ──────────────────────────────────────────────────────────
  @IsDateString()
  hireDate!: string;

  @IsOptional() @IsUUID()
  jobPositionId?: string | null;

  @IsOptional() @IsUUID()
  workCenterId?: string | null;

  @IsOptional() @IsNumber() @Min(0)
  ordinaryCompensation?: number;

  @IsOptional() @IsNumber() @Min(0)
  averageMonthlySalary?: number;

  @IsOptional() @IsString() @MaxLength(80)
  bankAccount?: string | null;

  // ─── Salud ocupacional ────────────────────────────────────────────────
  @IsOptional() @IsBoolean()
  psychophysicalValid?: boolean;

  @IsOptional() @IsBoolean()
  psychosensometricValid?: boolean;

  @IsOptional() @IsString() @MaxLength(80)
  courseCode?: string | null;

  @IsOptional() @IsString() @MaxLength(50)
  schoolNit?: string | null;

  @IsOptional() @IsString() @MaxLength(80)
  courseCertificateNumber?: string | null;

  @IsOptional() @IsBoolean()
  hasSuraPolicy?: boolean;

  @IsOptional() @IsString() @MaxLength(120)
  funeralService?: string | null;

  // ─── Sociodemográfico ────────────────────────────────────────────────
  @IsOptional() @IsInt() @Min(0) @Max(30)
  childrenCount?: number;

  @IsOptional() @IsInt() @Min(0) @Max(30)
  dependentsCount?: number;

  @IsOptional() @IsInt() @Min(1) @Max(6)
  estrato?: number | null;

  @IsOptional() @IsString()
  lifePlan?: string | null;

  // ─── Catálogos (FKs) ─────────────────────────────────────────────────
  @IsOptional() @IsUUID() epsId?: string | null;
  @IsOptional() @IsUUID() pensionFundId?: string | null;
  @IsOptional() @IsUUID() bloodTypeId?: string | null;
  @IsOptional() @IsUUID() genderId?: string | null;
  @IsOptional() @IsUUID() sexualOrientationId?: string | null;
  @IsOptional() @IsUUID() religionId?: string | null;
  @IsOptional() @IsUUID() raceId?: string | null;
  @IsOptional() @IsUUID() housingTypeId?: string | null;
  @IsOptional() @IsUUID() educationLevelId?: string | null;
  @IsOptional() @IsUUID() incomeRangeId?: string | null;
  @IsOptional() @IsUUID() transportMeanId?: string | null;
  @IsOptional() @IsUUID() commuteTimeId?: string | null;

  // ─── Estado ──────────────────────────────────────────────────────────
  @IsOptional() @IsEnum(AssociateStatus)
  status?: AssociateStatus;

  // ─── Metadatos opcionales ────────────────────────────────────────────
  @IsOptional() @IsString() @MaxLength(200)
  positionChangeReason?: string;
}
