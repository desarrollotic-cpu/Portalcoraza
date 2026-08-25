import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import {
  CommandPeriod,
  DashboardCommandCenterService,
} from './dashboard-command-center.service';

const PERIODS = new Set<CommandPeriod>(['today', '7d', '30d', 'month']);

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly service: DashboardCommandCenterService) {}

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
}
