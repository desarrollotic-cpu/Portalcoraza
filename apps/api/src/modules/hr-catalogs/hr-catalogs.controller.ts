import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CreateCatalogValueDto } from './dto/create-catalog-value.dto';
import { CatalogKind } from './entities/catalog-value.entity';
import { HrCatalogsService } from './hr-catalogs.service';

@Controller('hr/catalogs')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class HrCatalogsController {
  constructor(private readonly service: HrCatalogsService) {}

  @Get('kinds')
  @RequirePermissions('catalogs.view')
  listKinds() {
    return this.service.listKinds();
  }

  @Get()
  @RequirePermissions('catalogs.view')
  findAll(@Query('includeInactive') includeInactive?: string) {
    return this.service.findAllGrouped(includeInactive === 'true');
  }

  @Get(':kind')
  @RequirePermissions('catalogs.view')
  findByKind(
    @Param('kind') kind: CatalogKind,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.service.findByKind(kind, includeInactive === 'true');
  }

  @Post()
  @RequirePermissions('catalogs.manage')
  create(@Body() dto: CreateCatalogValueDto, @CurrentUser() user: JwtPayload) {
    return this.service.create(dto, user.sub);
  }

  @Patch(':id/toggle')
  @RequirePermissions('catalogs.manage')
  toggle(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.toggle(id, user.sub);
  }
}
