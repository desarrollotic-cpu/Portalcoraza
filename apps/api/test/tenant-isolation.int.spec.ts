import { Column, Entity, PrimaryGeneratedColumn, Repository } from 'typeorm';
import { TenantContext } from '../src/common/tenant/tenant.context';
import { patchTypeOrmTenantFilter } from '../src/common/tenant/patch-typeorm-tenant';
import { createTestDataSource, TestDb } from './pg-mem-datasource';

/**
 * El aislamiento entre organizaciones no se apoya solo en RLS: hay un parche
 * sobre Repository que inyecta `tenant_id` en cada consulta. Si ese parche
 * falla, una organización ve los datos de otra. Se prueba contra SQL real.
 */
@Entity('tenant_demo')
class TenantDemo {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'text' })
  nombre!: string;
}

const TENANT_A = '11111111-1111-1111-1111-111111111111';
const TENANT_B = '22222222-2222-2222-2222-222222222222';

describe('aislamiento por tenant (integración)', () => {
  let test: TestDb;
  let repo: Repository<TenantDemo>;

  beforeAll(async () => {
    patchTypeOrmTenantFilter();
    test = await createTestDataSource([TenantDemo]);
    repo = test.dataSource.getRepository(TenantDemo);
  });

  afterAll(async () => {
    if (test?.dataSource?.isInitialized) await test.dataSource.destroy();
  });

  beforeEach(async () => {
    await test.reset();
    // Datos de las dos organizaciones, insertados sin contexto de tenant.
    await repo.save([
      { tenantId: TENANT_A, nombre: 'puesto de A' },
      { tenantId: TENANT_A, nombre: 'otro de A' },
      { tenantId: TENANT_B, nombre: 'puesto de B' },
    ]);
  });

  it('find solo devuelve las filas del tenant activo', async () => {
    const vistoPorA = await TenantContext.run(TENANT_A, () => repo.find());
    expect(vistoPorA.map((r) => r.nombre).sort()).toEqual([
      'otro de A',
      'puesto de A',
    ]);

    const vistoPorB = await TenantContext.run(TENANT_B, () => repo.find());
    expect(vistoPorB.map((r) => r.nombre)).toEqual(['puesto de B']);
  });

  it('un where propio no abre la puerta a otro tenant', async () => {
    const fuga = await TenantContext.run(TENANT_B, () =>
      repo.find({ where: { nombre: 'puesto de A' } }),
    );
    expect(fuga).toHaveLength(0);
  });

  it('findOne no alcanza un id de otro tenant', async () => {
    const deA = await TenantContext.run(TENANT_A, () =>
      repo.findOne({ where: { nombre: 'puesto de A' } }),
    );
    expect(deA).not.toBeNull();

    const robado = await TenantContext.run(TENANT_B, () =>
      repo.findOne({ where: { id: deA!.id } }),
    );
    expect(robado).toBeNull();
  });

  it('sin contexto de tenant no filtra (procesos internos y crons)', async () => {
    const todo = await repo.find();
    expect(todo).toHaveLength(3);
  });

  it('count respeta el tenant activo', async () => {
    const enA = await TenantContext.run(TENANT_A, () => repo.count());
    const enB = await TenantContext.run(TENANT_B, () => repo.count());
    expect(enA).toBe(2);
    expect(enB).toBe(1);
  });
});
