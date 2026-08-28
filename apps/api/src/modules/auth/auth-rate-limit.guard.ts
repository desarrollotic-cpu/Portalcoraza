import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';

/** ponytail: in-memory por instancia; escalar → Redis o @nestjs/throttler */
@Injectable()
export class AuthRateLimitGuard implements CanActivate {
  private static readonly hits = new Map<string, { count: number; resetAt: number }>();
  private static readonly WINDOW_MS = 60_000;
  private static readonly MAX_ATTEMPTS = 10;

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{
      ip?: string;
      path: string;
      headers: Record<string, string | string[] | undefined>;
    }>();
    const forwarded = req.headers['x-forwarded-for'];
    const ip =
      (typeof forwarded === 'string' ? forwarded.split(',')[0]?.trim() : undefined) ||
      req.ip ||
      'unknown';
    const key = `${ip}:${req.path}`;
    const now = Date.now();
    const entry = AuthRateLimitGuard.hits.get(key);

    if (!entry || entry.resetAt <= now) {
      AuthRateLimitGuard.hits.set(key, {
        count: 1,
        resetAt: now + AuthRateLimitGuard.WINDOW_MS,
      });
      return true;
    }

    entry.count += 1;
    if (entry.count > AuthRateLimitGuard.MAX_ATTEMPTS) {
      throw new HttpException(
        'Demasiados intentos. Espera un minuto e intenta de nuevo.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }
}
