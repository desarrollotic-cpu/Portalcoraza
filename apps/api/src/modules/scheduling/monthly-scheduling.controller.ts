import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import {
  CreateMonthlyScheduleDto,
  CreateScheduleTemplateDto,
  GenerateMotorDto,
  GenerateMotorGlobalDto,
  GetMonthlyScheduleDto,
  ListMonthlyScheduleDto,
  SaveMonthlyScheduleDto,
  UpdateScheduleStatusDto,
} from './dto/monthly-scheduling.dto';
import { MonthlySchedulingService } from './monthly-scheduling.service';

@Controller('scheduling/monthly')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class MonthlySchedulingController {
  constructor(private readonly service: MonthlySchedulingService) {}

  @Get()
  @RequirePermissions('scheduling.view')
  getOne(@Query() query: GetMonthlyScheduleDto) {
    return this.service.getOne(query);
  }

  @Get('by-month')
  @RequirePermissions('scheduling.view')
  listByMonth(@Query() query: ListMonthlyScheduleDto) {
    return this.service.listByMonth(query);
  }

  @Get('conflicts')
  @RequirePermissions('scheduling.view')
  findConflicts(@Query() query: ListMonthlyScheduleDto) {
    return this.service.findConflicts(query);
  }

  @Get('templates')
  @RequirePermissions('scheduling.view')
  listTemplates() {
    return this.service.listTemplates();
  }

  @Post('templates')
  @RequirePermissions('scheduling.create')
  createTemplate(
    @Body() dto: CreateScheduleTemplateDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.createTemplate(dto, user.sub);
  }

  @Post('motor-global')
  @RequirePermissions('scheduling.edit')
  generateMotorGlobal(
    @Body() dto: GenerateMotorGlobalDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.generateMotorGlobal(dto, user.sub);
  }

  @Post()
  @RequirePermissions('scheduling.create')
  createOrGet(
    @Body() dto: CreateMonthlyScheduleDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.createOrGet(dto, user.sub);
  }

  @Put(':id')
  @RequirePermissions('scheduling.edit')
  save(
    @Param('id') id: string,
    @Body() dto: SaveMonthlyScheduleDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.save(id, dto, user.sub);
  }

  @Patch(':id/status')
  @RequirePermissions('scheduling.edit')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateScheduleStatusDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.updateStatus(id, dto, user.sub);
  }

  @Post(':id/motor')
  @RequirePermissions('scheduling.edit')
  generateMotor(
    @Param('id') id: string,
    @Body() dto: GenerateMotorDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.generateWithMotor(id, dto, user.sub);
  }

  @Post(':id/apply-template/:templateId')
  @RequirePermissions('scheduling.edit')
  applyTemplate(
    @Param('id') id: string,
    @Param('templateId') templateId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.applyTemplate(id, templateId, user.sub);
  }
}
