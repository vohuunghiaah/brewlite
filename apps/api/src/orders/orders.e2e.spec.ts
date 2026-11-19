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
});
