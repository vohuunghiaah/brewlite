import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('BrewLite E2E Integration Test Suite (Full Flow)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let customerToken: string;
  let customerUser: any;
  let otherToken: string;
  let staffToken: string;
  let productId: string;
  let createdOrderId: string;
  let orderTotal: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('1. Health Check & Public Endpoints', () => {
    it('GET /health returns status ok', async () => {
      const res = await request(app.getHttpServer()).get('/health').expect(200);

      expect(res.body.status).toBe('ok');
      expect(res.body.service).toBe('brewlite-api');
    });

    it('GET /products returns list of available menu products', async () => {
      const res = await request(app.getHttpServer())
        .get('/products')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      const inStock = res.body.find((p: any) => p.isAvailable && p.stock >= 5);
      expect(inStock).toBeDefined();
      productId = inStock.id;
    });

    it('GET /products/:id returns single product with details', async () => {
      const res = await request(app.getHttpServer())
        .get(`/products/${productId}`)
        .expect(200);

      expect(res.body.id).toBe(productId);
      expect(res.body.name).toBeDefined();
      expect(Number(res.body.basePrice)).toBeGreaterThan(0);
    });
  });

  describe('2. Authentication & Authorization Flow', () => {
    const uniqueEmail = `test_${Date.now()}@example.com`;
    const otherEmail = `other_${Date.now()}@example.com`;

    it('POST /auth/register creates a new user and returns JWT token', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: uniqueEmail,
          password: 'Password123!',
          fullName: 'E2E Tester',
        })
        .expect(201);

      const token = res.body.accessToken || res.body.token;
      expect(token).toBeDefined();
      expect(res.body.user.email).toBe(uniqueEmail);
      customerToken = token;
      customerUser = res.body.user;
    });

    it('POST /auth/register rejects duplicate email with 409 Conflict', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: uniqueEmail,
          password: 'Password123!',
          fullName: 'Duplicate Tester',
        })
        .expect(409);
    });

    it('POST /auth/login returns token for registered credentials (HTTP 200)', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: uniqueEmail,
          password: 'Password123!',
        })
        .expect(200);

      const token = res.body.accessToken || res.body.token;
      expect(token).toBeDefined();
      expect(res.body.user.id).toBe(customerUser.id);
    });

    it('creates another user to test IDOR protections', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: otherEmail,
          password: 'Password123!',
          fullName: 'Other User',
        })
        .expect(201);

      otherToken = res.body.accessToken || res.body.token;
      expect(otherToken).toBeDefined();
    });

    it('POST /auth/login returns token for seeded staff member', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'staff@brewlite.com',
          password: 'Password123!',
        })
        .expect(200);

      staffToken = res.body.accessToken || res.body.token;
      expect(staffToken).toBeDefined();
      expect(res.body.user.role).toBe('STAFF');
    });
  });

  describe('3. Order Creation & Calculation', () => {
    it('POST /orders without auth fails with 401 Unauthorized', async () => {
      await request(app.getHttpServer())
        .post('/orders')
        .send({
          items: [
            {
              productId,
              size: 'MEDIUM',
              toppings: ['Trân châu đen'],
              quantity: 1,
            },
          ],
        })
        .expect(401);
    });

    it('POST /orders with empty items fails with 400 Bad Request', async () => {
      await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ items: [] })
        .expect(400);
    });

    it('POST /orders successfully creates order with server-recomputed prices', async () => {
      const res = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          items: [
            {
              productId,
              size: 'MEDIUM',
              toppings: ['Trân châu đen', 'Kem Cheese'],
              quantity: 2,
            },
          ],
          promoCode: 'BREW20',
          note: 'Giao tại bàn 3',
        });

      if (res.status !== 201) {
        console.error('DEBUG POST /orders FAIL:', JSON.stringify(res.body));
      }
      expect(res.status).toBe(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.orderCode).toMatch(/^#BL-/);
      expect(res.body.status).toBe('PENDING');
      expect(Number(res.body.discountAmount)).toBeGreaterThan(0);
      expect(Number(res.body.totalAmount)).toBeGreaterThan(0);

      createdOrderId = res.body.id;
      orderTotal = Number(res.body.totalAmount);
    });

    it('GET /orders/me returns customer order history', async () => {
      const res = await request(app.getHttpServer())
        .get('/orders/me')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.some((o: any) => o.id === createdOrderId)).toBe(true);
    });

    it('GET /orders/:id returns order details for owner', async () => {
      const res = await request(app.getHttpServer())
        .get(`/orders/${createdOrderId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(res.body.id).toBe(createdOrderId);
    });

    it('GET /orders/:id prevents IDOR (other user cannot view this order)', async () => {
      await request(app.getHttpServer())
        .get(`/orders/${createdOrderId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(403);
    });
  });

  describe('4. Mock Payment Service & Idempotency Key', () => {
    const idempotencyKey = `idemp-key-${Date.now()}`;

    it('POST /payments prevents payment by unauthorized/other user', async () => {
      await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${otherToken}`)
        .set('Idempotency-Key', idempotencyKey)
        .send({
          orderId: createdOrderId,
          amount: orderTotal,
          method: 'E_WALLET',
          mockOutcome: 'SUCCESS',
        })
        .expect(403);
    });

    it('POST /payments succeeds and transitions order to PAID', async () => {
      const res = await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${customerToken}`)
        .set('Idempotency-Key', idempotencyKey)
        .send({
          orderId: createdOrderId,
          amount: orderTotal,
          method: 'E_WALLET',
          mockOutcome: 'SUCCESS',
        })
        .expect(201);

      expect(res.body.status).toBe('SUCCESS');
      expect(res.body.payment.idempotencyKey).toBe(idempotencyKey);

      // Verify order status updated to PAID in DB
      const dbOrder = await prisma.order.findUnique({
        where: { id: createdOrderId },
      });
      expect(dbOrder?.status).toBe('PAID');
    });

    it('POST /payments with same Idempotency-Key returns duplicate result without recharging', async () => {
      const res = await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${customerToken}`)
        .set('Idempotency-Key', idempotencyKey)
        .send({
          orderId: createdOrderId,
          amount: orderTotal,
          method: 'E_WALLET',
          mockOutcome: 'SUCCESS',
        })
        .expect(201);

      expect(res.body.payment.idempotencyKey).toBe(idempotencyKey);
      expect(res.body.isDuplicate).toBe(true);
    });

    it('PATCH /orders/:id/status rejects status change by regular customer (RBAC 403)', async () => {
      await request(app.getHttpServer())
        .patch(`/orders/${createdOrderId}/status`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ status: 'PREPARING' })
        .expect(403);
    });

    it('PATCH /orders/:id/status allows staff to advance state from PAID to PREPARING', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/orders/${createdOrderId}/status`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ status: 'PREPARING' })
        .expect(200);

      expect(res.body.status).toBe('PREPARING');
    });

    it('PATCH /orders/:id/status rejects invalid transition (e.g. PREPARING to PENDING)', async () => {
      await request(app.getHttpServer())
        .patch(`/orders/${createdOrderId}/status`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ status: 'PENDING' })
        .expect(400);
    });
  });
});
