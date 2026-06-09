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
}
