/**
 * Parse mínimo de redis://[:password@]host:port[/db]
 * ponytail: no cubre TLS rediss:// con certs custom — upgrade: ioredis URL parser.
 */
export function parseRedisUrl(url: string): {
  host: string;
  port: number;
  password?: string;
  db?: number;
  tls?: Record<string, never>;
} {
  const u = new URL(url);
  const port = u.port ? Number(u.port) : 6379;
  const dbPath = u.pathname?.replace(/^\//, '');
  const db = dbPath ? Number(dbPath) : undefined;
  const out: {
    host: string;
    port: number;
    password?: string;
    db?: number;
    tls?: Record<string, never>;
  } = {
    host: u.hostname || '127.0.0.1',
    port: Number.isFinite(port) ? port : 6379,
  };
  if (u.password) out.password = decodeURIComponent(u.password);
  if (Number.isFinite(db)) out.db = db;
  if (u.protocol === 'rediss:') out.tls = {};
  return out;
}
