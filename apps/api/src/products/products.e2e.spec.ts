import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { App } from 'supertest/types';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { Product } from './entities/product.entity';

describe('Products Endpoints (e2e)', () => {
  let app: INestApplication<App>;

  const mockProductList: Product[] = [
    {
      id: 1,
      name: 'Cà phê Latte',
      description: 'Espresso pha cùng sữa nóng và bọt sữa mềm mịn.',
      price: '45000',
      imageUrl: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93',
      isAvailable: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 2,
      name: 'Trà đào cam sả',
      description: 'Trà tươi thanh mát với đào giòn ngọt và hương sả thơm lừng.',
      price: '35000',
      imageUrl: 'https://images.unsplash.com/photo-1544145945-f90425340c7e',
      isAvailable: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockProductRepository = {
    find: jest.fn().mockImplementation(async () => mockProductList),
    findOne: jest.fn().mockImplementation(async (options: { where: { id: number } }) => {
      const target = mockProductList.find((p) => p.id === options.where.id);
      return target ?? null;
    }),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        ProductsService,
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
    await app.close();
  });

  it('1. GET /products -> HTTP 200 with product list', async () => {
    const response = await request(app.getHttpServer())
      .get('/products')
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBe(2);
    expect(response.body[0].id).toBe(1);
    expect(response.body[0].name).toBe('Cà phê Latte');
    expect(response.body[1].id).toBe(2);
    expect(response.body[1].name).toBe('Trà đào cam sả');
  });

  it('2. GET /products/1 -> HTTP 200 with product detail', async () => {
    const response = await request(app.getHttpServer())
      .get('/products/1')
      .expect(200);

    expect(response.body.id).toBe(1);
    expect(response.body.name).toBe('Cà phê Latte');
    expect(response.body.price).toBe('45000');
    expect(response.body.isAvailable).toBe(true);
  });

  it('3. GET /products/999 -> HTTP 404 when product not found', async () => {
    const response = await request(app.getHttpServer())
      .get('/products/999')
      .expect(404);

    expect(response.body.message).toBe('Không tìm thấy sản phẩm có ID 999');
    expect(response.body.error).toBe('Not Found');
  });

  it('4. GET /products/abc -> HTTP 400 when ID is not an integer', async () => {
    const response = await request(app.getHttpServer())
      .get('/products/abc')
      .expect(400);

    expect(response.body.statusCode).toBe(400);
    expect(response.body.message).toMatch(/numeric string is expected/);
  });
});
