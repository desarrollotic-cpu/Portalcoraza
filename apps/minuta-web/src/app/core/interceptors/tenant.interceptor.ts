import { HttpInterceptorFn } from '@angular/common/http';

export const TENANT_KEY = 'coraza_tenant_id';

export const tenantInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.url.includes('/auth/login')) {
    return next(req);
  }
  const tenantId = localStorage.getItem(TENANT_KEY);
  if (!tenantId) return next(req);
  return next(req.clone({ setHeaders: { 'X-Tenant-ID': tenantId } }));
};
