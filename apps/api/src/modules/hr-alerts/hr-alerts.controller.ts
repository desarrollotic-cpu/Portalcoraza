import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { HrAlertStatus, HrAlertType } from './entities/hr-alert.entity';
import { HrAlertsService } from './hr-alerts.service';

@Controller('hr/alerts')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class HrAlertsController {
  constructor(private readonly service: HrAlertsService) {}

  @Get()
  @RequirePermissions('hr_alerts.view')
  list(
    @Query('status') status?: HrAlertStatus,
    @Query('associateId') associateId?: string,
    @Query('alertType') alertType?: HrAlertType,
  ) {
    return this.service.list({ status, associateId, alertType });
  }

  @Get('summary')
  @RequirePermissions('hr_alerts.view')
  summary() {
    return this.service.summary();
  }

  @Get('associate/:associateId')
  @RequirePermissions('hr_alerts.view')
  findByAssociate(@Param('associateId') associateId: string) {
    return this.service.findByAssociate(associateId);
  }

  @Post(':id/resolve')
  @RequirePermissions('hr_alerts.resolve')
  resolve(
    @Param('id') id: string,
    @Body('notes') notes: string | undefined,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.resolve(id, user.sub, notes);
  }

  @Post('run')
  @RequirePermissions('hr_alerts.run_cron')
  run(@CurrentUser() user: JwtPayload) {
    return this.service.generateAll(user.sub);
  }
}
