import { IsDateString, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { AssociateDocumentKind } from '../entities/associate-document.entity';

/**
 * Metadatos del archivo que se sube junto al `multipart/form-data`. El binario
 * viaja en el campo `file`; estos campos viajan como texto en el body.
 */
export class UploadDocumentDto {
  @IsEnum(AssociateDocumentKind)
  documentKind!: AssociateDocumentKind;

  @IsOptional() @IsDateString()
  issuedDate?: string;

  @IsOptional() @IsDateString()
  expirationDate?: string;

  @IsOptional() @IsString() @MaxLength(500)
  notes?: string;
}

export class AssociateCredentialDto {
  @IsEnum(AssociateDocumentKind)
  documentKind!: AssociateDocumentKind;

  @IsDateString()
  issuedDate!: string;

  @IsDateString()
  expirationDate!: string;

  @IsOptional() @IsString() @MaxLength(500)
  notes?: string;
}
