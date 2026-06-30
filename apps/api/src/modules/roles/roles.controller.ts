import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto';
import { RolesService } from './roles.service';

@Controller('roles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @RequirePermissions('roles.view')
  findAll() {
    return this.rolesService.findAll();
  }

  @Put(':id/permissions')
  @RequirePermissions('roles.manage')
  setPermissions(@Param('id') id: string, @Body() dto: UpdateRolePermissionsDto) {
    return this.rolesService.setPermissions(id, dto.permissionIds);
  }
}
