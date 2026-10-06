import { Body, Controller, Get, Post, Put, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequireAnyPermissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import {
  RadioControlService,
  UpsertManyDto,
  UpsertRadioCheckDto,
} from './radio-control.service';

@Controller('radio-control')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RadioControlController {
  constructor(private readonly svc: RadioControlService) {}

  @Get('slots')
  @RequireAnyPermissions('radio_control.view', 'operations.view')
  slots() {
    return this.svc.slots();
  }

  @Get('board')
  @RequireAnyPermissions('radio_control.view', 'operations.view')
  board(
    @CurrentUser() user: JwtPayload,
    @Query('date') date: string,
    @Query('slot') slot: string,
    @Query('q') q?: string,
  ) {
    return this.svc.board(user, date, slot, q);
  }

  @Get('day-summary')
  @RequireAnyPermissions('radio_control.view', 'operations.view')
  daySummary(@CurrentUser() user: JwtPayload, @Query('date') date: string) {
    return this.svc.daySummary(user, date);
  }

  @Put('check')
  @RequireAnyPermissions('radio_control.edit', 'operations.view')
  upsert(@CurrentUser() user: JwtPayload, @Body() body: UpsertRadioCheckDto) {
    return this.svc.upsert(user, body);
  }

  @Post('fill')
  @RequireAnyPermissions('radio_control.edit', 'operations.view')
  fill(@CurrentUser() user: JwtPayload, @Body() body: UpsertManyDto) {
    return this.svc.upsertMany(user, body);
  }

  @Get('minuta')
  @RequireAnyPermissions('radio_control.view', 'operations.view')
  minuta(@CurrentUser() user: JwtPayload) {
    return this.svc.minutaHoy(user);
  }

  @Post('minuta')
  @RequireAnyPermissions('radio_control.edit', 'radio_control.view', 'operations.view')
  saveMinuta(
    @CurrentUser() user: JwtPayload,
    @Body() body: { registradoPor?: string; anotaciones?: string; novedades?: string },
  ) {
    return this.svc.saveMinuta(user, body);
  }
}
