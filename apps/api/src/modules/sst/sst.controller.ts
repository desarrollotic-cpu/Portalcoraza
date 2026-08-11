import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import {
  CreateSstClientDto,
  CreateSstInspectionDto,
  CreateSstWorkplaceDto,
  SaveSstInspectionDto,
} from './dto/sst.dto';
import { SstService } from './sst.service';

@Controller('sst')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SstController {
  constructor(private readonly sst: SstService) {}

  @Get('overview')
  @RequirePermissions('sst.view')
  overview() {
    return this.sst.overview();
  }

  @Get('checklist')
  @RequirePermissions('sst.view')
  checklist() {
    return this.sst.listChecklist();
  }

  @Get('clients')
  @RequirePermissions('sst.view')
  clients() {
    return this.sst.listClients();
  }

  @Post('clients')
  @RequirePermissions('sst.manage')
  createClient(@Body() dto: CreateSstClientDto) {
    return this.sst.createClient(dto);
  }

  @Get('workplaces')
  @RequirePermissions('sst.view')
  workplaces() {
    return this.sst.listWorkplaces();
  }

  @Post('workplaces')
  @RequirePermissions('sst.manage')
  createWorkplace(@Body() dto: CreateSstWorkplaceDto) {
    return this.sst.createWorkplace(dto);
  }

  @Get('action-plans')
  @RequirePermissions('sst.view')
  actionPlans(@Query('filter') filter?: string) {
    return this.sst.listActionPlans(filter);
  }

  @Get('inspections')
  @RequirePermissions('sst.view')
  inspections(@Query('workplaceId') workplaceId?: string) {
    return this.sst.listInspections(workplaceId);
  }

  @Post('inspections')
  @RequirePermissions('sst.inspect')
  createInspection(
    @Body() dto: CreateSstInspectionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.sst.createInspection(dto, user.sub);
  }

  @Get('inspections/:id')
  @RequirePermissions('sst.view')
  getInspection(@Param('id', ParseUUIDPipe) id: string) {
    return this.sst.getInspection(id);
  }

  @Put('inspections/:id')
  @RequirePermissions('sst.inspect')
  saveInspection(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SaveSstInspectionDto,
  ) {
    return this.sst.saveInspection(id, dto);
  }

  @Post('inspections/:id/close')
  @RequirePermissions('sst.inspect')
  close(@Param('id', ParseUUIDPipe) id: string) {
    return this.sst.closeInspection(id);
  }

  @Get('inspections/:id/report')
  @RequirePermissions('sst.view')
  report(@Param('id', ParseUUIDPipe) id: string) {
    return this.sst.report(id);
  }
}
