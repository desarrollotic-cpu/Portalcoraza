import { newDb, IMemoryDb } from 'pg-mem';
import { DataSource, EntityTarget, ObjectLiteral } from 'typeorm';
import { v4 as uuid } from 'uuid';

/**
 * Postgres en memoria para las pruebas de integración.
 *
 * El proyecto no tiene Docker ni Postgres instalado, y apuntar a Supabase
 * significaría probar contra datos reales. pg-mem levanta un Postgres dentro
 * del propio proceso de Jest: arranca en milisegundos, cada prueba parte de
 * cero y no hay nada que limpiar después.
 *
 * No cubre todo el dialecto (vistas materializadas, RLS, DISTINCT ON), así que
 * lo que dependa de eso se prueba contra el Postgres real, no aquí.
 */
export interface TestDb {
  db: IMemoryDb;
  dataSource: DataSource;
  /** Vacía todas las tablas conservando el esquema. */
  reset(): Promise<void>;
}

export async function createTestDataSource(
  entities: EntityTarget<ObjectLiteral>[],
): Promise<TestDb> {
  const db = newDb({ autoCreateForeignKeyIndices: true });

  // Funciones que Postgres trae de serie y pg-mem no.
  // `impure` es imprescindible: sin ello pg-mem la considera determinista,
  // la evalúa una vez por sentencia y un INSERT de varias filas intenta meter
  // el mismo id en todas.
  db.public.registerFunction({
    name: 'gen_random_uuid',
    returns: 'uuid' as never,
    implementation: () => uuid(),
    impure: true,
  });
  db.public.registerFunction({
    name: 'uuid_generate_v4',
    returns: 'uuid' as never,
    implementation: () => uuid(),
    impure: true,
  });
  db.public.registerFunction({
    name: 'version',
    returns: 'text' as never,
    implementation: () => 'PostgreSQL 15.0 (pg-mem)',
  });
  db.public.registerFunction({
    name: 'current_database',
    returns: 'text' as never,
    implementation: () => 'test',
  });
  db.registerExtension('uuid-ossp', () => undefined);

  const dataSource: DataSource = db.adapters.createTypeormDataSource({
    type: 'postgres',
    entities,
    synchronize: true,
    logging: false,
  }) as DataSource;

  // initialize() ya crea el esquema con synchronize: true. Llamar después a
  // synchronize() a mano hace que TypeORM introspeccione information_schema,
  // que pg-mem no reproduce entero, y revienta.
  await dataSource.initialize();

  const backup = db.backup();

  return {
    db,
    dataSource,
    reset: async () => {
      // Restaurar el punto cero es mucho más rápido que borrar tabla a tabla.
      backup.restore();
    },
  };
}
