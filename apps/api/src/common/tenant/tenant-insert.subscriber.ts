import {
  DataSource,
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
} from 'typeorm';
import { GLOBAL_TENANT_SKIP_TABLES } from './patch-typeorm-tenant';
import { TenantContext } from './tenant.context';
import { CENTRAL_ORGANIZATION_ID } from './tenant.constants';

/**
 * Rellena tenantId en INSERT desde TenantContext (nunca en tablas globales).
 */
@EventSubscriber()
export class TenantInsertSubscriber implements EntitySubscriberInterface {
  constructor(dataSource: DataSource) {
    dataSource.subscribers.push(this);
  }

  beforeInsert(event: InsertEvent<Record<string, unknown>>): void {
    const table = event.metadata.tableName;
    if (GLOBAL_TENANT_SKIP_TABLES.has(table)) return;

    const col = event.metadata.findColumnWithPropertyPath('tenantId');
    if (!col) return;

    const entity = event.entity;
    if (!entity) return;
    if (entity['tenantId']) return;

    const fromCtx = TenantContext.getOptional();
    if (!fromCtx) {
      // Sin contexto (seed/script): DEFAULT DB / Cooperativa Central
      entity['tenantId'] = CENTRAL_ORGANIZATION_ID;
      return;
    }
    entity['tenantId'] = fromCtx;
  }
}
