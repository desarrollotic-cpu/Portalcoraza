import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CreatePostEquipmentAssignmentDto } from './dto/create-assignment.dto';
import { CreatePostEquipmentCatalogDto } from './dto/create-catalog.dto';
import { CreatePostEquipmentUnitsDto } from './dto/create-units.dto';
import { ReturnPostEquipmentDto } from './dto/return-assignment.dto';
import { PostEquipmentService } from './post-equipment.service';

@Controller('post-equipment')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PostEquipmentController {
  constructor(private readonly service: PostEquipmentService) {}

  @Get('catalog')
  @RequirePermissions('post_equipment.view')
  listCatalog(@Query('includeInactive') includeInactive?: string) {
    return this.service.listCatalog(includeInactive === 'true');
  }

  @Post('catalog')
  @RequirePermissions('post_equipment.manage')
  createCatalog(@Body() dto: CreatePostEquipmentCatalogDto) {
    return this.service.createCatalog(dto);
  }

  @Get('catalog/:id')
  @RequirePermissions('post_equipment.view')
  getCatalogDetail(@Param('id') id: string) {
    return this.service.getCatalogDetail(id);
  }

  @Post('units')
  @RequirePermissions('post_equipment.manage')
  createUnits(@Body() dto: CreatePostEquipmentUnitsDto) {
    return this.service.createUnits(dto);
  }

  @Get('units/available')
  @RequirePermissions('post_equipment.view')
  listAvailableUnits(@Query('catalogId') catalogId?: string) {
    return this.service.listAvailableUnits(catalogId);
  }

  @Get('posts')
  @RequirePermissions('post_equipment.view')
  listPosts() {
    return this.service.listPostsWithSummary();
  }

  @Get('posts/:postId')
  @RequirePermissions('post_equipment.view')
  getPostDetail(@Param('postId') postId: string) {
    return this.service.getPostDetail(postId);
  }

  @Post('assignments')
  @RequirePermissions('post_equipment.assign')
  createAssignment(
    @Body() dto: CreatePostEquipmentAssignmentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.createAssignment(dto, user.sub);
  }

  @Post('assignments/:id/return')
  @RequirePermissions('post_equipment.return')
  returnAssignment(
    @Param('id') id: string,
    @Body() dto: ReturnPostEquipmentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.returnAssignment(id, dto, user.sub);
  }
}
