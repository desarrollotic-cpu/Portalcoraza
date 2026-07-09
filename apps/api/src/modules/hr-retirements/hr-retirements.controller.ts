import {
  Body,
  Controller,
  Get,
  Ip,
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
import { CreateRetirementDto } from './dto/create-retirement.dto';
import { UpdateRetirementDto } from './dto/update-retirement.dto';
import { HrRetirementsService } from './hr-retirements.service';

@Controller('hr/retirements')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class HrRetirementsController {
  constructor(private readonly service: HrRetirementsService) {}

  @Get()
  @RequirePermissions('retirements.view')
  list(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('reasonId') reasonId?: string,
  ) {
    return this.service.list({ from, to, reasonId });
  }

  @Get(':id')
  @RequirePermissions('retirements.view')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Get('associate/:associateId')
  @RequirePermissions('retirements.view')
  findByAssociate(@Param('associateId') associateId: string) {
    return this.service.findByAssociate(associateId);
  }

  @Post()
  @RequirePermissions('retirements.create')
  create(@Body() dto: CreateRetirementDto, @CurrentUser() user: JwtPayload, @Ip() ip: string) {
    return this.service.create(dto, user, ip);
  }

  @Patch(':id')
  @RequirePermissions('retirements.edit')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateRetirementDto,
    @CurrentUser() user: JwtPayload,
    @Ip() ip: string,
  ) {
    return this.service.update(id, dto, user, ip);
  }
}
