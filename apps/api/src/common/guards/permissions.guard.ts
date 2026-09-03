import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtPayload } from '../../modules/auth/interfaces/jwt-payload.interface';
import {
  PERMISSIONS_ANY_KEY,
  PERMISSIONS_KEY,
} from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    const requiredAny = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_ANY_KEY,
      [context.getHandler(), context.getClass()],
    );

    const { user } = context.switchToHttp().getRequest<{ user: JwtPayload }>();
    const permissions = user?.permissions ?? [];

    if (requiredAny?.length) {
      if (!requiredAny.some((p) => permissions.includes(p))) {
        throw new ForbiddenException('Permisos insuficientes');
      }
    }

    if (!required?.length) {
      return true;
    }

    const hasAll = required.every((p) => permissions.includes(p));
    if (!hasAll) {
      throw new ForbiddenException('Permisos insuficientes');
    }

    return true;
  }
}
