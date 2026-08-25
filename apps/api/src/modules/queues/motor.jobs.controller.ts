import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { GenerateMotorGlobalDto } from '../scheduling/dto/monthly-scheduling.dto';
import { CENTRAL_ORGANIZATION_ID } from '../../common/tenant/tenant.constants';
import { MotorQueueService } from './motor.queue.service';

@Controller('scheduling/monthly')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class MotorJobsController {
  constructor(private readonly motorQueue: MotorQueueService) {}

  @Post('motor-global')
  @HttpCode(202)
  @RequirePermissions('scheduling.edit')
  enqueueMotorGlobal(
    @Body() dto: GenerateMotorGlobalDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.motorQueue.enqueue({
      tenantId: user.tenantId || CENTRAL_ORGANIZATION_ID,
      year: dto.year,
      month: dto.month,
      tipoCiclo: dto.tipoCiclo,
      createMissing: dto.createMissing,
      userId: user.sub,
    });
  }

  @Get('motor-jobs/:jobId')
  @RequirePermissions('scheduling.view')
  getMotorJob(
    @Param('jobId') jobId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.motorQueue.getStatus(
      jobId,
      user.tenantId || CENTRAL_ORGANIZATION_ID,
    );
  }
}
