import { Type } from 'class-transformer';
import {
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

export class VigiaLoginDto {
  @IsString()
  @MinLength(4)
  cedula!: string;

  @IsString()
  @MinLength(2)
  nombre!: string;
}

export class VigiaStartTurnoDto {
  @IsOptional()
  @IsUUID()
  postId?: string;
}

export class VigiaCierreTurnoDto {
  @IsString()
  @MinLength(2)
  relevoNombre!: string;

  @IsOptional()
  @IsString()
  relevoFotoBase64?: string;
}

export class VigiaSosDto {
  @IsOptional()
  @IsUUID()
  turnoId?: string;

  @IsOptional()
  @IsUUID()
  postId?: string;

  @IsOptional()
  @IsNumber()
  lat?: number;

  @IsOptional()
  @IsNumber()
  lng?: number;

  @IsOptional()
  @IsString()
  motivo?: string;
}

export class VigiaFirmarDotacionDto {
  @IsString()
  @MinLength(1)
  items!: string;

  @IsString()
  @MinLength(20)
  firmaBase64!: string;
}

export class VigiaReclamoNominaDto {
  @IsString()
  periodo!: string;

  @IsString()
  motivo!: string;

  @IsString()
  @MinLength(3)
  detalle!: string;
}

export class VigiaCreateMinutaDto {
  @IsString()
  tipo!: string;

  @IsUUID()
  postId!: string;

  @IsOptional()
  @IsString()
  nombrePuesto?: string;

  @IsOptional()
  @IsUUID()
  turnoId?: string;

  @IsOptional()
  @IsObject()
  @Type(() => Object)
  payload?: Record<string, unknown>;
}
