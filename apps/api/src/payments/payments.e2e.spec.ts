import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { App } from 'supertest/types';

import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { MockPaymentGateway } from './mock-payment-gateway.service';
import { Payment, PaymentMethod, PaymentStatus } from './entities/payment.entity';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { Product } from '../products/entities/product.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

describe('Payments Endpoints (e2e / integration)', () => {
  let app: INestApplication<App>;
  let mockGateway: MockPaymentGateway;

  const validUuid1 = 'a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1';
  const validUuid2 = 'b2b2b2b2-b2b2-4b2b-8b2b-b2b2b2b2b2b2';
  const validUuid3 = 'c3c3c3c3-c3c3-4c3c-8c3c-c3c3c3c3c3c3';
  const validUuid4 = 'd4d4d4d4-d4d4-4d4d-844d-d4d4d4d4d4d4';

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
    customerName: 'Nguyễn Văn Test E2E',
    customerPhone: '0901234567',
    totalAmount: '45000.00',
    status: OrderStatus.PENDING,
    orderCode: null,
    pickupMethod: 'AT_COUNTER',
    tableNumber: null,
    items: [
      {
        id: 1,
        productId: 1,
        productName: 'Cà phê Latte',
        quantity: 1,
        unitPrice: '45000.00',
        subtotal: '45000.00',
      },
    ],
  };

  const mockPaymentRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn((dto) => dto as Payment),
    save: jest.fn((entity) =>
      Promise.resolve(Object.assign({ id: 1, createdAt: new Date() }, entity) as Payment),
    ),
  };

  const mockOrderRepository = {
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    save: jest.fn((entity) => Promise.resolve(entity as Order)),
  };

  const mockProductRepository = {
    findOne: jest.fn(),
  };

  const mockDataSource = {
    transaction: jest.fn(async (cb: any) => {
      const manager = {
        findOne: jest.fn(async (entityClass: any) => {
          if (entityClass === Product) return Object.assign(new Product(), mockProduct);
          if (entityClass === Order) return Object.assign(new Order(), mockOrder);
          if (entityClass === Payment) return null;
          return null;
        }),
        createQueryBuilder: jest.fn(() => ({
          update: jest.fn().mockReturnThis(),
          set: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          execute: jest.fn().mockResolvedValue({ affected: 1 }),
        })),
        save: jest.fn(async (entityClass: any, entity: any) => {
          if (entityClass === Order) return entity;
          if (entityClass === Payment) return { id: 1, ...entity };
          return entity;
        }),
        create: jest.fn((entityClass: any, dto: any) => dto),
        find: jest.fn(async () => mockOrder.items || []),
      };
      return cb(manager);
    }),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        PaymentsService,
        MockPaymentGateway,
        {
          provide: getRepositoryToken(Payment),
          useValue: mockPaymentRepository,
        },
        {
          provide: getRepositoryToken(Order),
          useValue: mockOrderRepository,
        },
        {
          provide: getRepositoryToken(Product),
          useValue: mockProductRepository,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: any) => {
          const req = context.switchToHttp().getRequest();
          req.user = { id: 1, email: 'test@brewlite.vn' };
          return true;
        },
      })
      .compile();

    mockGateway = moduleFixture.get<MockPaymentGateway>(MockPaymentGateway);
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await mockGateway.clear();
  });

  it('POST /payments - successfully processes payment and returns 201 with SUCCESS status', async () => {
    mockPaymentRepository.findOne.mockResolvedValueOnce(null);
    mockOrderRepository.findOne.mockResolvedValueOnce({ ...mockOrder });

    const payload = {
      orderId: 101,
      amount: 45000,
      method: PaymentMethod.MOMO,
      idempotencyKey: validUuid1,
      pickupMethod: 'AT_COUNTER',
    };

    const res = await request(app.getHttpServer())
      .post('/payments')
      .send(payload)
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe(PaymentStatus.SUCCESS);
    expect(res.body.order.status).toBe(OrderStatus.PAID);
    expect(res.body.order.orderCode).toMatch(/^#BL-/);
  });

  it('POST /payments - supports Idempotency-Key provided exclusively via HTTP header (FR-08)', async () => {
    mockPaymentRepository.findOne.mockResolvedValueOnce(null);
    mockOrderRepository.findOne.mockResolvedValueOnce({ ...mockOrder });

    const payload = {
      orderId: 101,
      amount: 45000,
      method: PaymentMethod.MOMO,
      pickupMethod: 'AT_COUNTER',
    };

    const res = await request(app.getHttpServer())
      .post('/payments')
      .set('Idempotency-Key', validUuid2)
      .send(payload)
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.payment.idempotencyKey).toBe(validUuid2);
  });

  it('POST /payments - handles mockOutcome=FAILED with payment failure and PAYMENT_FAILED status', async () => {
    mockPaymentRepository.findOne.mockResolvedValueOnce(null);
    mockOrderRepository.findOne.mockResolvedValueOnce({ ...mockOrder });

    const payload = {
      orderId: 101,
      amount: 45000,
      method: PaymentMethod.CARD,
      idempotencyKey: validUuid3,
      mockOutcome: 'FAILED',
    };

    const res = await request(app.getHttpServer())
      .post('/payments')
      .send(payload)
      .expect(201);

    expect(res.body.success).toBe(false);
    expect(res.body.status).toBe(PaymentStatus.FAILED);
    expect(res.body.order.status).toBe(OrderStatus.PAYMENT_FAILED);
  });

  it('POST /payments/reconcile/:idempotencyKey - reconciles pending payment (FIX-09 & FIX-11)', async () => {
    const merchantRef = 'BL-REF-101-reconcile-e2e';
    await mockGateway.charge({
      merchantReference: merchantRef,
      amount: 45000,
      method: PaymentMethod.MOMO,
      mockOutcome: 'SUCCESS',
    });

    mockPaymentRepository.findOne.mockResolvedValueOnce({
      id: 1,
      orderId: 101,
      userId: 1,
      amount: '45000.00',
      method: PaymentMethod.MOMO,
      status: PaymentStatus.PENDING,
      idempotencyKey: validUuid4,
      merchantReference: merchantRef,
      order: { ...mockOrder },
    });

    const res = await request(app.getHttpServer())
      .post(`/payments/reconcile/${validUuid4}`)
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe(PaymentStatus.SUCCESS);
  });

  it('GET /payments/order/:orderId - returns payment records for order', async () => {
    mockOrderRepository.findOneBy.mockResolvedValueOnce({ id: 101, userId: 1 });
    mockPaymentRepository.find.mockResolvedValueOnce([
      {
        id: 1,
        orderId: 101,
        userId: 1,
        amount: '45000.00',
        method: PaymentMethod.MOMO,
        status: PaymentStatus.SUCCESS,
      },
    ]);

    const res = await request(app.getHttpServer())
      .get('/payments/order/101')
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
    expect(res.body[0].status).toBe(PaymentStatus.SUCCESS);
  });
});
