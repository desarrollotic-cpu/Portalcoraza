import { IsInt, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

export class CreateInventoryItemDto {
  @IsUUID()
  categoryId!: string;

  /** Si se omite, el backend genera el código (ej. APE001). */
  @IsOptional()
  @IsString()
  @MaxLength(80)
  code?: string;

  @IsString()
  @MaxLength(180)
  name!: string;

  /** Por defecto: und */
  @IsOptional()
  @IsString()
  @MaxLength(30)
  unit?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  lowStockThreshold?: number;

  /** Stock inicial opcional; crea movimiento IN sobre la variante por defecto. */
  @IsOptional()
  @IsInt()
  @Min(0)
  initialStock?: number;

  /** Motivo del stock inicial (Compra, Devolución, Donación, etc.). */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  initialStockReason?: string;
}
