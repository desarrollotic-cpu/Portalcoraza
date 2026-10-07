import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequireAnyPermissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import {
  NextPassDto,
  RadioControlService,
  UpsertManyDto,
  UpsertRadioCheckDto,
} from './radio-control.service';

@Controller('radio-control')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RadioControlController {
  constructor(private readonly svc: RadioControlService) {}

  @Get('board')
  @RequireAnyPermissions('radio_control.view', 'operations.view')
  board(
    @CurrentUser() user: JwtPayload,
    @Query('date') date: string,
    @Query('q') q?: string,
  ) {
    return this.svc.board(user, date, q);
  }

  @Get('history')
  @RequireAnyPermissions('radio_control.view', 'operations.view')
  history(@CurrentUser() user: JwtPayload, @Query('date') date: string) {
    return this.svc.history(user, date);
  }

  @Get('passes/:id')
  @RequireAnyPermissions('radio_control.view', 'operations.view')
  passDetail(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.svc.passDetail(user, id);
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

  @Post('next-pass')
  @RequireAnyPermissions('radio_control.edit', 'operations.view')
  nextPass(@CurrentUser() user: JwtPayload, @Body() body: NextPassDto) {
    return this.svc.nextPass(user, body);
  }
}
