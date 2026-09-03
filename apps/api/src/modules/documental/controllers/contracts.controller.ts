import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { CreateContractDto } from '../dto/create-contract.dto';
import { ContractsService } from '../services/contracts.service';

@Controller('documental/contracts')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ContractsController {
  constructor(private readonly service: ContractsService) {}

  @Get()
  @RequirePermissions('documental.view')
  list() {
    return this.service.list();
  }

  @Get('next-code')
  @RequirePermissions('documental.view')
  nextCode() {
    return this.service.nextCode();
  }

  @Get('expiring')
  @RequirePermissions('documental.view')
  expiring(@Query('days') days?: string) {
    return this.service.expiring(Number(days ?? 30));
  }

  @Post()
  @RequirePermissions('documental.create')
  create(@Body() dto: CreateContractDto, @CurrentUser() user: JwtPayload) {
    return this.service.create(dto, user.sub);
  }
}
