import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class PostContractItemDto {
  @IsOptional() @IsString() @MaxLength(80) contractNumber?: string;
  @IsOptional() @IsString() @MaxLength(80) contractStart?: string;
  @IsOptional() @IsString() @MaxLength(80) contractTerm?: string;
  @IsOptional() @IsString() @MaxLength(80) contractEnd?: string;
  @IsOptional() @IsString() @MaxLength(20) basc?: string;
  @IsOptional() @IsString() @MaxLength(80) serviceType?: string;
  @IsOptional() @IsString() @MaxLength(80) invoiceValue?: string;
  @IsOptional() @IsBoolean() armed?: boolean;
}

export class PostOtrosiItemDto {
  @IsOptional() @IsString() @MaxLength(80) number?: string;
  @IsOptional() @IsString() @MaxLength(200) typeText?: string;
  @IsOptional() @IsString() @MaxLength(80) dateText?: string;
  @IsOptional() @IsString() @MaxLength(80) invoiceValue?: string;
  @IsOptional() @IsString() @MaxLength(80) serviceType?: string;
}
