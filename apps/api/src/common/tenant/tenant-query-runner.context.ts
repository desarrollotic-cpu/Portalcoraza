import { AsyncLocalStorage } from 'async_hooks';
import { QueryRunner } from 'typeorm';

const als = new AsyncLocalStorage<QueryRunner>();

/** QueryRunner de la request (transacción + SET LOCAL app.tenant_id / ROLE). */
export const TenantQueryRunnerContext = {
  run<T>(qr: QueryRunner, fn: () => T): T {
    return als.run(qr, fn);
  },
  getOptional(): QueryRunner | undefined {
    return als.getStore();
  },
};
