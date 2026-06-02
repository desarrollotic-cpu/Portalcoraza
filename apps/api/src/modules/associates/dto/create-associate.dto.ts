import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { AssociateStatus } from '../entities/associate.entity';

export class CreateAssociateDto {
  @IsOptional()
  @IsString()
  @MaxLength(30)
  documentNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  eps?: string;

  @IsOptional()
  @IsString()
  arl?: string;

  @IsOptional()
  @IsString()
  afp?: string;

  @IsOptional()
  @IsString()
  bank?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  bloodType?: string;

  @IsOptional()
  @IsDateString()
  hireDate?: string;

  @IsOptional()
  @IsEnum(AssociateStatus)
  status?: AssociateStatus;
}
