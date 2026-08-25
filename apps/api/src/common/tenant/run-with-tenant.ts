import { CENTRAL_ORGANIZATION_ID } from './tenant.constants';
import { TenantContext } from './tenant.context';

/** Ejecuta trabajo async con TenantContext (filtro TypeORM). Sin QR largo: el motor abre sus propias txs. */
export async function runWithTenantContext<T>(
  tenantId: string | undefined | null,
  fn: () => Promise<T>,
): Promise<T> {
  const id = tenantId || CENTRAL_ORGANIZATION_ID;
  return new Promise<T>((resolve, reject) => {
    TenantContext.run(id, () => {
      Promise.resolve()
        .then(fn)
        .then(resolve, reject);
    });
  });
}
