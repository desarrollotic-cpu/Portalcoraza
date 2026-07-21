import { IsObject, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateInventoryVariantDto {
  @IsUUID()
  itemId!: string;

  @IsString()
  @MaxLength(100)
  sku!: string;

  @IsOptional()
  @IsObject()
  attributes?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  talla?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  color?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  genero?: string;
}
