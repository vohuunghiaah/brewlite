import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { App } from 'supertest/types';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { Product } from './entities/product.entity';
import { CatalogAdminGuard } from './guards/catalog-admin.guard';

describe('ProductsController Security & Authorization Guard', () => {
  let app: INestApplication<App>;

  const mockProduct: Product = {
    id: 1,
    name: 'Cà phê Latte',
    description: 'Cà phê Espresso kết hợp sữa tươi',
    price: '45000',
    imageUrl: null,
    isAvailable: true,
    stock: 50,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockProductRepository = {
    find: jest.fn().mockResolvedValue([mockProduct]),
    findOne: jest.fn().mockImplementation(async (options: { where: { id: number } }) => {
      return options.where.id === 1 ? mockProduct : null;
    }),
    create: jest.fn().mockImplementation((dto) => ({ id: 10, ...dto })),
    merge: jest.fn().mockImplementation((target, source) => Object.assign(target, source)),
    save: jest.fn().mockImplementation(async (entity) => entity),
    remove: jest.fn().mockResolvedValue(mockProduct),
  };

  beforeAll(async () => {
    process.env.CATALOG_ADMIN_KEY = 'test-secret-catalog-key-12345';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        ProductsService,
        CatalogAdminGuard,
        {
          provide: getRepositoryToken(Product),
          useValue: mockProductRepository,
        },
      ],
    }).compile();

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
    delete process.env.CATALOG_ADMIN_KEY;
    await app.close();
  });

  describe('1. Public Read-Only Endpoints', () => {
    it('GET /products is publicly accessible without credentials', async () => {
      const res = await request(app.getHttpServer()).get('/products').expect(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
    });

    it('GET /products/:id is publicly accessible without credentials', async () => {
      const res = await request(app.getHttpServer()).get('/products/1').expect(200);
      expect(res.body.name).toBe('Cà phê Latte');
    });
  });

  describe('2. Unauthenticated Mutation Rejection (Anonymous exploitation prevention)', () => {
    it('POST /products rejects anonymous request with 401 Unauthorized', async () => {
      const res = await request(app.getHttpServer())
        .post('/products')
        .send({
          name: 'Hacker Drink',
          description: 'Malicious entry',
          price: 50000,
          isAvailable: true,
          stock: 100,
        })
        .expect(401);

      expect(res.body.message).toContain('Yêu cầu xác thực quản trị viên danh mục');
    });

    it('PATCH /products/:id rejects anonymous request with 401 Unauthorized', async () => {
      const res = await request(app.getHttpServer())
        .patch('/products/1')
        .send({ price: 1000 })
        .expect(401);

      expect(res.body.message).toContain('Yêu cầu xác thực quản trị viên danh mục');
    });

    it('DELETE /products/:id rejects anonymous request with 401 Unauthorized', async () => {
      const res = await request(app.getHttpServer())
        .delete('/products/1')
        .expect(401);

      expect(res.body.message).toContain('Yêu cầu xác thực quản trị viên danh mục');
    });
  });

  describe('3. Invalid Key Rejection', () => {
    it('POST /products with invalid X-Catalog-Admin-Key returns 403 Forbidden', async () => {
      const res = await request(app.getHttpServer())
        .post('/products')
        .set('X-Catalog-Admin-Key', 'wrong-key')
        .send({
          name: 'Drink',
          price: 20000,
          isAvailable: true,
          stock: 10,
        })
        .expect(403);

      expect(res.body.message).toContain('Khóa quản trị danh mục không hợp lệ');
    });
  });

  describe('4. Authorized Mutation Success', () => {
    it('POST /products with valid X-Catalog-Admin-Key succeeds (201 Created)', async () => {
      const res = await request(app.getHttpServer())
        .post('/products')
        .set('X-Catalog-Admin-Key', 'test-secret-catalog-key-12345')
        .send({
          name: 'Cà phê đen đá',
          description: 'Robusta Đắk Lắk pha phin',
          price: '28000',
          isAvailable: true,
          stock: 45,
        })
        .expect(201);

      expect(res.body.name).toBe('Cà phê đen đá');
    });

    it('PATCH /products/1 with Bearer token matching key succeeds', async () => {
      const res = await request(app.getHttpServer())
        .patch('/products/1')
        .set('Authorization', 'Bearer test-secret-catalog-key-12345')
        .send({ stock: 60 })
        .expect(200);

      expect(res.body).toBeDefined();
    });
  });

  describe('5. Production Fail-Closed Behavior & Zero Secret Leakage (FIX-01)', () => {
    let originalEnv: string | undefined;
    let originalKey: string | undefined;

    beforeAll(() => {
      originalEnv = process.env.NODE_ENV;
      originalKey = process.env.CATALOG_ADMIN_KEY;
    });

    afterAll(() => {
      process.env.NODE_ENV = originalEnv;
      if (originalKey) {
        process.env.CATALOG_ADMIN_KEY = originalKey;
      } else {
        delete process.env.CATALOG_ADMIN_KEY;
      }
    });

    it('In production with missing CATALOG_ADMIN_KEY, mutation endpoints fail-closed (403 Forbidden)', async () => {
      process.env.NODE_ENV = 'production';
      delete process.env.CATALOG_ADMIN_KEY;

      const res = await request(app.getHttpServer())
        .post('/products')
        .set('X-Catalog-Admin-Key', 'any-attempted-key')
        .send({ name: 'Blocked Drink', price: '30000', stock: 10 })
        .expect(403);

      expect(res.body.message).toContain('Catalog mutation endpoints are disabled because CATALOG_ADMIN_KEY is not configured (fail-closed)');
      // Secret value must never be logged or echoed in response body
      expect(JSON.stringify(res.body)).not.toContain('test-secret-catalog-key-12345');
    });

    it('Public GET /products remains completely functional in production when CATALOG_ADMIN_KEY is missing', async () => {
      process.env.NODE_ENV = 'production';
      delete process.env.CATALOG_ADMIN_KEY;

      const res = await request(app.getHttpServer()).get('/products').expect(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });
  });
});
