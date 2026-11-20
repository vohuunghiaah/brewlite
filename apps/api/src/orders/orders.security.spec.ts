import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import type { App } from 'supertest/types';
import { DataSource } from 'typeorm';

import { AuthModule } from '../auth/auth.module';
import { jwtConfig } from '../auth/jwt.config';
import { User } from '../users/entities/user.entity';
import { Order, OrderStatus } from './entities/order.entity';
import { OrderItem, ProductSize } from './entities/order-item.entity';
import { Product } from '../products/entities/product.entity';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

const TEST_SECRET = 'a-secure-and-long-enough-test-secret-at-least-32-chars';

describe('Orders Security & Anti-IDOR (Integration Tests)', () => {
  let app: INestApplication<App>;
  let jwt: JwtService;

  const mockUsers: User[] = [
    {
      id: 1,
      email: 'user1@brewlite.vn',
      passwordHash: 'hash1',
      createdAt: new Date('2026-01-01'),
    } as User,
    {
      id: 2,
      email: 'user2@brewlite.vn',
      passwordHash: 'hash2',
      createdAt: new Date('2026-01-02'),
    } as User,
  ];

  const mockOrdersUser1: Order[] = [
    {
      id: 101,
      orderCode: '#BL-1001',
      userId: 1,
      customerName: 'User 1',
      customerPhone: '0901111111',
      note: 'Order 1',
      totalAmount: '45000.00',
      status: OrderStatus.PAID,
      pickupMethod: 'AT_COUNTER',
      tableNumber: null,
      createdAt: new Date('2026-11-20T10:00:00Z'),
      items: [
        {
          id: 1,
          productId: 1,
          productName: 'Cà phê Phin',
          size: ProductSize.SMALL,
          toppings: [],
          quantity: 1,
          unitPrice: '45000.00',
          subtotal: '45000.00',
        } as OrderItem,
      ],
    } as Order,
  ];

  const mockOrdersUser2: Order[] = [
    {
      id: 201,
      orderCode: '#BL-2001',
      userId: 2,
      customerName: 'User 2',
      customerPhone: '0902222222',
      note: 'Order 2',
      totalAmount: '60000.00',
      status: OrderStatus.PENDING,
      pickupMethod: 'AT_TABLE',
      tableNumber: 'B-05',
      createdAt: new Date('2026-11-20T10:30:00Z'),
      items: [
        {
          id: 2,
          productId: 2,
          productName: 'Trà Đào Cam Sả',
          size: ProductSize.MEDIUM,
          toppings: ['Thạch đào'],
          quantity: 1,
          unitPrice: '60000.00',
          subtotal: '60000.00',
        } as OrderItem,
      ],
    } as Order,
  ];

  const mockOrderRepository = {
    find: jest.fn(({ where }: { where: { userId: number } }) => {
      if (where.userId === 1) return Promise.resolve(mockOrdersUser1);
      if (where.userId === 2) return Promise.resolve(mockOrdersUser2);
      return Promise.resolve([]);
    }),
    findOne: jest.fn(({ where }: { where: { id: number; userId: number } }) => {
      if (where.id === 101 && where.userId === 1) return Promise.resolve(mockOrdersUser1[0]);
      if (where.id === 201 && where.userId === 2) return Promise.resolve(mockOrdersUser2[0]);
      return Promise.resolve(null);
    }),
    existsBy: jest.fn(({ id }: { id: number }) => {
      // Order 101 exists and has an owner (User 1)
      if (id === 101) return Promise.resolve(true);
      // Order 201 exists and has an owner (User 2)
      if (id === 201) return Promise.resolve(true);
      return Promise.resolve(false);
    }),
    create: jest.fn((dto) => dto as Order),
    save: jest.fn((entity) => Promise.resolve(entity)),
  };

  const mockUserRepository = {
    findOne: jest.fn(({ where }: { where: { id?: number; email?: string } }) => {
      if (where.id) {
        return Promise.resolve(mockUsers.find((u) => u.id === where.id) ?? null);
      }
      if (where.email) {
        return Promise.resolve(mockUsers.find((u) => u.email === where.email) ?? null);
      }
      return Promise.resolve(null);
    }),
    findOneBy: jest.fn(({ id }: { id: number }) => {
      return Promise.resolve(mockUsers.find((u) => u.id === id) ?? null);
    }),
    save: jest.fn((u) => Promise.resolve(u)),
  };

  const mockProductRepository = {
    findOne: jest.fn(),
  };

  const mockDataSource = {
    transaction: jest.fn(),
  };

  beforeAll(async () => {
    jest.replaceProperty(process, 'env', {
      ...process.env,
      JWT_SECRET: TEST_SECRET,
      JWT_EXPIRES_IN: '3600',
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [jwtConfig],
        }),
        AuthModule,
      ],
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
      .overrideProvider(getRepositoryToken(User))
      .useValue(mockUserRepository)
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
    jwt = moduleFixture.get(JwtService);
  });

  afterAll(async () => {
    await app?.close();
    jest.restoreAllMocks();
  });

  it('1. GET /orders/me - rejects unauthenticated requests with 401 Unauthorized', async () => {
    await request(app.getHttpServer())
      .get('/orders/me')
      .expect(401);
  });

  it('2. GET /orders/me - rejects malformed or invalid Bearer token with 401 Unauthorized', async () => {
    await request(app.getHttpServer())
      .get('/orders/me')
      .set('Authorization', 'Bearer this.is.invalid.token')
      .expect(401);
  });

  it('3. GET /orders/me - returns only User 1 orders when authenticated as User 1', async () => {
    const tokenUser1 = await jwt.signAsync({ sub: '1' });

    const res = await request(app.getHttpServer())
      .get('/orders/me')
      .set('Authorization', `Bearer ${tokenUser1}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe(101);
    expect(res.body[0].userId).toBe(1);
    expect(res.body[0].customerName).toBe('User 1');
  });

  it('4. GET /orders/me - returns only User 2 orders when authenticated as User 2 (multi-tenant isolation)', async () => {
    const tokenUser2 = await jwt.signAsync({ sub: '2' });

    const res = await request(app.getHttpServer())
      .get('/orders/me')
      .set('Authorization', `Bearer ${tokenUser2}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe(201);
    expect(res.body[0].userId).toBe(2);
    expect(res.body[0].customerName).toBe('User 2');
  });

  it('5. GET /orders/me?userId=2 - ignores query parameter injection and respects verified JWT identity', async () => {
    const tokenUser1 = await jwt.signAsync({ sub: '1' });

    const res = await request(app.getHttpServer())
      .get('/orders/me?userId=2')
      .set('Authorization', `Bearer ${tokenUser1}`)
      .expect(200);

    // Must still return User 1's orders, NOT User 2
    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe(101);
    expect(res.body[0].userId).toBe(1);
  });

  it('6. GET /orders/:id - blocks User 2 from accessing User 1 order with 403 Forbidden (Anti-IDOR)', async () => {
    const tokenUser2 = await jwt.signAsync({ sub: '2' });

    // User 2 attempts to view Order 101 (owned by User 1)
    await request(app.getHttpServer())
      .get('/orders/101')
      .set('Authorization', `Bearer ${tokenUser2}`)
      .expect(403);
  });

  it('7. GET /orders/:id - returns 404 Not Found when order does not exist at all', async () => {
    const tokenUser1 = await jwt.signAsync({ sub: '1' });

    // Order 999 does not exist
    await request(app.getHttpServer())
      .get('/orders/999')
      .set('Authorization', `Bearer ${tokenUser1}`)
      .expect(404);
  });
});
