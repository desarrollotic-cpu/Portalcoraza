import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { SstWorkplaceType } from '../entities/sst-workplace.entity';
import { SstInspectionType } from '../entities/sst-inspection.entity';
import { SstPlanStatus, SstValoracion } from '../entities/sst-response.entity';

export class CreateSstClientDto {
  @IsString()
  @MaxLength(300)
  nombre!: string;

  @IsOptional()
  @IsString()
  nit?: string;

  @IsOptional()
  @IsString()
  contacto?: string;

  @IsOptional()
  @IsString()
  telefono?: string;
}

export class CreateSstWorkplaceDto {
  @IsUUID()
  clientId!: string;

  @IsOptional()
  @IsUUID()
  postId?: string;

  @IsString()
  @MaxLength(300)
  nombre!: string;

  @IsOptional()
  @IsString()
  direccion?: string;

  @IsOptional()
  @IsString()
  ciudad?: string;

  @IsOptional()
  @IsEnum(SstWorkplaceType)
  tipoPuesto?: SstWorkplaceType;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

export class CreateSstInspectionDto {
  @IsUUID()
  workplaceId!: string;

  @IsEnum(SstInspectionType)
  tipo!: SstInspectionType;

  @IsOptional()
  @IsDateString()
  fecha?: string;

  @IsString()
  responsableNombre!: string;

  @IsOptional()
  @IsString()
  responsableCargo?: string;

  @IsOptional()
  @IsString()
  observacionesGenerales?: string;
}

export class UpsertSstResponseDto {
  @IsUUID()
  itemId!: string;

  @IsEnum(SstValoracion)
  valoracion!: SstValoracion;

  @IsOptional()
  @IsString()
  hallazgo?: string;

  @IsOptional()
  @IsString()
  planAccionPropuesto?: string;

  @IsOptional()
  @IsString()
  responsablePlanAccion?: string;

  @IsOptional()
  @IsDateString()
  fechaCompromiso?: string;

  @IsOptional()
  @IsEnum(SstPlanStatus)
  estadoPlanAccion?: SstPlanStatus;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  evidenciasUrls?: string[];
}

export class SaveSstInspectionDto {
  @IsOptional()
  @IsString()
  observacionesGenerales?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpsertSstResponseDto)
  respuestas!: UpsertSstResponseDto[];

  @IsOptional()
  @IsBoolean()
  completar?: boolean;
}

export class UpdateSstPlanDto {
  @IsEnum(SstPlanStatus)
  estadoPlanAccion!: SstPlanStatus;

  @IsOptional()
  @IsDateString()
  fechaCompromiso?: string;
}
