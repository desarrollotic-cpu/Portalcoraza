import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  Jornada,
  Turno,
} from '../entities/schedule-assignment.entity';
import { ScheduleStatus } from '../entities/monthly-schedule.entity';

export class PersonalRoleDto {
  @IsString()
  rol!: string;

  @IsOptional()
  @IsUUID()
  associateId!: string | null;

  @IsOptional()
  @IsString()
  turnoId!: string | null;

  @IsOptional()
  @IsString()
  displayName?: string;
}

export class AssignmentDto {
  @IsInt()
  @Min(1)
  @Max(31)
  day!: number;

  @IsString()
  role!: string;

  @IsOptional()
  @IsUUID()
  associateId?: string | null;

  @IsOptional()
  @IsString()
  turno?: Turno | null;

  @IsEnum(Jornada)
  jornada!: Jornada;

  @IsOptional()
  @IsString()
  codigo?: string | null;

  @IsOptional()
  @IsString()
  inicio?: string | null;

  @IsOptional()
  @IsString()
  fin?: string | null;
}

export class GetMonthlyScheduleDto {
  @IsUUID()
  postId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;
}

export class ListMonthlyScheduleDto {
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;
}

export class CreateMonthlyScheduleDto {
  @IsUUID()
  postId!: string;

  @IsInt()
  @Min(2000)
  @Max(2100)
  year!: number;

  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;
}

export class SaveMonthlyScheduleDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PersonalRoleDto)
  personal!: PersonalRoleDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssignmentDto)
  assignments!: AssignmentDto[];
}

export class UpdateScheduleStatusDto {
  @IsEnum(ScheduleStatus)
  status!: ScheduleStatus;
}

export class GenerateMotorDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roles?: string[];
}
