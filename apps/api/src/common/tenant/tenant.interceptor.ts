import {
  CallHandler,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { Observable } from 'rxjs';
import { DataSource } from 'typeorm';
import { JwtPayload } from '../../modules/auth/interfaces/jwt-payload.interface';
import { TenantContext } from './tenant.context';
import { TenantQueryRunnerContext } from './tenant-query-runner.context';

/**
 * Anti-spoof X-Tenant-ID, TenantContext, y transacción con:
 *   SET LOCAL ROLE coraza_app
 *   set_config('app.tenant_id', …, true)
 * para que RLS de Postgres aplique en la misma conexión que TypeORM.
 */
@Injectable()
export class TenantInterceptor implements NestInterceptor {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

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

    const tenantId = user.tenantId;

    return new Observable((subscriber) => {
      const qr = this.dataSource.createQueryRunner();
      let finished = false;

      const finish = async (rollback: boolean) => {
        if (finished) return;
        finished = true;
        try {
          if (qr.isTransactionActive) {
            if (rollback) await qr.rollbackTransaction();
            else await qr.commitTransaction();
          }
        } catch {
          /* ignore */
        }
        try {
          if (!qr.isReleased) await qr.release();
        } catch {
          /* ignore */
        }
      };

      void (async () => {
        try {
          await qr.connect();
          await qr.startTransaction();
          // Si el login DB es superuser, RLS no aplica hasta SET ROLE.
          try {
            await qr.query(`SET LOCAL ROLE coraza_app`);
          } catch {
            // Rol aún no creado / sin GRANT: RLS puede no forzar; filtro app sigue.
          }
          await qr.query(`SELECT set_config('app.tenant_id', $1, true)`, [
            tenantId,
          ]);

          TenantContext.run(tenantId, () => {
            TenantQueryRunnerContext.run(qr, () => {
              next.handle().subscribe({
                next: (v) => subscriber.next(v),
                error: (e) => {
                  void finish(true).finally(() => subscriber.error(e));
                },
                complete: () => {
                  void finish(false).finally(() => subscriber.complete());
                },
              });
            });
          });
        } catch (e) {
          await finish(true);
          subscriber.error(e);
        }
      })();

      return () => {
        void finish(true);
      };
    });
  }
}
