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
import { CurrentVigia } from '../vigia/current-vigia.decorator';
import { VigiaAuthGuard } from '../vigia/vigia-auth.guard';
import { VigiaJwtPayload } from '../vigia/vigia-jwt-payload';
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
export class MinutaController {
  constructor(private readonly minuta: MinutaService) {}

  @Get('diagnostico')
  diagnostico() {
    return this.minuta.diagnostico();
  }

  @Get('dashboard')
  @UseGuards(VigiaAuthGuard)
  dashboard(@CurrentVigia() v: VigiaJwtPayload) {
    return this.minuta.dashboard(v);
  }

  @Get('historial')
  @UseGuards(VigiaAuthGuard)
  historial(
    @CurrentVigia() v: VigiaJwtPayload,
    @Query('limite') limite?: string,
    @Query('tipo') tipo?: string,
  ) {
    return this.minuta.historial(v, Number(limite) || 20, tipo);
  }

  @Post('visitantes')
  @UseGuards(VigiaAuthGuard)
  visitante(@CurrentVigia() v: VigiaJwtPayload, @Body() dto: MinutaVisitanteDto) {
    return this.minuta.crearVisitante(v, dto);
  }

  @Post('correspondencia')
  @UseGuards(VigiaAuthGuard)
  corr(@CurrentVigia() v: VigiaJwtPayload, @Body() dto: MinutaCorrespondenciaDto) {
    return this.minuta.crearCorrespondencia(v, dto);
  }

  @Patch('correspondencia/:id/entregar')
  @UseGuards(VigiaAuthGuard)
  entregar(
    @CurrentVigia() v: VigiaJwtPayload,
    @Param('id') id: string,
    @Body() dto: MinutaEntregarCorrDto,
  ) {
    return this.minuta.entregarCorrespondencia(v, id, dto.recibidoPor);
  }

  @Post('contratistas')
  @UseGuards(VigiaAuthGuard)
  cont(@CurrentVigia() v: VigiaJwtPayload, @Body() dto: MinutaContratistaDto) {
    return this.minuta.crearContratista(v, dto);
  }

  @Post('domiciliarios')
  @UseGuards(VigiaAuthGuard)
  dom(@CurrentVigia() v: VigiaJwtPayload, @Body() dto: MinutaDomiciliarioDto) {
    return this.minuta.crearDomiciliario(v, dto);
  }

  @Post('incidentes')
  @UseGuards(VigiaAuthGuard)
  inc(@CurrentVigia() v: VigiaJwtPayload, @Body() dto: MinutaIncidenteDto) {
    return this.minuta.crearIncidente(v, dto);
  }

  @Post('servicio')
  @UseGuards(VigiaAuthGuard)
  serv(@CurrentVigia() v: VigiaJwtPayload, @Body() dto: MinutaServicioDto) {
    return this.minuta.crearServicio(v, dto);
  }

  @Post('entrega-puesto')
  @UseGuards(VigiaAuthGuard)
  entrega(@CurrentVigia() v: VigiaJwtPayload, @Body() dto: MinutaEntregaDto) {
    return this.minuta.crearEntrega(v, dto);
  }

  @Post(':id/salida')
  @UseGuards(VigiaAuthGuard)
  salida(@Param('id') id: string, @Body() dto: MinutaSalidaDto) {
    return this.minuta.registrarSalida(
      id,
      dto.tipo as 'VISITANTE' | 'CONTRATISTA' | 'DOMICILIARIO',
    );
  }
}
