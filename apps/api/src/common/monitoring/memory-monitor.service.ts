import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { getHeapStatistics } from 'v8';
import {
  MEMORY_LIMIT_MB,
  MEMORY_SAMPLE_INTERVAL_MS,
  memoryMonitorEnabled,
  toMb,
} from './memory.config';

/**
 * Deja en los logs una muestra periódica del consumo de memoria.
 *
 * Separa heap de memoria externa a propósito: los Buffers (Excel, PDF) viven
 * fuera del heap, así que `--max-old-space-size` no los limita. Si una caída
 * viene precedida de `ext` creciendo, el culpable es un buffer, no una fuga de
 * objetos; si crece `heap`, es al revés.
 */
@Injectable()
export class MemoryMonitorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('Memoria');
  private timer: NodeJS.Timeout | null = null;
  private peakRss = 0;

  onModuleInit(): void {
    if (!memoryMonitorEnabled()) {
      this.logger.log('Instrumentación de memoria desactivada (MEMORY_MONITOR=off)');
      return;
    }
    // Deja constancia del tope real que aplicó V8. Si el Start Command no pasa
    // por `npm run start:prod`, --max-old-space-size no llega y aquí se ve:
    // en vez de ~460 MB aparece el valor que Node deduce de la RAM del host.
    this.logger.log(
      `Límite de heap de V8: ${toMb(getHeapStatistics().heap_size_limit)}MB`,
    );

    this.timer = setInterval(() => this.sample(), MEMORY_SAMPLE_INTERVAL_MS);
    // No debe mantener vivo el proceso al apagarse.
    this.timer.unref();
    this.sample();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  /** Pico de RSS observado, en MB (para pruebas y diagnóstico). */
  peakRssMb(): number {
    return toMb(this.peakRss);
  }

  private sample(): void {
    const m = process.memoryUsage();
    if (m.rss > this.peakRss) this.peakRss = m.rss;

    const pct = Math.round((m.rss / (MEMORY_LIMIT_MB * 1024 * 1024)) * 100);
    const line =
      `rss=${toMb(m.rss)}MB (${pct}% de ${MEMORY_LIMIT_MB}MB) ` +
      `heap=${toMb(m.heapUsed)}/${toMb(m.heapTotal)}MB ` +
      `ext=${toMb(m.external)}MB buffers=${toMb(m.arrayBuffers)}MB ` +
      `pico=${toMb(this.peakRss)}MB`;

    // Por encima del 80% el reinicio está cerca: que destaque en los logs.
    if (pct >= 80) this.logger.warn(line);
    else this.logger.log(line);
  }
}
