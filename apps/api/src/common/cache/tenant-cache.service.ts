import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  Optional,
} from '@nestjs/common';
import Redis from 'ioredis';
import { TenantContext } from '../tenant/tenant.context';

export const REDIS_CLIENT = Symbol('CORAZA_REDIS_CLIENT');

/**
 * Cache-aside con prefijo `t:{tenantId}:` para aislamiento multi-tenant.
 * Si no hay Redis inyectado (REDIS_URL ausente), es pass-through: sólo ejecuta el loader.
 *
 * ponytail: TTL por llamada, sin refresh en background — upgrade: cache-manager si crece.
 */
@Injectable()
export class TenantCacheService implements OnModuleDestroy {
  private readonly logger = new Logger(TenantCacheService.name);

  constructor(
    @Optional()
    @Inject(REDIS_CLIENT)
    private readonly redis: Redis | null,
  ) {}

  get enabled(): boolean {
    return !!this.redis;
  }

  private key(subkey: string): string {
    const tenantId = TenantContext.getOptional() || 'global';
    return `t:${tenantId}:${subkey}`;
  }

  async getOrSet<T>(
    subkey: string,
    ttlSec: number,
    loader: () => Promise<T>,
  ): Promise<T> {
    if (!this.redis) return loader();
    const k = this.key(subkey);
    try {
      const cached = await this.redis.get(k);
      if (cached) {
        return JSON.parse(cached) as T;
      }
    } catch (err) {
      this.logger.warn(`cache read fail ${k}: ${(err as Error).message}`);
    }
    const value = await loader();
    try {
      await this.redis.set(k, JSON.stringify(value), 'EX', ttlSec);
    } catch (err) {
      this.logger.warn(`cache write fail ${k}: ${(err as Error).message}`);
    }
    return value;
  }

  /** Invalida todas las llaves cacheadas bajo `prefix` para el tenant actual. Ej: `associates:` */
  async invalidatePrefix(prefix: string): Promise<number> {
    if (!this.redis) return 0;
    const pattern = this.key(`${prefix}*`);
    let deleted = 0;
    try {
      // SCAN evita bloquear Redis con KEYS.
      const stream = this.redis.scanStream({ match: pattern, count: 200 });
      const keysToDelete: string[] = [];
      await new Promise<void>((resolve, reject) => {
        stream.on('data', (keys: string[]) => {
          if (keys.length) keysToDelete.push(...keys);
        });
        stream.on('end', () => resolve());
        stream.on('error', reject);
      });
      if (keysToDelete.length) {
        deleted = await this.redis.unlink(...keysToDelete);
      }
    } catch (err) {
      this.logger.warn(
        `cache invalidate fail ${pattern}: ${(err as Error).message}`,
      );
    }
    return deleted;
  }

  async onModuleDestroy() {
    if (this.redis) {
      try {
        await this.redis.quit();
      } catch {
        /* ignore */
      }
    }
  }
}
