/** Columna tenant_id para entidades de negocio multi-tenant. */
import { Column } from 'typeorm';

/**
 * Mixin de columna TypeORM. Usar en la clase:
 *   @Column({ name: 'tenant_id', type: 'uuid' })
 *   tenantId!: string;
 *
 * (Helper documental; la columna se declara en cada entity.)
 */
export function TenantIdColumn(): PropertyDecorator {
  return Column({ name: 'tenant_id', type: 'uuid' });
}
