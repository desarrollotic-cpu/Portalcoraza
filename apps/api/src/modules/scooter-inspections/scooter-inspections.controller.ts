import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequireAnyPermissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import {
  CreateScooterInspectionDto,
  ScooterInspectionsService,
} from './scooter-inspections.service';

@Controller('scooter-inspections')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ScooterInspectionsController {
  constructor(private readonly svc: ScooterInspectionsService) {}

  @Get('eligible-posts')
  @RequireAnyPermissions('scooter.create', 'minuta.create')
  eligible(@CurrentUser() user: JwtPayload) {
    return this.svc.eligiblePosts(user);
  }

  @Post()
  @RequireAnyPermissions('scooter.create', 'minuta.create')
  create(@CurrentUser() user: JwtPayload, @Body() body: CreateScooterInspectionDto) {
    return this.svc.create(user, body);
  }

  @Get()
  @RequireAnyPermissions('scooter.view', 'operations.view')
  list(
    @CurrentUser() user: JwtPayload,
    @Query('postId') postId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('apt') apt?: string,
    @Query('novelty') novelty?: string,
    @Query('q') q?: string,
    @Query('limit') limit?: string,
  ) {
    return this.svc.list(user, {
      postId,
      from,
      to,
      apt,
      novelty,
      q,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get(':id')
  @RequireAnyPermissions('scooter.view', 'operations.view')
  one(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.svc.getOne(user, id);
  }
}
