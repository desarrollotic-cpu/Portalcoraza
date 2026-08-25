import { Global, Logger, Module } from '@nestjs/common';
import Redis from 'ioredis';
import {
  getRedisConnectionOptions,
  isRedisConfigured,
} from '../../config/redis.config';
import { REDIS_CLIENT, TenantCacheService } from './tenant-cache.service';

const logger = new Logger('CacheModule');

const redisClientProvider = {
  provide: REDIS_CLIENT,
  useFactory: (): Redis | null => {
    if (!isRedisConfigured()) {
      logger.warn(
        'REDIS_URL ausente — TenantCacheService en modo pass-through (sin cache)',
      );
      return null;
    }
    const opts = getRedisConnectionOptions()!;
    const client = new Redis({
      host: opts.host,
      port: opts.port,
      password: opts.password,
      lazyConnect: false,
      enableReadyCheck: true,
      // maxRetriesPerRequest: 3 (default). No lo bajamos a null (eso es sólo para workers BullMQ).
    });
    client.on('ready', () => logger.log('Redis cache client ready'));
    client.on('error', (err) =>
      logger.warn(`Redis cache client error: ${err.message}`),
    );
    return client;
  },
};

@Global()
@Module({
  providers: [redisClientProvider, TenantCacheService],
  exports: [TenantCacheService],
})
export class CacheModule {}
