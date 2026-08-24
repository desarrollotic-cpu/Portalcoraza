import { parseRedisUrl } from './redis-url';

export function getRedisConnectionOptions(): {
  host: string;
  port: number;
  password?: string;
  maxRetriesPerRequest: null;
  enableReadyCheck: boolean;
} | null {
  const url = process.env.REDIS_URL?.trim();
  if (!url) return null;
  const parsed = parseRedisUrl(url);
  return {
    ...parsed,
    // BullMQ requiere maxRetriesPerRequest: null en el worker
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  };
}

export function isRedisConfigured(): boolean {
  return Boolean(process.env.REDIS_URL?.trim());
}
