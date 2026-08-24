import { ObjectLiteral, Repository } from 'typeorm';
import { TenantContext } from './tenant.context';

/** Tablas que NUNCA deben filtrarse por tenant (aunque el metadata mienta). */
export const GLOBAL_TENANT_SKIP_TABLES = new Set([
  'roles',
  'permissions',
  'role_permissions',
  'diagnosticos_cie10',
  'organizations',
]);

export function shouldApplyTenantFilter(
  repo: Repository<ObjectLiteral>,
): boolean {
  const table = repo.metadata.tableName;
  if (GLOBAL_TENANT_SKIP_TABLES.has(table)) {
    return false;
  }
  try {
    return Boolean(repo.metadata.findColumnWithPropertyPath('tenantId'));
  } catch {
    return false;
  }
}

export function injectTenantWhere<T>(
  where: T | T[] | undefined,
  tenantId: string,
): T | T[] {
  if (where == null || where === undefined) {
    return { tenantId } as T;
  }
  if (Array.isArray(where)) {
    return where.map((w) =>
      w && typeof w === 'object' ? { ...(w as object), tenantId } : w,
    ) as T[];
  }
  if (typeof where === 'object') {
    return { ...(where as object), tenantId } as T;
  }
  return where;
}

type FindOpts = { where?: unknown };

/**
 * Parchea Repository.find / findOne / findAndCount / findBy / findOneBy / count
 * para inyectar tenantId cuando la entidad lo tiene y hay TenantContext.
 * Debe llamarse una sola vez al arrancar (main.ts).
 */
export function patchTypeOrmTenantFilter(): void {
  const proto = Repository.prototype as Repository<ObjectLiteral> & {
    __tenantPatched?: boolean;
  };
  if (proto.__tenantPatched) return;
  proto.__tenantPatched = true;

  const wrap =
    <A extends unknown[], R>(
      original: (this: Repository<ObjectLiteral>, ...args: A) => R,
      pickOptions: (args: A) => { opts?: FindOpts; criteriaIndex?: number },
    ) =>
    function (this: Repository<ObjectLiteral>, ...args: A): R {
      const tenantId = TenantContext.getOptional();
      if (!tenantId || !shouldApplyTenantFilter(this)) {
        return original.apply(this, args);
      }

      const { opts, criteriaIndex } = pickOptions(args);
      if (opts) {
        opts.where = injectTenantWhere(opts.where as object, tenantId);
      }
      if (criteriaIndex != null && args[criteriaIndex] != null) {
        (args as unknown[])[criteriaIndex] = injectTenantWhere(
          args[criteriaIndex] as object,
          tenantId,
        );
      }
      return original.apply(this, args);
    };

  const find = proto.find;
  proto.find = wrap(find, (args) => ({
    opts: (args[0] as FindOpts) ?? (args[0] = {}),
  }));

  const findAndCount = proto.findAndCount;
  proto.findAndCount = wrap(findAndCount, (args) => ({
    opts: (args[0] as FindOpts) ?? (args[0] = {}),
  }));

  const findOne = proto.findOne;
  proto.findOne = wrap(findOne, (args) => ({
    opts: (args[0] as FindOpts) ?? (args[0] = {}),
  }));

  const findOneBy = proto.findOneBy;
  proto.findOneBy = wrap(findOneBy, (args) => ({
    criteriaIndex: 0,
  }));

  const findBy = proto.findBy;
  proto.findBy = wrap(findBy, (args) => ({
    criteriaIndex: 0,
  }));

  const count = proto.count;
  proto.count = wrap(count, (args) => ({
    opts: (args[0] as FindOpts) ?? (args[0] = {}),
  }));

  const countBy = proto.countBy;
  if (countBy) {
    proto.countBy = wrap(countBy, (args) => ({
      criteriaIndex: 0,
    }));
  }
}
