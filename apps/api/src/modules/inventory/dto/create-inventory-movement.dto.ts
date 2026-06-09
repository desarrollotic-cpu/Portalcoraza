import { IsEnum, IsInt, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';
import { InventoryMovementType } from '../entities/inventory-movement.entity';

export class CreateInventoryMovementDto {
  @IsUUID()
  variantId!: string;

  @IsEnum(InventoryMovementType)
  movementType!: InventoryMovementType;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  referenceType?: string;

  @IsOptional()
  @IsUUID()
  referenceId?: string;
}
