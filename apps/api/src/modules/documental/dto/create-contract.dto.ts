import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateContractDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  contractType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  contractNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  partyA?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  partyB?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  nit?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @Transform(({ value }) => (value === null || value === undefined || value === '' ? undefined : String(value)))
  @IsNumberString()
  contractValue?: string;

  @IsOptional()
  @IsString()
  contractObject?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  voxelsera?: string;
}
