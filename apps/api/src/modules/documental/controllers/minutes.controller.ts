import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { CreateMinuteDto } from '../dto/create-minute.dto';
import { MinutesService } from '../services/minutes.service';

@Controller('documental/minutes')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class MinutesController {
  constructor(private readonly service: MinutesService) {}

  @Get()
  @RequirePermissions('documental.view')
  list() {
    return this.service.list();
  }

  @Post()
  @RequirePermissions('documental.create')
  create(@Body() dto: CreateMinuteDto, @CurrentUser() user: JwtPayload) {
    return this.service.create(dto, user.sub);
  }
}
