import {
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateLibraryFileDto {
  @IsString()
  @MaxLength(150)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  version?: string;

  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @IsDateString()
  elaborationDate?: string;

  @IsOptional()
  @IsString()
  changeDescription?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  responsible?: string;

  @IsOptional()
  @IsUUID()
  folderId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  storageProvider?: string;
}
