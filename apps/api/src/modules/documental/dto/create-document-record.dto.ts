import {
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateDocumentRecordDto {
  @IsString()
  @MaxLength(100)
  code!: string;

  @IsUUID()
  documentTypeId!: string;

  @IsString()
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  physicalLocation?: string;

  @IsOptional()
  @IsString()
  observations?: string;

  @IsDateString()
  registeredAt!: string;

  @IsOptional()
  @IsString()
  fileUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  storageProvider?: string;
}
