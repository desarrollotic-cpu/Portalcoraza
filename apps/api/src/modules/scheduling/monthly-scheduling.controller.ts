import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import {
  BoardAlertsQueryDto,
  CreateMonthlyScheduleDto,
  CreateScheduleTemplateDto,
  GenerateMotorDto,
  GetMonthlyScheduleDto,
  ListMonthlyScheduleDto,
  MonthlyAlertsQueryDto,
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

  @Get('active-period')
  @RequirePermissions('scheduling.view')
  getActivePeriod() {
    return this.service.getActivePeriod();
  }

  @Get('today-coverage')
  @RequirePermissions('scheduling.view')
  getTodayCoverage(@Query('date') date?: string) {
    return this.service.getTodayCoverage(date);
  }

  @Get('payroll-recargos/export-excel')
  @RequirePermissions('scheduling.view')
  async exportPayrollRecargosExcel(
    @Query('year') year: string,
    @Query('month') month: string,
    @Res() res: Response,
  ) {
    try {
      const y = parseInt(year, 10) || new Date().getFullYear();
      const m = parseInt(month, 10) || new Date().getMonth() + 1;
      const buffer = await this.service.exportPayrollRecargosExcel(y, m);
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="Liquidacion_Recargos_Coraza_${y}-${String(m).padStart(2, '0')}.xlsx"`,
      );
      res.status(200).end(buffer);
    } catch (err: any) {
      res.status(500).json({
        statusCode: 500,
        message: err?.message || 'Error al generar el archivo de Excel oficial',
      });
    }
  }

  @Get('payroll-recargos')
  @RequirePermissions('scheduling.view')
  getPayrollRecargos(
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    const y = parseInt(year, 10) || new Date().getFullYear();
    const m = parseInt(month, 10) || new Date().getMonth() + 1;
    return this.service.getPayrollRecargos(y, m);
  }

  @Get('overview')
  @RequirePermissions('scheduling.view')
  overview(@Query() query: ListMonthlyScheduleDto) {
    return this.service.overview(query.year, query.month);
  }

  @Get('by-month')
  @RequirePermissions('scheduling.view')
  listByMonth(@Query() query: ListMonthlyScheduleDto) {
    return this.service.listByMonth(query);
  }

  @Get('alerts')
  @RequirePermissions('scheduling.view')
  getAlerts(@Query() query: MonthlyAlertsQueryDto) {
    return this.service.getAlerts(query);
  }

  @Get('alerts/board')
  @RequirePermissions('scheduling.view')
  getBoardAlerts(@Query() query: BoardAlertsQueryDto) {
    return this.service.getBoardAlerts(query);
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

  // POST motor-global + GET motor-jobs/:id → MotorJobsController (BullMQ)

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
