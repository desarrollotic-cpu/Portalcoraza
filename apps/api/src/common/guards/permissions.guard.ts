import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtPayload } from '../../modules/auth/interfaces/jwt-payload.interface';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!required?.length) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest<{ user: JwtPayload }>();
    const permissions = user?.permissions ?? [];

    const hasAll = required.every((p) => permissions.includes(p));
    if (!hasAll) {
      throw new ForbiddenException('Permisos insuficientes');
    }

    return true;
  }
}
