import { Controller, Get, UseGuards } from '@nestjs/common';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { HrDashboardService } from './hr-dashboard.service';

@Controller('hr/dashboard')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class HrDashboardController {
  constructor(private readonly service: HrDashboardService) {}

  @Get('overview')
  @RequirePermissions('hr_dashboard.view')
  overview() {
    return this.service.overview();
  }

  @Get('counts')
  @RequirePermissions('hr_dashboard.view')
  counts() {
    return this.service.counts();
  }

  @Get('rotation')
  @RequirePermissions('hr_dashboard.view')
  rotation() {
    return this.service.monthlyRotation();
  }

  @Get('demographics')
  @RequirePermissions('hr_dashboard.view')
  demographics() {
    return this.service.demographics();
  }

  @Get('retirement-reasons')
  @RequirePermissions('hr_dashboard.view')
  retirementReasons() {
    return this.service.retirementReasons();
  }

  @Get('compliance-matrix')
  @RequirePermissions('hr_dashboard.view')
  complianceMatrix() {
    return this.service.complianceMatrix();
  }
}
