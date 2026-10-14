/**
 * Pruebas de integración: corren contra un Postgres en memoria (pg-mem) y, en
 * algunos casos, levantan el stack HTTP de Nest completo. Van en config aparte
 * porque son más lentas que las unitarias y conviene poder correr cada grupo
 * por separado.
 *
 * @type {import('jest').Config}
 */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: 'test/.*\\.int\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  testEnvironment: 'node',
  // Un Postgres en memoria por fichero; en paralelo se pisan menos y va igual.
  maxWorkers: '50%',
  testTimeout: 30000,
};
