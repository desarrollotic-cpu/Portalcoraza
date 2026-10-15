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
  requestLogEnabled,
  toMb,
} from './memory.config';
import { registrarFin, registrarInicio } from './peticiones-en-curso';

/**
 * Registra las peticiones que hacen crecer la memoria de forma notable, y
 * apunta en el registro de peticiones en curso cuál se está ejecutando.
 *
 * Lo segundo importa tanto como lo primero: si el proceso muere a mitad de una
 * petición, esta medición nunca llega a escribirse, y lo único que queda en el
 * log es lo que el muestreo periódico vaya contando sobre lo que había en
 * vuelo.
 *
 * Solo mide RSS antes y después (`process.memoryUsage.rss()`, que no recorre
 * el heap) y no registra nada por debajo del umbral.
 */
@Injectable()
export class MemoryProfileInterceptor implements NestInterceptor {
  private readonly logger = new Logger('MemoriaPeticion');
  private readonly trace = new Logger('Peticion');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http' || !memoryMonitorEnabled()) {
      return next.handle();
    }

    const req = context.switchToHttp().getRequest<{
      method?: string;
      originalUrl?: string;
      url?: string;
      user?: { sub?: string };
    }>();
    // Sin query string: puede llevar filtros y datos del usuario.
    const ruta = (req.originalUrl ?? req.url ?? '?').split('?')[0];
    const metodo = req.method ?? '?';

    const before = process.memoryUsage.rss();
    const startedAt = Date.now();
    const id = registrarInicio(metodo, ruta);

    // Una línea al empezar y otra al terminar. La de inicio es la que sobrevive si el proceso
    // muere a mitad de la petición: la última IN sin su OUT en el log señala a la culpable.
    // Los números largos (cédulas en la ruta) se tapan: el log no debe llevar datos personales.
    const rutaLog = ruta.replace(/\d{6,}/g, '#');
    const trazar = requestLogEnabled() && metodo !== 'OPTIONS' && !ruta.endsWith('/health');
    if (trazar) {
      this.trace.log(`IN ${metodo} ${rutaLog} user=${req.user?.sub ?? '-'} rss=${toMb(before)}MB`);
    }

    const report = () => {
      registrarFin(id);
      const deltaMb = toMb(process.memoryUsage.rss() - before);
      if (trazar) {
        this.trace.log(`OUT ${metodo} ${rutaLog} ${Date.now() - startedAt}ms ${deltaMb >= 0 ? '+' : ''}${deltaMb}MB`);
      }
      if (deltaMb < MEMORY_REQUEST_DELTA_MB) return;
      this.logger.warn(
        `${metodo} ${ruta} +${deltaMb}MB en ${Date.now() - startedAt}ms ` +
          `(rss=${toMb(process.memoryUsage.rss())}MB)`,
      );
    };

    // El delta se mide igual si la petición falla: una que revienta por memoria
    // es justo la que interesa ver.
    return next.handle().pipe(tap({ next: report, error: report }));
  }
}
