import { Body, Controller, Get, Param, Post, Request, UseGuards } from '@nestjs/common';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { PayrollsService } from './payrolls.service';

@Controller('payroll')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PayrollsController {
  constructor(private readonly payrollsService: PayrollsService) {}

  @Get('periods')
  @RequirePermissions('payroll.view')
  getPeriods() {
    return this.payrollsService.getPeriods();
  }

  @Get('periods/:id')
  @RequirePermissions('payroll.view')
  getPeriodById(@Param('id') id: string) {
    return this.payrollsService.getPeriodById(id);
  }

  @Post('periods')
  @RequirePermissions('payroll.calculate')
  createPeriod(@Body() dto: { periodName: string; startDate: string; endDate: string }) {
    return this.payrollsService.createPeriod(dto);
  }

  @Post('periods/:id/calculate')
  @RequirePermissions('payroll.calculate')
  calculatePeriod(@Param('id') id: string) {
    return this.payrollsService.calculatePeriod(id);
  }

  @Get('periods/:id/slips')
  @RequirePermissions('payroll.view')
  getSlipsByPeriod(@Param('id') id: string) {
    return this.payrollsService.getSlipsByPeriod(id);
  }

  @Get('slips/:id')
  @RequirePermissions('payroll.view')
  getSlipById(@Param('id') id: string) {
    return this.payrollsService.getSlipById(id);
  }

  @Get('my-slips')
  getMySlips(@Request() req: any) {
    const associateId = req.user?.associateId || req.user?.sub;
    return this.payrollsService.getMySlips(associateId);
  }
}
