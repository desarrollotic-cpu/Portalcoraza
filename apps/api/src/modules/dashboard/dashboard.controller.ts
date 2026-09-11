import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import {
  ActivityControlDays,
  ActivityControlService,
} from './activity-control.service';
import {
  CommandPeriod,
  DashboardCommandCenterService,
} from './dashboard-command-center.service';

const PERIODS = new Set<CommandPeriod>(['today', '7d', '30d', 'month']);

@Controller('dashboard')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DashboardController {
  constructor(
    private readonly service: DashboardCommandCenterService,
    private readonly activityControl: ActivityControlService,
  ) {}

  @Get('command-center')
  getCommandCenter(
    @CurrentUser() user: JwtPayload,
    @Query('period') periodRaw?: string,
  ) {
    const period: CommandPeriod =
      periodRaw && PERIODS.has(periodRaw as CommandPeriod)
        ? (periodRaw as CommandPeriod)
        : '7d';
    return this.service.build(user.permissions ?? [], period);
  }

  @Get('activity-control')
  @RequirePermissions('activity_control.view')
  getActivityControl(@Query('days') daysRaw?: string) {
    const n = Number(daysRaw);
    const days: ActivityControlDays = n === 7 ? 7 : n === 30 ? 30 : 1;
    return this.activityControl.build(days);
  }
}
