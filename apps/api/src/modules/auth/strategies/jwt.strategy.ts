import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../../users/users.service';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    if (payload.roleCode === 'RONDAS_CAMPO') {
      // La sesión de ronda no es un usuario del Portal: no hay a quién buscar
      // en `users`. Desde que el celular entra como la ronda (y no como una
      // persona), lo que debe traer el token es `rutaId`, no `associateId`.
      if (!payload.rutaId || !payload.postId || !payload.tenantId) {
        throw new UnauthorizedException();
      }
      return payload;
    }
    const user = await this.usersService.findById(payload.sub);
    if (!user?.isActive) {
      throw new UnauthorizedException();
    }
    return {
      ...payload,
      tenantId: user.tenantId || payload.tenantId,
    };
  }
}
