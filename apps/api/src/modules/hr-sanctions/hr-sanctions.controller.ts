import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  RequireAnyPermissions,
  RequirePermissions,
} from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import {
  AnnulSanctionDto,
  CreateNumeralDto,
  CreateSanctionDto,
  UpdateNumeralDto,
} from './dto/sanctions.dto';
import type { SanctionStatus } from './entities/disciplinary.entities';
import { HrSanctionsService } from './hr-sanctions.service';

@Controller('hr/sanctions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class HrSanctionsController {
  constructor(private readonly service: HrSanctionsService) {}

  @Get()
  @RequirePermissions('sanctions.view')
  list(
    @Query('associateId') associateId?: string,
    @Query('status') status?: SanctionStatus,
    @Query('search') search?: string,
  ) {
    return this.service.list({ associateId, status, search });
  }

  @Get('numerals')
  @RequireAnyPermissions('sanctions.view', 'sanctions.create', 'sanctions.manage')
  numerals(@Query('all') all?: string) {
    return this.service.listNumerals(all !== '1');
  }

  @Post('numerals')
  @RequirePermissions('sanctions.manage')
  createNumeral(@Body() dto: CreateNumeralDto, @CurrentUser() user: JwtPayload) {
    return this.service.createNumeral(dto, user.sub);
  }

  @Patch('numerals/:id')
  @RequirePermissions('sanctions.manage')
  updateNumeral(
    @Param('id') id: string,
    @Body() dto: UpdateNumeralDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.updateNumeral(id, dto, user.sub);
  }

  @Get('associate-search')
  @RequireAnyPermissions('sanctions.create', 'associates.view')
  associateSearch(@Query('q') q?: string, @Query('limit') limit?: string) {
    const n = limit ? parseInt(limit, 10) : 8;
    return this.service.searchAssociates(q ?? '', Number.isFinite(n) ? n : 8);
  }

  @Post()
  @RequirePermissions('sanctions.create')
  create(@Body() dto: CreateSanctionDto, @CurrentUser() user: JwtPayload) {
    return this.service.create(dto, user.sub);
  }

  @Post(':id/annul')
  @RequirePermissions('sanctions.create')
  annul(@Param('id') id: string, @Body() dto: AnnulSanctionDto, @CurrentUser() user: JwtPayload) {
    return this.service.annul(id, dto.reason, user.sub);
  }
}
