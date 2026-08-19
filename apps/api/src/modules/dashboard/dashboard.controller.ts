import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { DashboardCommandCenterService } from './dashboard-command-center.service';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly service: DashboardCommandCenterService) {}

  @Get('command-center')
  getCommandCenter(@CurrentUser() user: JwtPayload) {
    return this.service.build(user.permissions ?? []);
  }
}
