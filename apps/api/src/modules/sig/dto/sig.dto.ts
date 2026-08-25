import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

const AREAS = ['GH', 'SST', 'COMERCIAL', 'OPERACIONES', 'ADMIN'] as const;
const FREC = ['MENSUAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL'] as const;
const SENTIDO = ['ASCENDENTE', 'DESCENDENTE'] as const;

export class SigIndicadorDto {
  @IsString() @MinLength(1) codigo!: string;
  @IsString() @MinLength(2) nombre!: string;
  @IsString() objetivoId!: string;
  @IsString() subsistema!: string;
  @IsOptional() @IsString() proposito?: string;
  @IsOptional() @IsString() formula?: string;
  @IsIn(FREC) frecuencia!: string;
  @IsIn(SENTIDO) sentido!: string;
  @IsIn(AREAS) area!: string;
  @IsOptional() @IsString() responsable?: string;
  @IsOptional() @IsBoolean() activo?: boolean;
}

export class SigIndicadorPatchDto {
  @IsOptional() @IsString() @MinLength(2) nombre?: string;
  @IsOptional() @IsString() proposito?: string;
  @IsOptional() @IsString() formula?: string;
  @IsOptional() @IsIn(FREC) frecuencia?: string;
  @IsOptional() @IsIn(SENTIDO) sentido?: string;
  @IsOptional() @IsIn(AREAS) area?: string;
  @IsOptional() @IsString() responsable?: string;
  @IsOptional() @IsBoolean() activo?: boolean;
}

export class SigResultadoDto {
  @IsString() indicadorId!: string;
  @Type(() => Number) @IsNumber() anio!: number;
  @IsString() @MinLength(1) periodo!: string;
  @Type(() => Number) @IsNumber() meta!: number;
  @Type(() => Number) @IsNumber() resultado!: number;
  @IsOptional() @IsString() observaciones?: string;
  @IsOptional() @IsIn(['ABIERTO', 'CERRADO']) seguimiento?: string;
}
