import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { ExitReceptionVisitorDto } from './dto/exit-visitor.dto';
import { RegisterReceptionVisitorDto } from './dto/register-visitor.dto';
import { ReceptionService } from './reception.service';

@Controller('reception')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReceptionController {
  constructor(private readonly service: ReceptionService) {}

  @Get('dashboard')
  @RequirePermissions('reception.view')
  dashboard() {
    return this.service.getDashboard();
  }

  @Get('visitors')
  @RequirePermissions('reception.view')
  list(@Query('insideOnly') insideOnly?: string, @Query('limit') limit?: string) {
    return this.service.list({
      insideOnly: insideOnly === 'true',
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post('visitors')
  @RequirePermissions('reception.register')
  register(@Body() dto: RegisterReceptionVisitorDto, @CurrentUser() user: JwtPayload) {
    return this.service.register(dto, user.sub);
  }

  @Patch('visitors/:id/exit')
  @RequirePermissions('reception.exit')
  exit(
    @Param('id') id: string,
    @Body() dto: ExitReceptionVisitorDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.registerExit(id, dto, user.sub);
  }
}
