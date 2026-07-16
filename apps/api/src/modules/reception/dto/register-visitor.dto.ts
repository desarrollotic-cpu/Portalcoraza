import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ReceptionSex, ReceptionTransport } from '../entities/reception-visitor.entity';

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
  @IsString()
  @MaxLength(200)
  authorizedBy?: string;

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
