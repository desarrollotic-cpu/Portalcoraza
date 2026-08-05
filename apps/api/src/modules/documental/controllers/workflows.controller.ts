import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { ResolveWorkflowDto } from '../dto/resolve-workflow.dto';
import { WorkflowsService } from '../services/workflows.service';

@Controller('documental/workflows')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class WorkflowsController {
  constructor(private readonly service: WorkflowsService) {}

  @Get('pending')
  @RequirePermissions('documental.view')
  pending() {
    return this.service.pending();
  }

  @Post('resolve')
  @RequirePermissions('documental.manage')
  resolve(@Body() dto: ResolveWorkflowDto, @CurrentUser() user: JwtPayload) {
    return this.service.resolve(dto, user.sub);
  }
}
