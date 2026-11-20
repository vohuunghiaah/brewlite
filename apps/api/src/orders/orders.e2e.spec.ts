import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { App } from 'supertest/types';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { Order } from './entities/order.entity';
import { OrderItem, ProductSize } from './entities/order-item.entity';
import { Product } from '../products/entities/product.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

describe('Orders Endpoints (e2e / integration)', () => {
  let app: INestApplication<App>;

  const mockProductLatte = {
    id: 1,
    name: 'Cà phê Latte',
    price: '45000.00',
    isAvailable: true,
    stock: 10,
  } as Product;

  const mockOrderRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((dto) => dto as Order),
    save: jest.fn((entity) =>
      Promise.resolve(Object.assign({ id: 101 }, entity) as Order),
    ),
  };

  const mockProductRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockDataSource = {
    transaction: jest.fn(async (cb: any) => {
      const manager = {
        getRepository: (entityClass: any) => {
          if (entityClass === Product) {
            return {
              findOne: jest.fn(async ({ where }: any) => {
                if (where.id === 1) return mockProductLatte;
                return null;
              }),
            };
          }
          if (entityClass === OrderItem) {
            return {
              create: jest.fn((itemDto: any) => itemDto),
            };
          }
          if (entityClass === Order) {
            return {
              create: jest.fn((orderDto: any) => orderDto),
              save: jest.fn(async (order: any) => ({
                id: 101,
                ...order,
              })),
            };
          }
          throw new Error(`Unexpected entity class: ${entityClass}`);
        },
      };
      return cb(manager);
    }),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        OrdersService,
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

  it('POST /orders - creates order with size, toppings, and item note; returns 201 with status PENDING', async () => {
    const payload = {
      customerName: 'Nguyễn Văn Test E2E',
      customerPhone: '0901234567',
      note: 'Giao nhanh trước 10h',
      items: [
        {
          productId: 1,
          size: ProductSize.MEDIUM,
          toppings: ['Kem cheese'],
          note: '50% đường, ít đá',
          quantity: 2,
        },
      ],
    };

    const res = await request(app.getHttpServer())
      .post('/orders')
      .send(payload)
      .expect(201);

    expect(res.body).toBeDefined();
    expect(res.body.id).toBe(101);
    expect(res.body.status).toBe('PENDING');
    expect(res.body.note).toBe('Giao nhanh trước 10h');
    // Unit price calculated authoritatively: 45.000 + 5.000 (M) + 10.000 (Kem cheese) = 60.000
    expect(res.body.items[0].unitPrice).toBe('60000.00');
    expect(res.body.items[0].subtotal).toBe('120000.00');
    expect(res.body.items[0].note).toBe('50% đường, ít đá');
    expect(res.body.totalAmount).toBe('120000.00');
  });

  it('POST /orders - rejects duplicate toppings with 400 Bad Request (FIX-04)', async () => {
    const payload = {
      customerName: 'Duplicate Toppings Tester',
      customerPhone: '0901234567',
      items: [
        {
          productId: 1,
          size: ProductSize.MEDIUM,
          toppings: ['Kem cheese', 'Kem cheese'],
          quantity: 1,
        },
      ],
    };

    const res = await request(app.getHttpServer())
      .post('/orders')
      .send(payload)
      .expect(400);

    expect(res.body.message).toContain(
      'Danh sách topping không được chứa các phần tử trùng lặp',
    );
  });

  it('POST /orders - rejects invalid size with 400 Bad Request', async () => {
    const payload = {
      customerName: 'Invalid Size Tester',
      customerPhone: '0901234567',
      items: [
        {
          productId: 1,
          size: 'SUPER_SIZE',
          quantity: 1,
        },
      ],
    };

    await request(app.getHttpServer())
      .post('/orders')
      .send(payload)
      .expect(400);
  });

  it('POST /orders - rejects non-existent product with 404 Not Found', async () => {
    const payload = {
      customerName: 'Not Found Product',
      customerPhone: '0901234567',
      items: [
        {
          productId: 99999,
          quantity: 1,
        },
      ],
    };

    await request(app.getHttpServer())
      .post('/orders')
      .send(payload)
      .expect(404);
  });

  it('GET /orders/me - retrieves user orders list without ParseIntPipe collision (FR-11, UC-06)', async () => {
    const mockOrders = [
      {
        id: 102,
        orderCode: '#BL-9216',
        userId: 1,
        status: 'PAID',
        pickupMethod: 'AT_COUNTER',
        totalAmount: '45000.00',
        createdAt: new Date('2026-11-20T10:15:00Z'),
        items: [
          {
            id: 2,
            productId: 1,
            productName: 'Cà phê Latte',
            size: ProductSize.SMALL,
            toppings: [],
            quantity: 1,
            unitPrice: '45000.00',
            subtotal: '45000.00',
            product: mockProductLatte,
          },
        ],
      },
      {
        id: 101,
        orderCode: null,
        userId: 1,
        status: 'PENDING',
        pickupMethod: 'AT_TABLE',
        totalAmount: '120000.00',
        createdAt: new Date('2026-11-20T09:00:00Z'),
        items: [],
      },
    ];

    mockOrderRepository.find.mockResolvedValueOnce(mockOrders);

    const res = await request(app.getHttpServer())
      .get('/orders/me')
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].id).toBe(102);
    expect(res.body[0].orderCode).toBe('#BL-9216');
    expect(res.body[0].status).toBe('PAID');
    expect(res.body[0].items[0].productName).toBe('Cà phê Latte');
    expect(mockOrderRepository.find).toHaveBeenCalledWith({
      where: { userId: 1 },
      relations: {
        items: {
          product: true,
        },
      },
      order: {
        createdAt: 'DESC',
      },
    });
  });

  it('GET /orders/me - returns empty array when user has no orders', async () => {
    mockOrderRepository.find.mockResolvedValueOnce([]);

    const res = await request(app.getHttpServer())
      .get('/orders/me')
      .expect(200);

    expect(res.body).toEqual([]);
  });

  it('GET /orders - backwards compatibility route returns user orders', async () => {
    mockOrderRepository.find.mockResolvedValueOnce([]);

    const res = await request(app.getHttpServer())
      .get('/orders')
      .expect(200);

    expect(res.body).toEqual([]);
  });

  it('GET /orders/:id - rejects non-numeric ID with 400 Bad Request', async () => {
    await request(app.getHttpServer())
      .get('/orders/not-a-number')
      .expect(400);
  });

  it('GET /orders/:id - rejects out-of-range ID with 400 Bad Request', async () => {
    await request(app.getHttpServer())
      .get('/orders/0')
      .expect(400);
  });
});
