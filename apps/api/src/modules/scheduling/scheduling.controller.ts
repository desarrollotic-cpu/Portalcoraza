import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CreateShiftScheduleDto } from './dto/create-shift-schedule.dto';
import { ListShiftSchedulesDto } from './dto/list-shift-schedules.dto';
import { UpdateShiftScheduleDto } from './dto/update-shift-schedule.dto';
import { SchedulingService } from './scheduling.service';

@Controller('scheduling')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SchedulingController {
  constructor(private readonly schedulingService: SchedulingService) {}

  @Post('shifts')
  @RequirePermissions('scheduling.create')
  create(@Body() dto: CreateShiftScheduleDto, @CurrentUser() user: JwtPayload) {
    return this.schedulingService.create(dto, user.sub);
  }

  @Get('shifts')
  @RequirePermissions('scheduling.view')
  list(@Query() query: ListShiftSchedulesDto) {
    return this.schedulingService.listByPostAndRange(query);
  }

  @Patch('shifts/:id')
  @RequirePermissions('scheduling.edit')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateShiftScheduleDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.schedulingService.update(id, dto, user.sub);
  }

  @Delete('shifts/:id')
  @RequirePermissions('scheduling.delete')
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.schedulingService.remove(id, user.sub);
  }
}
