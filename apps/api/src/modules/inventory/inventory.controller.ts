import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CreateInventoryCategoryDto } from './dto/create-inventory-category.dto';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { CreateInventoryMovementDto } from './dto/create-inventory-movement.dto';
import { CreateInventoryVariantDto } from './dto/create-inventory-variant.dto';
import { UpdateInventoryCategoryDto } from './dto/update-inventory-category.dto';
import { UpdateInventoryItemDto } from './dto/update-inventory-item.dto';
import { UpdateInventoryVariantDto } from './dto/update-inventory-variant.dto';
import { ValidateStockDto } from './dto/validate-stock.dto';
import { InventoryService } from './inventory.service';

@Controller('inventory')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('categories')
  @RequirePermissions('inventory.view')
  listCategories() {
    return this.inventoryService.listCategories();
  }

  @Post('categories')
  @RequirePermissions('inventory.create')
  createCategory(
    @Body() dto: CreateInventoryCategoryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.inventoryService.createCategory(dto, user.sub);
  }

  @Patch('categories/:id')
  @RequirePermissions('inventory.edit')
  updateCategory(
    @Param('id') id: string,
    @Body() dto: UpdateInventoryCategoryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.inventoryService.updateCategory(id, dto, user.sub);
  }

  @Get('items')
  @RequirePermissions('inventory.view')
  listItems() {
    return this.inventoryService.listItems();
  }

  @Post('items')
  @RequirePermissions('inventory.create')
  createItem(@Body() dto: CreateInventoryItemDto, @CurrentUser() user: JwtPayload) {
    return this.inventoryService.createItem(dto, user.sub);
  }

  @Patch('items/:id')
  @RequirePermissions('inventory.edit')
  updateItem(
    @Param('id') id: string,
    @Body() dto: UpdateInventoryItemDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.inventoryService.updateItem(id, dto, user.sub);
  }

  @Get('variants')
  @RequirePermissions('inventory.view')
  listVariants(@Query('itemId') itemId?: string) {
    return this.inventoryService.listVariants(itemId);
  }

  @Post('variants')
  @RequirePermissions('inventory.create')
  createVariant(
    @Body() dto: CreateInventoryVariantDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.inventoryService.createVariant(dto, user.sub);
  }

  @Patch('variants/:id')
  @RequirePermissions('inventory.edit')
  updateVariant(
    @Param('id') id: string,
    @Body() dto: UpdateInventoryVariantDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.inventoryService.updateVariant(id, dto, user.sub);
  }

  @Get('movements')
  @RequirePermissions('inventory.view')
  listMovements(@Query('limit') limit?: string) {
    const n = limit ? parseInt(limit, 10) : 150;
    return this.inventoryService.listMovements(Number.isFinite(n) ? n : 150);
  }

  @Post('movements')
  @RequirePermissions('inventory.move')
  createMovement(
    @Body() dto: CreateInventoryMovementDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.inventoryService.createMovement(dto, user.sub);
  }

  @Get('variants/available-stock')
  @RequirePermissions('inventory.view')
  availableStock(
    @Query('category') category: string,
    @Query('talla') talla?: string,
    @Query('genero') genero?: string,
  ) {
    return this.inventoryService.getAvailableStock(category, talla, genero);
  }

  @Post('validate-stock')
  @RequirePermissions('inventory.view')
  validateStock(@Body() dto: ValidateStockDto) {
    return this.inventoryService.validateStock(dto);
  }
}
