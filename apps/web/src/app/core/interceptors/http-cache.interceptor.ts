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

export const httpCacheInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
  // Solo cacheamos peticiones GET de consulta
  if (req.method !== 'GET') {
    // Si es POST/PUT/PATCH/DELETE, invalidamos la caché para tener datos frescos
    cache.clear();
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
