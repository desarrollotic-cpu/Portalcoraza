import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { OverviewService } from '../services/overview.service';

@Controller('documental')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class OverviewController {
  constructor(private readonly service: OverviewService) {}

  @Get('trd')
  @RequirePermissions('documental.view')
  trd() {
    return this.service.listTrd();
  }

  @Get('search')
  @RequirePermissions('documental.view')
  search(@Query('query') query = '') {
    return this.service.search(query);
  }

  @Get('voxelsera-map')
  @RequirePermissions('documental.view')
  voxelseraMap() {
    return this.service.voxelseraMap();
  }

  @Get('analytics')
  @RequirePermissions('documental.view')
  analytics() {
    return this.service.analytics();
  }

  @Get('notifications')
  @RequirePermissions('documental.view')
  notifications() {
    return this.service.notifications();
  }
}
