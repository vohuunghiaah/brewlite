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
import { CreatePaymentDto } from './dto/create-payment.dto';

describe('PaymentsService - Mock Payment & OCC Concurrency Acceptance Tests (UC-10)', () => {
  let service: PaymentsService;
  let paymentRepository: Partial<Record<keyof Repository<Payment>, jest.Mock>>;
  let orderRepository: Partial<Record<keyof Repository<Order>, jest.Mock>>;
  let productRepository: Partial<Record<keyof Repository<Product>, jest.Mock>>;
  let dataSource: Partial<DataSource>;

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
    paymentRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn((dto) => dto as Payment),
      save: jest.fn((entity) =>
        Promise.resolve(Object.assign({ id: 1 }, entity) as Payment),
      ),
    };

    orderRepository = {
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      save: jest.fn((entity) => Promise.resolve(entity as Order)),
    };

    productRepository = {
      findOne: jest.fn(),
    };

    dataSource = {
      transaction: jest.fn(async (cb: any) => {
        const manager = {
          findOne: jest.fn(async (entityClass: any, _options: any) => {
            if (entityClass === Product) {
              return { ...mockProduct };
            }
            return null;
          }),
          createQueryBuilder: jest.fn(() => ({
            update: jest.fn().mockReturnThis(),
            set: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            execute: jest.fn().mockResolvedValue({ affected: 1 }),
          })),
          save: jest.fn(async (entityClass: any, entity: any) => {
            if (entityClass === Order) {
              return entity;
            }
            if (entityClass === Payment) {
              return { id: 1, ...entity };
            }
            return entity;
          }),
          create: jest.fn((entityClass: any, dto: any) => dto),
        };
        return cb(manager);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
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
  });

  it('1. should process payment successfully and transition order PENDING -> PAID with stock deduction (TX2 Happy Path)', async () => {
    paymentRepository.findOne!.mockResolvedValue(null);
    orderRepository.findOne!.mockResolvedValue({ ...mockOrder });

    const dto: CreatePaymentDto = {
      orderId: 101,
      amount: 45000,
      method: PaymentMethod.MOMO,
      idempotencyKey: 'idem-key-001',
      pickupMethod: 'AT_COUNTER',
    };

    const result = await service.processPayment(dto, 1);

    expect(result.success).toBe(true);
    expect(result.status).toBe(PaymentStatus.SUCCESS);
    expect(result.order.status).toBe(OrderStatus.PAID);
    expect(result.order.orderCode).toBeDefined();
    expect(result.payment.idempotencyKey).toBe('idem-key-001');
    expect(result.payment.transactionId).toMatch(/^TX-SUCCESS-/);
  });

  it('2. should return existing payment if same idempotencyKey is used (Idempotency - Alt-5 / Exc-8)', async () => {
    const existingPayment = {
      id: 99,
      orderId: 101,
      userId: 1,
      amount: '45000.00',
      method: PaymentMethod.VIETQR,
      status: PaymentStatus.SUCCESS,
      idempotencyKey: 'idem-key-002',
      transactionId: 'TX-SUCCESS-OLD',
      order: { ...mockOrder, status: OrderStatus.PAID },
    } as Payment;

    paymentRepository.findOne!.mockResolvedValue(existingPayment);

    const dto: CreatePaymentDto = {
      orderId: 101,
      amount: 45000,
      method: PaymentMethod.VIETQR,
      idempotencyKey: 'idem-key-002',
    };

    const result = await service.processPayment(dto, 1);

    expect(result.isDuplicate).toBe(true);
    expect(result.success).toBe(true);
    expect(result.payment.id).toBe(99);
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('3. should reject payment if idempotencyKey belongs to another user (ForbiddenException)', async () => {
    const existingPayment = {
      id: 99,
      orderId: 101,
      userId: 2, // different user
      amount: '45000.00',
      idempotencyKey: 'stolen-idem-key',
    } as Payment;

    paymentRepository.findOne!.mockResolvedValue(existingPayment);

    const dto: CreatePaymentDto = {
      orderId: 101,
      amount: 45000,
      method: PaymentMethod.CARD,
      idempotencyKey: 'stolen-idem-key',
    };

    await expect(service.processPayment(dto, 1)).rejects.toThrow(ForbiddenException);
  });

  it('4. should reject payment if idempotencyKey reused with different payload (ConflictException)', async () => {
    const existingPayment = {
      id: 99,
      orderId: 101,
      userId: 1,
      amount: '45000.00',
      idempotencyKey: 'idem-key-mismatch',
    } as Payment;

    paymentRepository.findOne!.mockResolvedValue(existingPayment);

    const dto: CreatePaymentDto = {
      orderId: 102, // Different order!
      amount: 90000,
      method: PaymentMethod.CARD,
      idempotencyKey: 'idem-key-mismatch',
    };

    await expect(service.processPayment(dto, 1)).rejects.toThrow(ConflictException);
  });

  it('5. should reject payment if order not found (NotFoundException)', async () => {
    paymentRepository.findOne!.mockResolvedValue(null);
    orderRepository.findOne!.mockResolvedValue(null);

    const dto: CreatePaymentDto = {
      orderId: 99999,
      amount: 45000,
      method: PaymentMethod.MOMO,
      idempotencyKey: 'idem-key-005',
    };

    await expect(service.processPayment(dto, 1)).rejects.toThrow(NotFoundException);
  });

  it('6. should reject payment if order belongs to another user (ForbiddenException - IDOR protection)', async () => {
    paymentRepository.findOne!.mockResolvedValue(null);
    orderRepository.findOne!.mockResolvedValue({
      ...mockOrder,
      userId: 999, // Another user owns this order
    });

    const dto: CreatePaymentDto = {
      orderId: 101,
      amount: 45000,
      method: PaymentMethod.MOMO,
      idempotencyKey: 'idem-key-006',
    };

    await expect(service.processPayment(dto, 1)).rejects.toThrow(ForbiddenException);
  });

  it('7. should reject payment if order is already PAID (BadRequestException)', async () => {
    paymentRepository.findOne!.mockResolvedValue(null);
    orderRepository.findOne!.mockResolvedValue({
      ...mockOrder,
      status: OrderStatus.PAID,
    });

    const dto: CreatePaymentDto = {
      orderId: 101,
      amount: 45000,
      method: PaymentMethod.MOMO,
      idempotencyKey: 'idem-key-007',
    };

    await expect(service.processPayment(dto, 1)).rejects.toThrow(BadRequestException);
  });

  it('8. should reject payment if amount does not match order.totalAmount (BadRequestException - Exc-5)', async () => {
    paymentRepository.findOne!.mockResolvedValue(null);
    orderRepository.findOne!.mockResolvedValue({ ...mockOrder });

    const dto: CreatePaymentDto = {
      orderId: 101,
      amount: 10000, // Mismatched amount
      method: PaymentMethod.MOMO,
      idempotencyKey: 'idem-key-008',
    };

    await expect(service.processPayment(dto, 1)).rejects.toThrow(BadRequestException);
  });

  it('9. should handle mock outcome FAILED: transition order to PAYMENT_FAILED, save FAILED payment, and do NOT deduct stock (Exc-6)', async () => {
    paymentRepository.findOne!.mockResolvedValue(null);
    orderRepository.findOne!.mockResolvedValue({ ...mockOrder });

    const dto: CreatePaymentDto = {
      orderId: 101,
      amount: 45000,
      method: PaymentMethod.CARD,
      idempotencyKey: 'idem-key-009',
      mockOutcome: 'FAILED',
    };

    const result = await service.processPayment(dto, 1);

    expect(result.success).toBe(false);
    expect(result.status).toBe(PaymentStatus.FAILED);
    expect(result.order.status).toBe(OrderStatus.PAYMENT_FAILED);
    expect(result.payment.status).toBe(PaymentStatus.FAILED);
    expect(result.payment.transactionId).toMatch(/^TX-FAIL-/);
    expect(dataSource.transaction).not.toHaveBeenCalled(); // No stock deduction!
  });

  it('10. should reject payment if product has insufficient stock (BadRequestException - Exc-2)', async () => {
    paymentRepository.findOne!.mockResolvedValue(null);
    orderRepository.findOne!.mockResolvedValue({ ...mockOrder });

    dataSource.transaction = jest.fn(async (cb: any) => {
      const manager = {
        findOne: jest.fn(async () => ({
          ...mockProduct,
          stock: 0, // Out of stock!
        })),
        createQueryBuilder: jest.fn(),
      };
      return cb(manager);
    });

    const dto: CreatePaymentDto = {
      orderId: 101,
      amount: 45000,
      method: PaymentMethod.MOMO,
      idempotencyKey: 'idem-key-010',
    };

    await expect(service.processPayment(dto, 1)).rejects.toThrow(BadRequestException);
  });

  it('11. should detect OCC optimistic concurrency conflict when version mismatch occurs (ConflictException - Exc-11)', async () => {
    paymentRepository.findOne!.mockResolvedValue(null);
    orderRepository.findOne!.mockResolvedValue({ ...mockOrder });

    dataSource.transaction = jest.fn(async (cb: any) => {
      const manager = {
        findOne: jest.fn(async () => ({
          ...mockProduct,
          stock: 50,
          version: 1,
        })),
        createQueryBuilder: jest.fn(() => ({
          update: jest.fn().mockReturnThis(),
          set: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          execute: jest.fn().mockResolvedValue({ affected: 0 }), // 0 rows affected -> OCC conflict!
        })),
      };
      return cb(manager);
    });

    const dto: CreatePaymentDto = {
      orderId: 101,
      amount: 45000,
      method: PaymentMethod.VIETQR,
      idempotencyKey: 'idem-key-011',
    };

    await expect(service.processPayment(dto, 1)).rejects.toThrow(ConflictException);
  });
});
