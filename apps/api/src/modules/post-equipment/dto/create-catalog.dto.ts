import { IsBoolean, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CreatePostEquipmentCatalogDto {
  @IsString()
  @MaxLength(50)
  @Matches(/^[A-Z0-9_\-]+$/i, {
    message: 'El código solo puede tener letras, números, guiones y guión bajo',
  })
  code!: string;

  @IsString()
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  requiresReturn?: boolean;
}
