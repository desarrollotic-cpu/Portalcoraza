import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { InventoryMovementType } from '../entities/inventory-movement.entity';

export class CreateInventoryMovementDto {
  @IsUUID()
  variantId!: string;

  @IsEnum(InventoryMovementType)
  movementType!: InventoryMovementType;

  @IsInt()
  @Min(1)
  quantity!: number;

  /** Motivo estructurado obligatorio en entradas (IN). */
  @ValidateIf((o: CreateInventoryMovementDto) => o.movementType === InventoryMovementType.IN)
  @IsString()
  @MaxLength(80)
  entryReason?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  observations?: string;

  /** Compatibilidad: si no viene entryReason, se usa reason. */
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
