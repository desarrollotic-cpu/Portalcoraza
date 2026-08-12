import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentVigia } from './current-vigia.decorator';
import {
  VigiaCierreTurnoDto,
  VigiaCreateMinutaDto,
  VigiaFirmarDotacionDto,
  VigiaLoginDto,
  VigiaReclamoNominaDto,
  VigiaSetupPinDto,
  VigiaSosDto,
  VigiaStartTurnoDto,
} from './dto/vigia.dto';
import { VigiaAuthGuard } from './vigia-auth.guard';
import { VigiaJwtPayload } from './vigia-jwt-payload';
import { VigiaService } from './vigia.service';

@Controller('vigia')
export class VigiaController {
  constructor(private readonly vigia: VigiaService) {}

  @Post('auth/login')
  login(@Body() dto: VigiaLoginDto) {
    return this.vigia.login(dto);
  }

  @Post('auth/setup')
  setup(@Body() dto: VigiaSetupPinDto) {
    return this.vigia.setupPin(dto);
  }

  @Post('auth/reset-pin')
  resetPin(@Body() dto: VigiaSetupPinDto) {
    return this.vigia.resetPin(dto);
  }

  @Get('puestos')
  @UseGuards(VigiaAuthGuard)
  puestos() {
    return this.vigia.listPuestos();
  }

  @Post('turnos')
  @UseGuards(VigiaAuthGuard)
  startTurno(
    @CurrentVigia() v: VigiaJwtPayload,
    @Body() dto: VigiaStartTurnoDto,
  ) {
    return this.vigia.startTurno(v.sub, dto);
  }

  @Post('turnos/:id/cierre')
  @UseGuards(VigiaAuthGuard)
  cierre(
    @CurrentVigia() v: VigiaJwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: VigiaCierreTurnoDto,
  ) {
    return this.vigia.cerrarTurno(v.sub, id, dto);
  }

  @Post('sos')
  @UseGuards(VigiaAuthGuard)
  sos(@CurrentVigia() v: VigiaJwtPayload, @Body() dto: VigiaSosDto) {
    return this.vigia.sos(v.sub, dto);
  }

  @Get('consignas')
  @UseGuards(VigiaAuthGuard)
  async consignas(@Query('puesto_id') puestoId: string) {
    if (!puestoId) return [];
    await this.vigia.seedConsignasIfEmpty(puestoId);
    return this.vigia.listConsignas(puestoId);
  }

  @Get('dotacion')
  @UseGuards(VigiaAuthGuard)
  dotacion(@CurrentVigia() v: VigiaJwtPayload) {
    return this.vigia.dotacion(v.sub);
  }

  @Post('dotacion/firmar')
  @UseGuards(VigiaAuthGuard)
  firmar(
    @CurrentVigia() v: VigiaJwtPayload,
    @Body() dto: VigiaFirmarDotacionDto,
  ) {
    return this.vigia.firmarDotacion(v.sub, dto);
  }

  @Post('dotacion/solicitar')
  @UseGuards(VigiaAuthGuard)
  solicitar(
    @CurrentVigia() v: VigiaJwtPayload,
    @Body() body: { motivo: string; fotoBase64: string; postId?: string; turnoId?: string },
  ) {
    return this.vigia.solicitarDotacion(v.sub, body);
  }

  @Get('nomina')
  @UseGuards(VigiaAuthGuard)
  async nomina(@CurrentVigia() v: VigiaJwtPayload) {
    await this.vigia.ensureNominaSample(v.sub);
    return this.vigia.listNomina(v.sub);
  }

  @Post('nomina/reclamar')
  @UseGuards(VigiaAuthGuard)
  reclamar(
    @CurrentVigia() v: VigiaJwtPayload,
    @Body() dto: VigiaReclamoNominaDto,
  ) {
    return this.vigia.reclamarNomina(v.sub, dto);
  }

  @Post('minutas')
  @UseGuards(VigiaAuthGuard)
  minuta(
    @CurrentVigia() v: VigiaJwtPayload,
    @Body() dto: VigiaCreateMinutaDto,
  ) {
    return this.vigia.createMinuta(v.sub, dto);
  }

  @Patch('minutas/:id/salida')
  @UseGuards(VigiaAuthGuard)
  salida(
    @CurrentVigia() v: VigiaJwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.vigia.salidaMinuta(id, v.sub);
  }

  @Get('minutas')
  @UseGuards(VigiaAuthGuard)
  listMinutas(@Query('puesto_id') puestoId: string) {
    if (!puestoId) return [];
    return this.vigia.listMinutas(puestoId);
  }

  @Get('turnero')
  @UseGuards(VigiaAuthGuard)
  turnero(@Query('year') year?: string, @Query('month') month?: string) {
    const now = new Date();
    const y = Number(year) || now.getFullYear();
    const m = Number(month) || now.getMonth() + 1;
    return this.vigia.turneroMes(y, m);
  }
}
