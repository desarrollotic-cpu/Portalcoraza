import {
  HttpEvent,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { Observable, of, tap } from 'rxjs';

interface CacheEntry {
  response: HttpResponse<unknown>;
  expiry: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 25000; // 25 segundos para lectura ultra-rápida

const CACHEABLE_ENDPOINTS = [
  '/hr/catalogs',
  '/hr/positions',
  '/hr/work-centers',
  '/associates',
  '/roles',
  '/permissions',
  '/operational-posts',
  '/inventory/items',
  '/inventory/warehouses',
  '/inventory/categories',
  '/reception',
  '/sst/inspections',
  '/sst/plans',
  '/minuta',
  '/documental/trd',
  '/documental/analytics',
  '/documental/notifications',
  '/dashboard/stats',
  '/sig/dashboard',
  '/sig/indicadores',
  '/sig/objetivos',
  '/payroll-periods',
];

/** Prefijos de caché a invalidar según la URL mutada (POST/PUT/PATCH/DELETE). */
function cachePrefixesForMutation(url: string): string[] {
  const matched = CACHEABLE_ENDPOINTS.filter((ep) => url.includes(ep));
  const prefixes = new Set(matched);
  if (matched.some((ep) => !ep.startsWith('/dashboard'))) {
    prefixes.add('/dashboard/stats');
  }
  return [...prefixes];
}

function invalidateCacheForMutation(url: string): void {
  const prefixes = cachePrefixesForMutation(url);
  if (prefixes.length === 0) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (prefixes.some((p) => key.includes(p))) {
      cache.delete(key);
    }
  }
}

export const httpCacheInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
  // Solo cacheamos peticiones GET de consulta
  if (req.method !== 'GET') {
    invalidateCacheForMutation(req.url);
    return next(req);
  }

  const isCacheable = CACHEABLE_ENDPOINTS.some((url) => req.url.includes(url));
  if (!isCacheable) {
    return next(req);
  }

  const cacheKey = req.urlWithParams;
  const cached = cache.get(cacheKey);
  const now = Date.now();

  if (cached && cached.expiry > now) {
    return of(cached.response.clone());
  }

  return next(req).pipe(
    tap((event) => {
      if (event instanceof HttpResponse && event.status === 200) {
        cache.set(cacheKey, {
          response: event.clone(),
          expiry: now + CACHE_TTL_MS,
        });
      }
    }),
  );
};
