import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { HrAuditService } from '../hr-shared/services/hr-audit.service';

@Controller('hr/audit')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class HrAuditController {
  constructor(private readonly hrAudit: HrAuditService) {}

  @Get()
  @RequirePermissions('hr_audit.view')
  list(@Query('limit') limit?: string) {
    const parsed = limit ? parseInt(limit, 10) : 100;
    return this.hrAudit.listRecent(Number.isNaN(parsed) ? 100 : parsed);
  }
}
