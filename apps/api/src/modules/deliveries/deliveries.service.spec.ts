import { ConflictException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SupabaseStorageService } from '../../common/services/supabase-storage.service';
import { AuditService } from '../audit/audit.service';
import { InventoryVariant } from '../inventory/entities/inventory-variant.entity';
import { Post } from '../posts/entities/post.entity';
import { DeliveriesService } from './deliveries.service';
import { DeliveryDetail } from './entities/delivery-detail.entity';
import { Delivery, DeliveryStatus } from './entities/delivery.entity';

describe('DeliveriesService', () => {
  let service: DeliveriesService;
  let deliveriesRepo: jest.Mocked<Repository<Delivery>>;
  let variantsRepo: jest.Mocked<Repository<InventoryVariant>>;

  const deliveryId = 'delivery-1';
  const variantId = 'variant-1';
  const userId = 'user-1';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeliveriesService,
        {
          provide: getRepositoryToken(Delivery),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
            create: jest.fn((entity) => entity),
          },
        },
        {
          provide: getRepositoryToken(DeliveryDetail),
          useValue: {
            save: jest.fn(),
            create: jest.fn((entity) => entity),
          },
        },
        {
          provide: getRepositoryToken(InventoryVariant),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Post),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('delivery-signatures'),
          },
        },
        {
          provide: AuditService,
          useValue: { log: jest.fn() },
        },
        {
          provide: SupabaseStorageService,
          useValue: {
            uploadPublicObject: jest.fn().mockResolvedValue('https://example.com/sig.png'),
          },
        },
      ],
    }).compile();

    service = module.get(DeliveriesService);
    deliveriesRepo = module.get(getRepositoryToken(Delivery));
    variantsRepo = module.get(getRepositoryToken(InventoryVariant));
  });

  describe('sign', () => {
    it('rechaza confirmación cuando el stock es insuficiente', async () => {
      const delivery: Partial<Delivery> = {
        id: deliveryId,
        status: DeliveryStatus.PENDING,
        details: [{ variantId, quantity: 5 } as DeliveryDetail],
      };

      deliveriesRepo.findOne.mockResolvedValue(delivery as Delivery);
      variantsRepo.findOne.mockResolvedValue({
        id: variantId,
        stockCurrent: 2,
      } as InventoryVariant);

      await expect(
        service.sign(deliveryId, { signatureData: 'data:image/png;base64,abc' }, userId),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('revert', () => {
    it('rechaza reversión fuera de la ventana de 5 días', async () => {
      const sixDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);
      const delivery: Partial<Delivery> = {
        id: deliveryId,
        status: DeliveryStatus.DELIVERED,
        deliveredAt: sixDaysAgo,
        details: [{ variantId, quantity: 1 } as DeliveryDetail],
      };

      deliveriesRepo.findOne.mockResolvedValue(delivery as Delivery);

      await expect(
        service.revert(deliveryId, { reason: 'Motivo válido de prueba' }, userId),
      ).rejects.toThrow(BadRequestException);
    });

    it('revierte entrega dentro de la ventana y devuelve stock', async () => {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const delivery: Partial<Delivery> = {
        id: deliveryId,
        status: DeliveryStatus.DELIVERED,
        deliveredAt: oneDayAgo,
        details: [{ variantId, quantity: 3 } as DeliveryDetail],
      };
      const variant = { id: variantId, stockCurrent: 10 } as InventoryVariant;

      deliveriesRepo.findOne.mockResolvedValue(delivery as Delivery);
      variantsRepo.findOne.mockResolvedValue(variant);
      deliveriesRepo.save.mockImplementation(async (entity) => entity as Delivery);

      const result = await service.revert(
        deliveryId,
        { reason: 'Error en talla entregada' },
        userId,
      );

      expect(result.status).toBe(DeliveryStatus.REVERTED);
      expect(variant.stockCurrent).toBe(13);
      expect(variantsRepo.save).toHaveBeenCalledWith(variant);
    });
  });
});
