import {
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateCorrespondenceDto {
  @IsOptional()
  @IsDateString()
  documentDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  medium?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  documentType?: string;

  @IsString()
  @MaxLength(10)
  originDept!: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  destinationDept?: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  detail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  documentCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  depCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  serieCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  subserieCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  voxelsera?: string;
}
