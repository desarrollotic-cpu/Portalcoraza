import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import {
  MEMORY_REQUEST_DELTA_MB,
  memoryMonitorEnabled,
  toMb,
} from './memory.config';

/**
 * Registra las peticiones que hacen crecer la memoria de forma notable.
 *
 * Con esto, la próxima alerta de Render viene acompañada de la ruta que la
 * provocó en lugar de obligarnos a deducirla por la hora.
 *
 * Solo mide RSS antes y después (`process.memoryUsage.rss()`, que no recorre el
 * heap) y no registra nada por debajo del umbral, así que en la operación
 * normal no añade ruido ni coste apreciable.
 */
@Injectable()
export class MemoryProfileInterceptor implements NestInterceptor {
  private readonly logger = new Logger('MemoriaPeticion');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http' || !memoryMonitorEnabled()) {
      return next.handle();
    }

    const req = context.switchToHttp().getRequest<{
      method?: string;
      originalUrl?: string;
      url?: string;
    }>();
    const before = process.memoryUsage.rss();
    const startedAt = Date.now();

    const report = () => {
      const deltaMb = toMb(process.memoryUsage.rss() - before);
      if (deltaMb < MEMORY_REQUEST_DELTA_MB) return;
      // Sin query string: puede llevar filtros y datos del usuario.
      const path = (req.originalUrl ?? req.url ?? '?').split('?')[0];
      this.logger.warn(
        `${req.method ?? '?'} ${path} +${deltaMb}MB en ${Date.now() - startedAt}ms ` +
          `(rss=${toMb(process.memoryUsage.rss())}MB)`,
      );
    };

    // El delta se mide igual si la petición falla: una que revienta por memoria
    // es justo la que interesa ver.
    return next.handle().pipe(tap({ next: report, error: report }));
  }
}
