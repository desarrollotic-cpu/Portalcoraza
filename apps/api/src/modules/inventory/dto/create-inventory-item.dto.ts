import { IsInt, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

export class CreateInventoryItemDto {
  @IsUUID()
  categoryId!: string;

  @IsString()
  @MaxLength(80)
  code!: string;

  @IsString()
  @MaxLength(180)
  name!: string;

  @IsString()
  @MaxLength(30)
  unit!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  lowStockThreshold?: number;
}
