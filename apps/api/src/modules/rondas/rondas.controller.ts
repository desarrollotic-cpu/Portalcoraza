import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { RondasService } from './rondas.service';

@Controller('rondas')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RondasController {
  constructor(private readonly rondas: RondasService) {}

  @Public()
  @Get('campo/asociados')
  asociados(@Query('postId') postId: string) {
    return this.rondas.asociadosCampo(postId);
  }

  @Public()
  @Post('campo/entrar')
  entrar(
    @Body() body: { postId: string; associateId: string; documentNumber: string },
  ) {
    return this.rondas.entrarCampo(body);
  }

  @Get('campo/puntos')
  @RequirePermissions('rondas.marcar')
  puntosCampo(@CurrentUser() user: JwtPayload) {
    if (!user.postId) throw new ForbiddenException('Sesión de campo inválida');
    return this.rondas.puntosDePost(user.postId, user.tenantId);
  }

  @Post('campo/marcaciones')
  @RequirePermissions('rondas.marcar')
  marcar(
    @CurrentUser() user: JwtPayload,
    @Body() body: { marcaciones: Array<{
      uuidCliente: string;
      puntoId: string;
      latitud: number;
      longitud: number;
      precisionMetros?: number;
      fechaHora: string;
      dispositivoId?: string;
    }> },
  ) {
    return this.rondas.registrarLote(user, body.marcaciones || []);
  }

  @Get('campo/mias')
  @RequirePermissions('rondas.marcar')
  mias(@CurrentUser() user: JwtPayload) {
    return this.rondas.mias(user);
  }

  @Get('puestos')
  @RequirePermissions('rondas.setup')
  puestos(@CurrentUser() user: JwtPayload) {
    return this.rondas.puestosActivos(user.tenantId);
  }

  @Get('hoy')
  @RequirePermissions('rondas.view')
  hoy(@CurrentUser() user: JwtPayload, @Query('postId') postId?: string) {
    return this.rondas.hoy(user, postId);
  }

  @Get('puntos')
  @RequirePermissions('rondas.view')
  puntos(@CurrentUser() user: JwtPayload, @Query('postId') postId?: string) {
    return this.rondas.puntosTodos(user, postId);
  }

  @Post('puntos')
  @RequirePermissions('rondas.setup')
  crear(
    @CurrentUser() user: JwtPayload,
    @Body()
    body: {
      postId: string;
      nombre: string;
      latitud: number;
      longitud: number;
      radioMetros?: number;
      orden?: number;
    },
  ) {
    return this.rondas.crearPunto(user, body);
  }

  @Patch('puntos/:id')
  @RequirePermissions('rondas.setup')
  actualizar(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body()
    body: {
      nombre?: string;
      latitud?: number;
      longitud?: number;
      radioMetros?: number;
      orden?: number;
      activo?: boolean;
    },
  ) {
    return this.rondas.actualizarPunto(user, id, body);
  }
}
