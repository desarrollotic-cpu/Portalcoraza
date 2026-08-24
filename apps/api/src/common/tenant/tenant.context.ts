import { AsyncLocalStorage } from 'async_hooks';
import { ForbiddenException } from '@nestjs/common';

export interface TenantStore {
  tenantId: string;
}

const als = new AsyncLocalStorage<TenantStore>();

export const TenantContext = {
  run<T>(tenantId: string, fn: () => T): T {
    return als.run({ tenantId }, fn);
  },

  getOptional(): string | undefined {
    return als.getStore()?.tenantId;
  },

  require(): string {
    const id = this.getOptional();
    if (!id) {
      throw new ForbiddenException('Contexto de tenant no disponible');
    }
    return id;
  },
};
