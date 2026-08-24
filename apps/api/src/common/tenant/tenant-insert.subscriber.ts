import {
  DataSource,
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
} from 'typeorm';
import { TenantContext } from './tenant.context';
import { CENTRAL_ORGANIZATION_ID } from './tenant.constants';

/**
 * Rellena tenantId en INSERT si la entidad tiene la columna y el valor viene vacío.
 */
@EventSubscriber()
export class TenantInsertSubscriber implements EntitySubscriberInterface {
  constructor(dataSource: DataSource) {
    dataSource.subscribers.push(this);
  }

  beforeInsert(event: InsertEvent<Record<string, unknown>>): void {
    const col = event.metadata.findColumnWithPropertyPath('tenantId');
    if (!col) return;

    const entity = event.entity;
    if (!entity) return;
    if (entity['tenantId']) return;

    entity['tenantId'] =
      TenantContext.getOptional() ?? CENTRAL_ORGANIZATION_ID;
  }
}
