import { ForbiddenException } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { InventoryMovementType } from './entities/inventory-movement.entity';

describe('InventoryService warehouse writes', () => {
  function buildService(overrides: Record<string, unknown> = {}) {
    const usersRepo = {
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
    };
    const service = Object.create(InventoryService.prototype) as InventoryService;
    Object.assign(service, {
      usersRepo,
      variantsRepo: { findOne: jest.fn() },
      movementsRepo: { save: jest.fn(), create: jest.fn((x) => x) },
      stockRepo: { manager: { transaction: jest.fn() } },
      warehousesRepo: { find: jest.fn().mockResolvedValue([]) },
      auditService: { log: jest.fn() },
      notificationsService: { sendToRole: jest.fn() },
      ...overrides,
    });
    return { service, usersRepo };
  }

  it('rechaza movimientos si el usuario no tiene almacén', async () => {
    const { service, usersRepo } = buildService();
    usersRepo.findOne.mockResolvedValue({ id: 'u1', warehouseId: null, warehouse: null });

    await expect(
      service.createMovement(
        {
          variantId: 'v1',
          movementType: InventoryMovementType.IN,
          quantity: 2,
          entryReason: 'Compra',
        },
        'u1',
      ),
    ).rejects.toThrow(ForbiddenException);
  });
});
