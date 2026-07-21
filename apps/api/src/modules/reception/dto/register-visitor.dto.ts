import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ReceptionSex, ReceptionTransport } from '../entities/reception-visitor.entity';

export const RECEPTION_AUTHORIZED_BY_OPTIONS = [
  'Recursos humanos',
  'Gerencia',
  'Operaciones',
  'SST',
  'Contabilidad',
  'Seguridad electrónica',
  'Comercial',
] as const;

export class RegisterReceptionVisitorDto {
  @IsOptional()
  @IsString()
  @MaxLength(40)
  documentNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstSurname?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  secondSurname?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  secondName?: string;

  @IsOptional()
  @IsEnum(ReceptionSex)
  sex?: ReceptionSex;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  birthDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  arl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  eps?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  originPlace?: string;

  @IsOptional()
  @IsString()
  visitReason?: string;

  @IsOptional()
  @IsIn([...RECEPTION_AUTHORIZED_BY_OPTIONS])
  authorizedBy?: (typeof RECEPTION_AUTHORIZED_BY_OPTIONS)[number];

  @IsOptional()
  @IsEnum(ReceptionTransport)
  transportMeans?: ReceptionTransport;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  travelTimeMinutes?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
