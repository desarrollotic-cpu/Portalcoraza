import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
  StreamableFile,
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

  /** Consulta Operaciones: todas las novedades de un puesto en un mes. */
  @Get('operaciones/historial')
  @RequirePermissions('posts.view')
  operacionesHistorial(
    @CurrentUser() user: JwtPayload,
    @Query('postId') postId?: string,
    @Query('month') month?: string,
  ) {
    return this.minuta.operacionesHistorial(user, postId, month);
  }

  @Get('operaciones/pdf')
  @RequirePermissions('posts.view')
  @Header('Content-Type', 'application/pdf')
  @Header(
    'Content-Disposition',
    'attachment; filename="minuta-operaciones.pdf"',
  )
  async operacionesPdf(
    @CurrentUser() user: JwtPayload,
    @Query('postId') postId?: string,
    @Query('month') month?: string,
  ) {
    const buffer = await this.minuta.buildOperacionesPdf(user, postId, month);
    return new StreamableFile(buffer);
  }

  @Post('visitantes')
  @RequirePermissions('minuta.create')
  visitante(@CurrentUser() user: JwtPayload, @Body() dto: MinutaVisitanteDto) {
    return this.minuta.crearVisitante(user, dto);
  }

  @Post('correspondencia')
  @RequirePermissions('minuta.create')
  corr(@CurrentUser() user: JwtPayload, @Body() dto: MinutaCorrespondenciaDto) {
    return this.minuta.crearCorrespondencia(user, dto);
  }

  @Patch('correspondencia/:id/entregar')
  @RequirePermissions('minuta.create')
  entregar(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: MinutaEntregarCorrDto,
  ) {
    return this.minuta.entregarCorrespondencia(user, id, dto.recibidoPor);
  }

  @Post('contratistas')
  @RequirePermissions('minuta.create')
  cont(@CurrentUser() user: JwtPayload, @Body() dto: MinutaContratistaDto) {
    return this.minuta.crearContratista(user, dto);
  }

  @Post('domiciliarios')
  @RequirePermissions('minuta.create')
  dom(@CurrentUser() user: JwtPayload, @Body() dto: MinutaDomiciliarioDto) {
    return this.minuta.crearDomiciliario(user, dto);
  }

  @Post('incidentes')
  @RequirePermissions('minuta.create')
  inc(@CurrentUser() user: JwtPayload, @Body() dto: MinutaIncidenteDto) {
    return this.minuta.crearIncidente(user, dto);
  }

  @Post('servicio')
  @RequirePermissions('minuta.create')
  serv(@CurrentUser() user: JwtPayload, @Body() dto: MinutaServicioDto) {
    return this.minuta.crearServicio(user, dto);
  }

  @Post('entrega-puesto')
  @RequirePermissions('minuta.create')
  entrega(@CurrentUser() user: JwtPayload, @Body() dto: MinutaEntregaDto) {
    return this.minuta.crearEntrega(user, dto);
  }

  @Post(':id/salida')
  @RequirePermissions('minuta.create')
  salida(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: MinutaSalidaDto,
  ) {
    return this.minuta.registrarSalida(
      user,
      id,
      dto.tipo as 'VISITANTE' | 'CONTRATISTA' | 'DOMICILIARIO',
    );
  }
}
