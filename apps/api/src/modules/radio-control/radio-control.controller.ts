import { Body, Controller, Get, Post, Put, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
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
  @RequirePermissions('radio_control.view')
  slots() {
    return this.svc.slots();
  }

  @Get('board')
  @RequirePermissions('radio_control.view')
  board(
    @CurrentUser() user: JwtPayload,
    @Query('date') date: string,
    @Query('slot') slot: string,
    @Query('q') q?: string,
  ) {
    return this.svc.board(user, date, slot, q);
  }

  @Get('day-summary')
  @RequirePermissions('radio_control.view')
  daySummary(@CurrentUser() user: JwtPayload, @Query('date') date: string) {
    return this.svc.daySummary(user, date);
  }

  @Put('check')
  @RequirePermissions('radio_control.edit')
  upsert(@CurrentUser() user: JwtPayload, @Body() body: UpsertRadioCheckDto) {
    return this.svc.upsert(user, body);
  }

  @Post('fill')
  @RequirePermissions('radio_control.edit')
  fill(@CurrentUser() user: JwtPayload, @Body() body: UpsertManyDto) {
    return this.svc.upsertMany(user, body);
  }
}
