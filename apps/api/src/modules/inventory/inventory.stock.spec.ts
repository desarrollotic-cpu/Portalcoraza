import { ConflictException } from '@nestjs/common';
import { EntityManager, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { InventoryStock } from './entities/inventory-stock.entity';
import { InventoryVariant } from './entities/inventory-variant.entity';
import { InventoryService } from './inventory.service';

/**
 * Movimiento de existencias.
 *
 * Son las dos propiedades que no pueden fallar en un inventario: que una
 * entrega de varios renglones se aplique entera o no se aplique, y que dos
 * salidas simultáneas de la misma variante no se pisen.
 */
describe('InventoryService: existencias', () => {
  /** Almacén en memoria: clave `variante@bodega`. */
  function montar(inicial: Record<string, number> = {}) {
    const existencias = new Map(Object.entries(inicial));
    const transacciones: { abiertas: number; confirmadas: number } = {
      abiertas: 0,
      confirmadas: 0,
    };
    const bloqueos: string[] = [];

    const stockRepoDe = (em: EntityManager) => ({
      findOne: ({
        where,
        lock,
      }: {
        where: { variantId: string; warehouseId: string };
        lock?: { mode: string };
      }) => {
        const k = `${where.variantId}@${where.warehouseId}`;
        if (lock?.mode) bloqueos.push(`${k}:${lock.mode}`);
        if (!existencias.has(k)) return Promise.resolve(null);
        return Promise.resolve({
          variantId: where.variantId,
          warehouseId: where.warehouseId,
          quantity: existencias.get(k)!,
        });
      },
      create: (v: Record<string, unknown>) => v,
      save: (row: { variantId: string; warehouseId: string; quantity: number }) => {
        existencias.set(`${row.variantId}@${row.warehouseId}`, row.quantity);
        return Promise.resolve(row);
      },
      createQueryBuilder: () => ({
        select: () => ({
          where: () => ({
            getRawOne: () => Promise.resolve({ total: '0' }),
          }),
        }),
      }),
      _em: em,
    });

    const manager = {
      transaction: async <T>(fn: (em: EntityManager) => Promise<T>): Promise<T> => {
        transacciones.abiertas += 1;
        const em = {
          getRepository: (entidad: unknown) =>
            entidad === InventoryStock
              ? stockRepoDe(em as EntityManager)
              : { update: () => Promise.resolve(undefined) },
        } as unknown as EntityManager;
        const r = await fn(em);
        transacciones.confirmadas += 1;
        return r;
      },
    };

    const stockRepo = { manager } as unknown as Repository<InventoryStock>;
    const noop = {} as never;
    // Orden del constructor: categorías, ítems, variantes, movimientos,
    // existencias, bodegas, usuarios, auditoría, notificaciones.
    const svc = new InventoryService(
      noop,
      noop,
      noop,
      noop,
      stockRepo,
      noop,
      noop,
      {} as AuditService,
      noop,
    );

    return { svc, existencias, transacciones, bloqueos };
  }

  describe('un solo movimiento', () => {
    it('suma y devuelve la cantidad resultante', async () => {
      const { svc, existencias } = montar({ 'v1@b1': 5 });
      await expect(svc.changeStock('v1', 'b1', 3)).resolves.toBe(8);
      expect(existencias.get('v1@b1')).toBe(8);
    });

    it('resta', async () => {
      const { svc, existencias } = montar({ 'v1@b1': 5 });
      await expect(svc.changeStock('v1', 'b1', -2)).resolves.toBe(3);
      expect(existencias.get('v1@b1')).toBe(3);
    });

    it('crea la fila si la variante aún no tiene existencias en esa bodega', async () => {
      const { svc, existencias } = montar();
      await expect(svc.changeStock('nueva', 'b1', 4)).resolves.toBe(4);
      expect(existencias.get('nueva@b1')).toBe(4);
    });

    it('no deja el inventario en negativo', async () => {
      const { svc, existencias } = montar({ 'v1@b1': 2 });
      await expect(svc.changeStock('v1', 'b1', -3)).rejects.toThrow(
        ConflictException,
      );
      expect(existencias.get('v1@b1')).toBe(2);
    });

    it('pide bloqueo de escritura sobre la fila', async () => {
      // Sin bloqueo, dos salidas simultáneas leen el mismo valor y una se pierde.
      const { svc, bloqueos } = montar({ 'v1@b1': 5 });
      await svc.changeStock('v1', 'b1', -1);
      expect(bloqueos).toContain('v1@b1:pessimistic_write');
    });
  });

  describe('varios movimientos a la vez', () => {
    it('aplica todos los renglones de una entrega', async () => {
      const { svc, existencias } = montar({ 'v1@b1': 10, 'v2@b1': 10 });
      await svc.changeStocks([
        { variantId: 'v1', warehouseId: 'b1', delta: -2 },
        { variantId: 'v2', warehouseId: 'b1', delta: -3 },
      ]);
      expect(existencias.get('v1@b1')).toBe(8);
      expect(existencias.get('v2@b1')).toBe(7);
    });

    it('usa una sola transacción para todo el lote', async () => {
      // Es lo que hace que sea "todo o nada": antes abría una por renglón y un
      // fallo a mitad dejaba los primeros ya descontados.
      const { svc, transacciones } = montar({ 'v1@b1': 10, 'v2@b1': 10 });
      await svc.changeStocks([
        { variantId: 'v1', warehouseId: 'b1', delta: -1 },
        { variantId: 'v2', warehouseId: 'b1', delta: -1 },
      ]);
      expect(transacciones.abiertas).toBe(1);
      expect(transacciones.confirmadas).toBe(1);
    });

    it('si un renglón no tiene existencias, la transacción no se confirma', async () => {
      const { svc, transacciones } = montar({ 'v1@b1': 10, 'v2@b1': 1 });
      await expect(
        svc.changeStocks([
          { variantId: 'v1', warehouseId: 'b1', delta: -1 },
          { variantId: 'v2', warehouseId: 'b1', delta: -5 },
        ]),
      ).rejects.toThrow(ConflictException);

      expect(transacciones.abiertas).toBe(1);
      // Sin confirmar: la base deshace también el primer renglón.
      expect(transacciones.confirmadas).toBe(0);
    });

    it('una lista vacía no abre transacción', async () => {
      const { svc, transacciones } = montar();
      await svc.changeStocks([]);
      expect(transacciones.abiertas).toBe(0);
    });
  });
});
