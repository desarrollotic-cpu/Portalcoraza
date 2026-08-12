import {
  Body,
  Controller,
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
import {
  MinutaContratistaDto,
  MinutaCorrespondenciaDto,
  MinutaDomiciliarioDto,
  MinutaEntregaDto,
  MinutaEntregarCorrDto,
  MinutaIncidenteDto,
  MinutaSalidaDto,
  MinutaServicioDto,
  MinutaVisitanteDto,
} from './dto/minuta.dto';
import { MinutaService } from './minuta.service';

@Controller('minuta')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class MinutaController {
  constructor(private readonly minuta: MinutaService) {}

  @Get('diagnostico')
  @RequirePermissions('minuta.view')
  diagnostico() {
    return this.minuta.diagnostico();
  }

  @Get('dashboard')
  @RequirePermissions('minuta.view')
  dashboard(@CurrentUser() user: JwtPayload) {
    return this.minuta.dashboard(user);
  }

  @Get('historial')
  @RequirePermissions('minuta.view')
  historial(
    @CurrentUser() user: JwtPayload,
    @Query('limite') limite?: string,
    @Query('tipo') tipo?: string,
    @Query('scope') scope?: string,
  ) {
    return this.minuta.historial(
      user,
      Number(limite) || 20,
      tipo,
      scope === 'TODOS',
    );
  }

  @Post('visitantes')
  @RequirePermissions('minuta.view')
  visitante(@CurrentUser() user: JwtPayload, @Body() dto: MinutaVisitanteDto) {
    return this.minuta.crearVisitante(user, dto);
  }

  @Post('correspondencia')
  @RequirePermissions('minuta.view')
  corr(@CurrentUser() user: JwtPayload, @Body() dto: MinutaCorrespondenciaDto) {
    return this.minuta.crearCorrespondencia(user, dto);
  }

  @Patch('correspondencia/:id/entregar')
  @RequirePermissions('minuta.view')
  entregar(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: MinutaEntregarCorrDto,
  ) {
    return this.minuta.entregarCorrespondencia(user, id, dto.recibidoPor);
  }

  @Post('contratistas')
  @RequirePermissions('minuta.view')
  cont(@CurrentUser() user: JwtPayload, @Body() dto: MinutaContratistaDto) {
    return this.minuta.crearContratista(user, dto);
  }

  @Post('domiciliarios')
  @RequirePermissions('minuta.view')
  dom(@CurrentUser() user: JwtPayload, @Body() dto: MinutaDomiciliarioDto) {
    return this.minuta.crearDomiciliario(user, dto);
  }

  @Post('incidentes')
  @RequirePermissions('minuta.view')
  inc(@CurrentUser() user: JwtPayload, @Body() dto: MinutaIncidenteDto) {
    return this.minuta.crearIncidente(user, dto);
  }

  @Post('servicio')
  @RequirePermissions('minuta.view')
  serv(@CurrentUser() user: JwtPayload, @Body() dto: MinutaServicioDto) {
    return this.minuta.crearServicio(user, dto);
  }

  @Post('entrega-puesto')
  @RequirePermissions('minuta.view')
  entrega(@CurrentUser() user: JwtPayload, @Body() dto: MinutaEntregaDto) {
    return this.minuta.crearEntrega(user, dto);
  }

  @Post(':id/salida')
  @RequirePermissions('minuta.view')
  salida(@Param('id') id: string, @Body() dto: MinutaSalidaDto) {
    return this.minuta.registrarSalida(
      id,
      dto.tipo as 'VISITANTE' | 'CONTRATISTA' | 'DOMICILIARIO',
    );
  }
}
