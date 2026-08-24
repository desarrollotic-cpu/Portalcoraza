import { HttpInterceptorFn } from '@angular/common/http';

const TENANT_KEY = 'coraza_tenant_id';

/** Envía X-Tenant-ID en cada petición autenticada (trazabilidad; el backend valida vs JWT). */
export const tenantInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.url.includes('/auth/login') || req.url.includes('/auth/recover-admin')) {
    return next(req);
  }

  const tenantId = localStorage.getItem(TENANT_KEY);
  if (!tenantId) {
    return next(req);
  }

  return next(
    req.clone({
      setHeaders: { 'X-Tenant-ID': tenantId },
    }),
  );
};

export { TENANT_KEY };
