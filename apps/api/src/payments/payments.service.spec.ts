import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import { PaymentsService } from './payments.service';
import { Payment, PaymentMethod, PaymentStatus } from './entities/payment.entity';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { Product } from '../products/entities/product.entity';
import { CreatePaymentDto, PickupMethod } from './dto/create-payment.dto';
import { MockPaymentGateway } from './mock-payment-gateway.service';

describe('PaymentsService - Mock Payment & OCC Concurrency Acceptance Tests (UC-10)', () => {
  let service: PaymentsService;
  let mockGateway: MockPaymentGateway;
  let paymentRepository: Partial<Record<keyof Repository<Payment>, jest.Mock>>;
  let orderRepository: Partial<Record<keyof Repository<Order>, jest.Mock>>;
  let productRepository: Partial<Record<keyof Repository<Product>, jest.Mock>>;
  let dataSource: Partial<DataSource>;

  let currentMockOrder: Order;
  let currentMockProduct: Product;
  let occAffectedRows = 1;

  const validUuid1 = '11111111-1111-4111-8111-111111111111';
  const validUuid2 = '22222222-2222-4222-8222-222222222222';
  const validUuid3 = '33333333-3333-4333-8333-333333333333';
  const validUuid4 = '44444444-4444-4444-8444-444444444444';
  const validUuid5 = '55555555-5555-4555-8555-555555555555';
  const validUuid6 = '66666666-6666-4666-8666-666666666666';
  const validUuid7 = '77777777-7777-4777-8777-777777777777';
  const validUuid8 = '88888888-8888-4888-8888-888888888888';
  const validUuid9 = '99999999-9999-4999-8999-999999999999';
  const validUuid10 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const validUuid11 = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const validUuid12 = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  const validUuid13 = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  const validUuid14 = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';

  const mockProduct = {
    id: 1,
    name: 'Cà phê Latte',
    price: '45000.00',
    stock: 50,
    version: 1,
    isAvailable: true,
  } as Product;

  const mockOrder = {
    id: 101,
    userId: 1,
    customerName: 'Nguyễn Văn Test',
    customerPhone: '0901234567',
    totalAmount: '45000.00',
    status: OrderStatus.PENDING,
    orderCode: null,
    pickupMethod: 'AT_COUNTER',
    tableNumber: null,
    items: [
      {
        id: 1,
        orderId: 101,
        productId: 1,
        productName: 'Cà phê Latte',
        quantity: 1,
        unitPrice: '45000.00',
        subtotal: '45000.00',
        size: 'SMALL',
        toppings: [],
        note: null,
        product: mockProduct,
      },
    ],
  } as unknown as Order;

  beforeEach(async () => {
    currentMockOrder = JSON.parse(JSON.stringify(mockOrder));
    currentMockProduct = JSON.parse(JSON.stringify(mockProduct));
    occAffectedRows = 1;

    paymentRepository = {
      findOne: jest.fn().mockResolvedValue(null),
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn((dto) => dto as Payment),
      save: jest.fn((entity) =>
        Promise.resolve(Object.assign({ id: 1 }, entity) as Payment),
      ),
    };

    orderRepository = {
      findOne: jest.fn().mockImplementation(async () => currentMockOrder),
      findOneBy: jest.fn().mockImplementation(async () => currentMockOrder),
      save: jest.fn().mockImplementation(async (entity) => entity as Order),
    };

    productRepository = {
      findOne: jest.fn().mockImplementation(async () => currentMockProduct),
    };

    dataSource = {
      transaction: jest.fn(async (cb: any) => {
        const manager = {
          findOne: jest.fn(async (entityClass: any, _options: any) => {
            if (entityClass === Order) {
              return currentMockOrder;
            }
            if (entityClass === Product) {
              return currentMockProduct;
            }
            if (entityClass === Payment) {
              return null;
            }
            return null;
          }),
          createQueryBuilder: jest.fn(() => ({
            update: jest.fn().mockReturnThis(),
            set: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            execute: jest.fn().mockImplementation(async () => ({ affected: occAffectedRows })),
          })),
          save: jest.fn(async (entityClass: any, entity: any) => {
            if (entityClass === Order) {
              currentMockOrder = entity;
              return entity;
            }
            if (entityClass === Payment) {
              return { id: 1, ...entity };
            }
            return entity;
          }),
          create: jest.fn((entityClass: any, dto: any) => dto),
          find: jest.fn(async () => currentMockOrder.items || []),
        };
        return cb(manager);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        MockPaymentGateway,
        {
          provide: getRepositoryToken(Payment),
          useValue: paymentRepository,
        },
        {
          provide: getRepositoryToken(Order),
          useValue: orderRepository,
        },
        {
          provide: getRepositoryToken(Product),
          useValue: productRepository,
        },
        {
          provide: DataSource,
          useValue: dataSource,
        },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    mockGateway = module.get<MockPaymentGateway>(MockPaymentGateway);
    await mockGateway.clear();
  });

  it('1. should process payment successfully and transition order PENDING -> PAID with stock deduction (TX2 Happy Path)', async () => {
    const dto: CreatePaymentDto = {
      orderId: 101,
      amount: 45000,
      method: PaymentMethod.MOMO,
      idempotencyKey: validUuid1,
      pickupMethod: PickupMethod.AT_COUNTER,
    };

    const result = await service.processPayment(dto, 1);

    expect(result.success).toBe(true);
    expect(result.status).toBe(PaymentStatus.SUCCESS);
    expect(result.order.status).toBe(OrderStatus.PAID);
    expect(result.order.orderCode).toBe('#BL-0101');
    expect(result.payment.idempotencyKey).toBe(validUuid1);
    expect(result.payment.transactionId).toMatch(/^GW-TX-/);
  });

  it('2. should return existing payment if same idempotencyKey is used (Idempotency - Alt-5 / Exc-8)', async () => {
    const existingPayment = {
      id: 99,
      orderId: 101,
      userId: 1,
      amount: '45000.00',
      method: PaymentMethod.VIETQR,
      status: PaymentStatus.SUCCESS,
      idempotencyKey: validUuid2,
      transactionId: 'GW-TX-SUCCESS-OLD',
      order: Object.assign(new Order(), currentMockOrder, { status: OrderStatus.PAID }),
    } as Payment;

    paymentRepository.findOne!.mockResolvedValue(existingPayment);

    const dto: CreatePaymentDto = {
      orderId: 101,
      amount: 45000,
      method: PaymentMethod.VIETQR,
      idempotencyKey: validUuid2,
    };

    const result = await service.processPayment(dto, 1);

    expect(result.isDuplicate).toBe(true);
    expect(result.success).toBe(true);
    expect(result.payment.id).toBe(99);
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('3. should reject payment if idempotencyKey belongs to another user (ForbiddenException - IDOR protection)', async () => {
    const existingPayment = {
      id: 99,
      orderId: 101,
      userId: 2, // different user
      amount: '45000.00',
      method: PaymentMethod.CARD,
      idempotencyKey: validUuid3,
    } as Payment;

    paymentRepository.findOne!.mockResolvedValue(existingPayment);

    const dto: CreatePaymentDto = {
      orderId: 101,
      amount: 45000,
      method: PaymentMethod.CARD,
      idempotencyKey: validUuid3,
    };

    await expect(service.processPayment(dto, 1)).rejects.toThrow(ForbiddenException);
  });

  it('4. should reject payment if idempotencyKey reused with different payload (ConflictException - 409)', async () => {
    const existingPayment = {
      id: 99,
      orderId: 101,
      userId: 1,
      amount: '45000.00',
      method: PaymentMethod.CARD,
      idempotencyKey: validUuid4,
    } as Payment;

    paymentRepository.findOne!.mockResolvedValue(existingPayment);

    const dto: CreatePaymentDto = {
      orderId: 102, // Different order!
      amount: 90000,
      method: PaymentMethod.CARD,
      idempotencyKey: validUuid4,
    };

    await expect(service.processPayment(dto, 1)).rejects.toThrow(ConflictException);
  });

  it('5. should reject payment if order not found (NotFoundException)', async () => {
    currentMockOrder = null as any;

    const dto: CreatePaymentDto = {
      orderId: 99999,
      amount: 45000,
      method: PaymentMethod.MOMO,
      idempotencyKey: validUuid5,
    };

    await expect(service.processPayment(dto, 1)).rejects.toThrow(NotFoundException);
  });

  it('6. should reject payment if order belongs to another user (ForbiddenException - IDOR protection)', async () => {
    currentMockOrder.userId = 999; // Another user owns this order

    const dto: CreatePaymentDto = {
      orderId: 101,
      amount: 45000,
      method: PaymentMethod.MOMO,
      idempotencyKey: validUuid6,
    };

    await expect(service.processPayment(dto, 1)).rejects.toThrow(ForbiddenException);
  });

  it('7. should reject payment if order is already PAID (BadRequestException)', async () => {
    currentMockOrder.status = OrderStatus.PAID;

    const dto: CreatePaymentDto = {
      orderId: 101,
      amount: 45000,
      method: PaymentMethod.MOMO,
      idempotencyKey: validUuid7,
    };

    await expect(service.processPayment(dto, 1)).rejects.toThrow(BadRequestException);
  });

  it('8. should reject payment if amount does not match order.totalAmount (BadRequestException - Exc-5)', async () => {
    const dto: CreatePaymentDto = {
      orderId: 101,
      amount: 10000, // Mismatched amount
      method: PaymentMethod.MOMO,
      idempotencyKey: validUuid8,
    };

    await expect(service.processPayment(dto, 1)).rejects.toThrow(BadRequestException);
  });

  it('9. should handle mock outcome FAILED: transition order to PAYMENT_FAILED, save FAILED payment, and do NOT deduct stock (Exc-6)', async () => {
    const dto: CreatePaymentDto = {
      orderId: 101,
      amount: 45000,
      method: PaymentMethod.CARD,
      idempotencyKey: validUuid9,
      mockOutcome: 'FAILED',
    };

    const result = await service.processPayment(dto, 1);

    expect(result.success).toBe(false);
    expect(result.status).toBe(PaymentStatus.FAILED);
    expect(result.order.status).toBe(OrderStatus.PAYMENT_FAILED);
    expect(result.payment.status).toBe(PaymentStatus.FAILED);
    expect(result.payment.transactionId).toMatch(/^GW-TX-/);
  });

  it('10. should handle mock outcome PENDING: return 202/PENDING state for reconciliation (EX-07 / FIX-04)', async () => {
    const dto: CreatePaymentDto = {
      orderId: 101,
      amount: 45000,
      method: PaymentMethod.VIETQR,
      idempotencyKey: validUuid10,
      mockOutcome: 'PENDING',
    };

    const result = await service.processPayment(dto, 1);

    expect(result.success).toBe(false);
    expect(result.status).toBe(PaymentStatus.PENDING);
    expect(result.order.status).toBe(OrderStatus.PENDING);
    expect(result.payment.status).toBe(PaymentStatus.PENDING);
  });

  it('11. should trigger BR-REFUND-OCC compensation when stock is depleted concurrently (ConflictException)', async () => {
    currentMockProduct.stock = 0; // Depleted concurrently!

    const dto: CreatePaymentDto = {
      orderId: 101,
      amount: 45000,
      method: PaymentMethod.MOMO,
      idempotencyKey: validUuid11,
    };

    await expect(service.processPayment(dto, 1)).rejects.toThrow(ConflictException);
    expect(currentMockOrder.status).toBe(OrderStatus.CANCELLED);
  });

  it('12. should trigger BR-REFUND-OCC compensation when OCC version conflict occurs (ConflictException)', async () => {
    occAffectedRows = 0; // 0 rows affected -> OCC version conflict!

    const dto: CreatePaymentDto = {
      orderId: 101,
      amount: 45000,
      method: PaymentMethod.VIETQR,
      idempotencyKey: validUuid12,
    };

    await expect(service.processPayment(dto, 1)).rejects.toThrow(ConflictException);
    expect(currentMockOrder.status).toBe(OrderStatus.CANCELLED);
  });

  it('13. should reconcile pending payment to PAID when gateway confirmed SUCCESS (FIX-09 & FIX-11)', async () => {
    const merchantReference = 'BL-REF-101-test-reconcile';
    // Đăng ký trạng thái SUCCESS tại mock gateway
    await mockGateway.charge({
      merchantReference,
      amount: 45000,
      method: PaymentMethod.MOMO,
      mockOutcome: 'SUCCESS',
    });

    const pendingPayment = {
      id: 50,
      orderId: 101,
      userId: 1,
      amount: '45000.00',
      method: PaymentMethod.MOMO,
      status: PaymentStatus.PENDING,
      idempotencyKey: validUuid13,
      merchantReference,
      order: currentMockOrder,
    } as Payment;

    paymentRepository.findOne!.mockResolvedValue(pendingPayment);

    const result = await service.reconcilePayment(validUuid13, 1);

    expect(result.success).toBe(true);
    expect(result.status).toBe(PaymentStatus.SUCCESS);
    expect(result.order.status).toBe(OrderStatus.PAID);
    expect(result.order.orderCode).toBe('#BL-0101');
  });

  it('14. should reject invalid idempotencyKey format with BadRequestException (FIX-10)', async () => {
    const dto: CreatePaymentDto = {
      orderId: 101,
      amount: 45000,
      method: PaymentMethod.MOMO,
      idempotencyKey: 'not-a-valid-uuid-v4',
    };

    await expect(service.processPayment(dto, 1)).rejects.toThrow(BadRequestException);
  });

  it('15. should block new payment key when order has active PENDING payment (FIX-11)', async () => {
    const inFlightPendingPayment = {
      id: 88,
      orderId: 101,
      userId: 1,
      amount: '45000.00',
      method: PaymentMethod.CARD,
      status: PaymentStatus.PENDING,
      idempotencyKey: validUuid10,
    } as Payment;

    dataSource.transaction = jest.fn(async (cb: any) => {
      const manager = {
        findOne: jest.fn(async (entityClass: any) => {
          if (entityClass === Order) return currentMockOrder;
          if (entityClass === Payment) return inFlightPendingPayment;
          return null;
        }),
      };
      return cb(manager);
    });

    const dto: CreatePaymentDto = {
      orderId: 101,
      amount: 45000,
      method: PaymentMethod.MOMO,
      idempotencyKey: validUuid14,
    };

    await expect(service.processPayment(dto, 1)).rejects.toThrow(ConflictException);
  });
});
