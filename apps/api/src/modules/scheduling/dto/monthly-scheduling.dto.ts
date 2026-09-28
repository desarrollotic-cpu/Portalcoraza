import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateIf,
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

  @ValidateIf((_, v) => v != null && v !== '')
  @IsUUID()
  associateId!: string | null;

  @IsOptional()
  @IsString()
  turnoId!: string | null;

  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  associateName?: string | null;
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

  /** Si true, persiste aunque haya inactivos / conflictos de mismo turno. */
  @IsOptional()
  @IsBoolean()
  confirmWarnings?: boolean;

  @IsOptional()
  @IsString()
  observaciones?: string | null;
}

export class MonthlyAlertsQueryDto {
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

  @IsOptional()
  @IsIn(['current', 'next', 'auto'])
  scope?: 'current' | 'next' | 'auto';
}

export class BoardAlertsQueryDto {
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

/** Reglas del cuadro por tenant (solo GERENCIA/ADMIN). */
export class UpdateSchedulingRulesDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(400)
  minHorasMes!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(744)
  maxHorasMes!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(48)
  descansoMinHoras!: number;

  @IsBoolean()
  novedadesReducenMinimo!: boolean;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(90)
  diasSinTurnoAlerta!: number;
}

export class DismissAlertDto {
  @IsString()
  @MaxLength(300)
  alertId!: string;

  @IsString()
  @MaxLength(500)
  motivo!: string;
}

export class UpdateScheduleStatusDto {
  @IsEnum(ScheduleStatus)
  status!: ScheduleStatus;

  /** Publicar con errores: solo GERENCIA/ADMIN y con motivo escrito (queda en auditoría). */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  justificacion?: string;
}

export class GenerateMotorDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roles?: string[];

  /** Si viene, se persiste antes de generar (roles agregados en UI sin Guardar). */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PersonalRoleDto)
  personal?: PersonalRoleDto[];

  /** Ciclo a aplicar: 12x3 | 10x5 | 2x2 | 13x2 (default 12x3). */
  @IsOptional()
  @IsString()
  tipoCiclo?: '12x3' | '10x5' | '2x2' | '13x2';
}

export class GenerateMotorGlobalDto {
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

  @IsOptional()
  @IsString()
  tipoCiclo?: '12x3' | '10x5' | '2x2' | '13x2';

  /** Si true, crea programación borrador para puestos activos sin cuadro ese mes. */
  @IsOptional()
  @IsBoolean()
  createMissing?: boolean;
}

export class CreateScheduleTemplateDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsUUID()
  postId?: string | null;

  @IsOptional()
  @IsUUID()
  fromScheduleId?: string;
}
