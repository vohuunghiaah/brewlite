import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { ProductSize, OrderStatus, UserRole } from '@prisma/client';
import { BadRequestException, ForbiddenException } from '@nestjs/common';

describe('OrdersService', () => {
  let service: OrdersService;

  const mockProduct = {
    id: 'prod-1',
    name: 'Cappuccino',
    basePrice: 45000,
    stock: 50,
    version: 1,
    isAvailable: true,
  };

  const mockPrisma = {
    product: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    promotion: {
      findUnique: jest.fn(),
    },
    order: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrisma)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  describe('create', () => {
    it('creates an order with accurately calculated pricing (Size + Toppings)', async () => {
      mockPrisma.product.findMany.mockResolvedValueOnce([mockProduct]);
      mockPrisma.order.create.mockImplementation(({ data }) =>
        Promise.resolve({
          id: 'ord-123',
          ...data,
        }),
      );

      const result = await service.create('user-1', {
        items: [
          {
            productId: 'prod-1',
            size: ProductSize.LARGE, // +10000
            toppings: ['Kem cheese'], // +10000
            quantity: 2,
          },
        ],
      });

      // Unit price = 45000 + 10000 (Large) + 10000 (Kem cheese) = 65000
      // Line total = 65000 * 2 = 130000
      expect(result.subtotal).toBe(130000);
      expect(result.totalAmount).toBe(130000);
      expect(result.status).toBe(OrderStatus.PENDING);
    });

    it('rejects order creation when requested quantity exceeds available stock', async () => {
      mockPrisma.product.findMany.mockResolvedValueOnce([
        { ...mockProduct, stock: 1 },
      ]);

      await expect(
        service.create('user-1', {
          items: [
            {
              productId: 'prod-1',
              size: ProductSize.MEDIUM,
              quantity: 5,
            },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findOne (IDOR Security Protection)', () => {
    it('allows access to order by the owning customer', async () => {
      mockPrisma.order.findUnique.mockResolvedValueOnce({
        id: 'ord-1',
        userId: 'user-1',
      });

      const order = await service.findOne('ord-1', 'user-1', UserRole.CUSTOMER);
      expect(order.id).toBe('ord-1');
    });

    it('allows access to order by staff member', async () => {
      mockPrisma.order.findUnique.mockResolvedValueOnce({
        id: 'ord-1',
        userId: 'user-2',
      });

      const order = await service.findOne('ord-1', 'staff-1', UserRole.STAFF);
      expect(order.id).toBe('ord-1');
    });

    it('throws ForbiddenException when another customer attempts to access the order (IDOR check)', async () => {
      mockPrisma.order.findUnique.mockResolvedValueOnce({
        id: 'ord-1',
        userId: 'user-2',
      });

      await expect(
        service.findOne('ord-1', 'attacker-user', UserRole.CUSTOMER),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
