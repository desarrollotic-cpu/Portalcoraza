import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { CreateRetiredPersonnelDto } from '../dto/create-retired-personnel.dto';
import { RetiredPersonnelService } from '../services/retired-personnel.service';

@Controller('documental/retired-personnel')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RetiredPersonnelController {
  constructor(private readonly service: RetiredPersonnelService) {}

  @Get()
  @RequirePermissions('documental.view')
  list() {
    return this.service.list();
  }

  /** Autocompletar desde RRHH: escribe la cédula → el sistema trae el nombre y fecha de retiro. */
  @Get('lookup/:cedula')
  @RequirePermissions('documental.view')
  lookup(@Param('cedula') cedula: string) {
    return this.service.lookupAssociate(cedula.trim());
  }

  @Post()
  @RequirePermissions('documental.create')
  create(@Body() dto: CreateRetiredPersonnelDto, @CurrentUser() user: JwtPayload) {
    return this.service.create(dto, user.sub);
  }

  @Patch(':id/type')
  @RequirePermissions('documental.create')
  updateType(
    @Param('id') id: string,
    @Body() body: { personType: string },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.updateType(id, body.personType, user.sub);
  }
}
