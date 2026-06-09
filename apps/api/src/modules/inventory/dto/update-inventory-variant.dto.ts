import { PartialType } from '@nestjs/mapped-types';
import { CreateInventoryVariantDto } from './create-inventory-variant.dto';

export class UpdateInventoryVariantDto extends PartialType(
  CreateInventoryVariantDto,
) {}
