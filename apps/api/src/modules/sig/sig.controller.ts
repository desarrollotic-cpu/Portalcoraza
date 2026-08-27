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
  SigIndicadorDto,
  SigIndicadorPatchDto,
  SigResultadoDto,
} from './dto/sig.dto';
import { SigService } from './sig.service';

@Controller('sig')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('sig.view')
export class SigController {
  constructor(private readonly sig: SigService) {}

  @Get('diagnostico')
  diagnostico() {
    return this.sig.diagnostico();
  }

  @Get('sistemas')
  sistemas() {
    return this.sig.sistemasList();
  }

  @Get('objetivos')
  objetivos() {
    return this.sig.objetivosList();
  }

  @Get('indicadores')
  indicadores(
    @Query('area') area?: string,
    @Query('subsistema') subsistema?: string,
    @Query('objetivoId') objetivoId?: string,
    @Query('activo') activo?: string,
  ) {
    return this.sig.indicadoresList({ area, subsistema, objetivoId, activo });
  }

  @Post('indicadores')
  crearIndicador(@Body() dto: SigIndicadorDto) {
    return this.sig.crearIndicador(dto);
  }

  @Patch('indicadores/:id')
  patchIndicador(@Param('id') id: string, @Body() dto: SigIndicadorPatchDto) {
    return this.sig.patchIndicador(id, dto);
  }

  @Get('resultados')
  resultados(
    @Query('indicadorId') indicadorId: string,
    @Query('anio') anio?: string,
  ) {
    return this.sig.resultadosList(indicadorId, anio ? Number(anio) : undefined);
  }

  @Post('resultados')
  capturar(@CurrentUser() user: JwtPayload, @Body() dto: SigResultadoDto) {
    return this.sig.capturar(user, dto);
  }

  @Post('auto-calcular')
  autoCalcular(@CurrentUser() user: JwtPayload, @Body('anio') anio?: number) {
    return this.sig.autoCalcular(anio ? Number(anio) : undefined, user);
  }

  @Get('dashboard')
  dashboard(@Query('area') area?: string, @Query('anio') anio?: string) {
    return this.sig.dashboard(area, anio ? Number(anio) : undefined);
  }
}
