import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { VigiaJwtPayload } from './vigia-jwt-payload';

@Injectable()
export class VigiaAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const header = String(req.headers.authorization || '');
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!token) throw new UnauthorizedException('Sesión Vigía requerida');
    try {
      const payload = this.jwt.verify<VigiaJwtPayload>(token, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      });
      if (payload.aud !== 'vigia' || !payload.sub) {
        throw new UnauthorizedException('Token Vigía inválido');
      }
      req.vigia = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Sesión Vigía inválida o expirada');
    }
  }
}
