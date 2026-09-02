import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import {
  AbsenteeismEventType,
  AbsenteeismKind,
} from '../entities/associate-absence.entity';

export class CreateAbsenceDto {
  @IsUUID()
  associateId!: string;

  @IsEnum(AbsenteeismKind)
  kind!: AbsenteeismKind;

  @IsEnum(AbsenteeismEventType)
  eventType!: AbsenteeismEventType;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsOptional() @IsInt() @Min(0)
  absenceDays?: number;

  @IsOptional() @IsInt() @Min(0)
  daysInMonth?: number;

  @IsOptional() @IsBoolean()
  isExtension?: boolean;

  @IsOptional() @IsBoolean()
  postIncapacityExam?: boolean;

  @IsOptional() @IsString()
  incapacityOrigin?: string;

  @IsOptional() @IsUUID()
  diagnosisId?: string;

  @IsOptional() @IsString()
  cause?: string;

  @IsOptional() @IsString()
  observations?: string;

  @IsOptional() @IsNumber()
  baseSalary?: number;

  @IsOptional() @IsNumber()
  atCosts?: number;
}

export class UpdateAbsenceDto {
  @IsOptional() @IsEnum(AbsenteeismKind)
  kind?: AbsenteeismKind;

  @IsOptional() @IsEnum(AbsenteeismEventType)
  eventType?: AbsenteeismEventType;

  @IsOptional() @IsDateString()
  startDate?: string;

  @IsOptional() @IsDateString()
  endDate?: string;

  @IsOptional() @IsInt() @Min(0)
  absenceDays?: number;

  @IsOptional() @IsInt() @Min(0)
  daysInMonth?: number;

  @IsOptional() @IsBoolean()
  isExtension?: boolean;

  @IsOptional() @IsBoolean()
  postIncapacityExam?: boolean;

  @IsOptional() @IsString()
  incapacityOrigin?: string | null;

  @IsOptional() @IsUUID()
  diagnosisId?: string | null;

  @IsOptional() @IsString()
  cause?: string | null;

  @IsOptional() @IsString()
  observations?: string | null;

  @IsOptional() @IsNumber()
  baseSalary?: number | null;

  @IsOptional() @IsNumber()
  atCosts?: number | null;
}
