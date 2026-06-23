import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreatePackageDto {
  @IsUUID()
  unitId!: string;

  @IsOptional()
  @IsUUID()
  residentId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  sender?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
