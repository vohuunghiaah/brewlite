import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus, PaymentStatus, PaymentMethod } from '@prisma/client';
import { ForbiddenException, ConflictException } from '@nestjs/common';

describe('PaymentsService', () => {
  let service: PaymentsService;

  const mockOrder = {
    id: 'ord-100',
    orderCode: '#BL-9999',
    userId: 'user-1',
    status: OrderStatus.PENDING,
    totalAmount: 60000,
    items: [
      {
        id: 'item-1',
        productId: 'prod-1',
        quantity: 1,
        product: {
          id: 'prod-1',
          name: 'Cappuccino',
          stock: 10,
          version: 1,
        },
      },
    ],
  };

  const mockPrisma = {
    payment: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    order: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    product: {
      findUnique: jest.fn(),
      updateMany: jest.fn(),
    },
    user: {
      update: jest.fn(),
    },
    loyaltyTransaction: {
      create: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrisma)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  describe('processPayment', () => {
    it('returns existing payment and prevents duplicate charge when Idempotency-Key repeats', async () => {
      const existingPayment = {
        id: 'pay-existing',
        idempotencyKey: 'key-1234',
        status: PaymentStatus.SUCCESS,
        amount: 60000,
        order: mockOrder,
      };

      mockPrisma.payment.findUnique.mockResolvedValueOnce(existingPayment);

      const result = await service.processPayment('user-1', 'key-1234', {
        orderId: 'ord-100',
        method: PaymentMethod.E_WALLET,
        amount: 60000,
      });

      expect(result.isDuplicate).toBe(true);
      expect(result.success).toBe(true);
      expect(mockPrisma.order.update).not.toHaveBeenCalled();
    });

    it('successfully processes payment, transitions order to PAID and deducts stock with OCC', async () => {
      mockPrisma.payment.findUnique.mockResolvedValueOnce(null);
      mockPrisma.order.findUnique.mockResolvedValueOnce(mockOrder);
      mockPrisma.product.findUnique.mockResolvedValueOnce({
        id: 'prod-1',
        name: 'Cappuccino',
        stock: 10,
        version: 1,
      });
      mockPrisma.product.updateMany.mockResolvedValueOnce({ count: 1 });
      mockPrisma.order.update.mockResolvedValueOnce({
        ...mockOrder,
        status: OrderStatus.PAID,
      });
      mockPrisma.payment.create.mockResolvedValueOnce({
        id: 'pay-1',
        status: PaymentStatus.SUCCESS,
        amount: 60000,
      });

      const result = await service.processPayment('user-1', 'new-key-5678', {
        orderId: 'ord-100',
        method: PaymentMethod.BANK_CARD,
        amount: 60000,
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe(PaymentStatus.SUCCESS);
      expect(mockPrisma.product.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'prod-1',
          version: 1,
          stock: { gte: 1 },
        },
        data: {
          stock: { decrement: 1 },
          version: { increment: 1 },
        },
      });
    });

    it('transitions order to PAYMENT_FAILED when simulated payment outcome is FAILED', async () => {
      mockPrisma.payment.findUnique.mockResolvedValueOnce(null);
      mockPrisma.order.findUnique.mockResolvedValueOnce(mockOrder);
      mockPrisma.payment.create.mockResolvedValueOnce({
        id: 'pay-fail',
        status: PaymentStatus.FAILED,
      });

      const result = await service.processPayment('user-1', 'fail-key-000', {
        orderId: 'ord-100',
        method: PaymentMethod.E_WALLET,
        amount: 60000,
        mockOutcome: 'FAILED',
      });

      expect(result.success).toBe(false);
      expect(result.status).toBe(PaymentStatus.FAILED);
      expect(mockPrisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: OrderStatus.PAYMENT_FAILED },
        }),
      );
    });

    it('rejects payment for order belonging to another customer', async () => {
      mockPrisma.payment.findUnique.mockResolvedValueOnce(null);
      mockPrisma.order.findUnique.mockResolvedValueOnce({
        ...mockOrder,
        userId: 'victim-user',
      });

      await expect(
        service.processPayment('attacker-user', 'some-key', {
          orderId: 'ord-100',
          method: PaymentMethod.E_WALLET,
          amount: 60000,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws ConflictException when product version optimistic lock fails (race condition)', async () => {
      mockPrisma.payment.findUnique.mockResolvedValueOnce(null);
      mockPrisma.order.findUnique.mockResolvedValueOnce(mockOrder);
      mockPrisma.product.findUnique.mockResolvedValueOnce({
        id: 'prod-1',
        name: 'Cappuccino',
        stock: 10,
        version: 1,
      });
      // Simulate race condition: another concurrent transaction updated version first, so count = 0
      mockPrisma.product.updateMany.mockResolvedValueOnce({ count: 0 });

      await expect(
        service.processPayment('user-1', 'conflict-key', {
          orderId: 'ord-100',
          method: PaymentMethod.E_WALLET,
          amount: 60000,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });
});
