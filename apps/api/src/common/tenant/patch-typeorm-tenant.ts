import { ObjectLiteral, Repository } from 'typeorm';
import { TenantContext } from './tenant.context';
import { TenantQueryRunnerContext } from './tenant-query-runner.context';

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

function resolveRepo(
  self: Repository<ObjectLiteral>,
): Repository<ObjectLiteral> {
  const qr = TenantQueryRunnerContext.getOptional();
  if (!qr?.manager) return self;
  try {
    return qr.manager.getRepository(self.metadata.target as never);
  } catch {
    return self;
  }
}

/**
 * Parchea Repository.find/save/… para:
 * 1) Usar QueryRunner de la request (RLS + misma conexión)
 * 2) Inyectar tenantId en where cuando aplica
 */
export function patchTypeOrmTenantFilter(): void {
  const proto = Repository.prototype as Repository<ObjectLiteral> & {
    __tenantPatched?: boolean;
  };
  if (proto.__tenantPatched) return;
  proto.__tenantPatched = true;

  const wrapFind =
    <A extends unknown[], R>(
      original: (this: Repository<ObjectLiteral>, ...args: A) => R,
      pickOptions: (args: A) => { opts?: FindOpts; criteriaIndex?: number },
    ) =>
    function (this: Repository<ObjectLiteral>, ...args: A): R {
      const repo = resolveRepo(this);
      const tenantId = TenantContext.getOptional();
      if (!tenantId || !shouldApplyTenantFilter(repo)) {
        return original.apply(repo, args);
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
      return original.apply(repo, args);
    };

  const wrapMutate =
    <A extends unknown[], R>(
      original: (this: Repository<ObjectLiteral>, ...args: A) => R,
    ) =>
    function (this: Repository<ObjectLiteral>, ...args: A): R {
      const repo = resolveRepo(this);
      return original.apply(repo, args);
    };

  proto.find = wrapFind(proto.find, (args) => ({
    opts: (args[0] as FindOpts) ?? (args[0] = {}),
  }));
  proto.findAndCount = wrapFind(proto.findAndCount, (args) => ({
    opts: (args[0] as FindOpts) ?? (args[0] = {}),
  }));
  proto.findOne = wrapFind(proto.findOne, (args) => ({
    opts: (args[0] as FindOpts) ?? (args[0] = {}),
  }));
  proto.findOneBy = wrapFind(proto.findOneBy, (args) => ({
    criteriaIndex: 0,
  }));
  proto.findBy = wrapFind(proto.findBy, (args) => ({
    criteriaIndex: 0,
  }));
  proto.count = wrapFind(proto.count, (args) => ({
    opts: (args[0] as FindOpts) ?? (args[0] = {}),
  }));
  if (proto.countBy) {
    proto.countBy = wrapFind(proto.countBy, (args) => ({
      criteriaIndex: 0,
    }));
  }

  // Overloads de save/remove no tipan bien con wrap genérico
  (proto as { save: typeof proto.save }).save = wrapMutate(
    proto.save,
  ) as typeof proto.save;
  proto.insert = wrapMutate(proto.insert);
  proto.update = wrapMutate(proto.update);
  proto.delete = wrapMutate(proto.delete);
  if (proto.remove) {
    (proto as { remove: typeof proto.remove }).remove = wrapMutate(
      proto.remove,
    ) as typeof proto.remove;
  }
}
