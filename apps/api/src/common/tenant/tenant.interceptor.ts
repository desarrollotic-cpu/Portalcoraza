import {
  CallHandler,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { JwtPayload } from '../../modules/auth/interfaces/jwt-payload.interface';
import { TenantContext } from './tenant.context';

/**
 * Establece TenantContext desde el JWT y rechaza spoofing de X-Tenant-ID.
 * Rutas públicas (sin req.user) no aplican filtro.
 */
@Injectable()
export class TenantInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<{
      user?: JwtPayload;
      headers: Record<string, string | string[] | undefined>;
    }>();

    const user = req.user;
    if (!user?.tenantId) {
      return next.handle();
    }

    const headerRaw = req.headers['x-tenant-id'];
    const header =
      typeof headerRaw === 'string'
        ? headerRaw
        : Array.isArray(headerRaw)
          ? headerRaw[0]
          : undefined;

    if (header && header !== user.tenantId) {
      throw new ForbiddenException(
        'X-Tenant-ID no coincide con el tenant del token',
      );
    }

    return new Observable((subscriber) => {
      TenantContext.run(user.tenantId, () => {
        next.handle().subscribe({
          next: (v) => subscriber.next(v),
          error: (e) => subscriber.error(e),
          complete: () => subscriber.complete(),
        });
      });
    });
  }
}
