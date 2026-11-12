import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('ProductsService', () => {
  let service: ProductsService;
  let prisma: PrismaService;

  const mockProducts = [
    {
      id: 'prod-1',
      name: 'Cappuccino',
      description: 'Espresso with steamed milk foam',
      category: 'Cà phê',
      basePrice: 45000,
      imageUrl: 'http://img.com/cap.png',
      stock: 10,
      version: 1,
      isAvailable: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'prod-2',
      name: 'Trà Đào Cam Sả',
      description: 'Peach tea',
      category: 'Trà',
      basePrice: 40000,
      imageUrl: 'http://img.com/tea.png',
      stock: 20,
      version: 1,
      isAvailable: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockPrismaService = {
    product: {
      findMany: jest.fn().mockResolvedValue(mockProducts),
      findUnique: jest.fn().mockImplementation(({ where }) => {
        const found = mockProducts.find((p) => p.id === where.id);
        return Promise.resolve(found || null);
      }),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all products when no filters provided', async () => {
      const result = await service.findAll();
      expect(result).toHaveLength(2);
      expect(prisma.product.findMany).toHaveBeenCalled();
    });

    it('should filter by category when category is provided', async () => {
      await service.findAll('Cà phê');
      expect(prisma.product.findMany).toHaveBeenCalledWith({
        where: { category: 'Cà phê' },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter by search query when search is provided', async () => {
      await service.findAll(undefined, 'Cap');
      expect(prisma.product.findMany).toHaveBeenCalledWith({
        where: {
          name: {
            contains: 'Cap',
            mode: 'insensitive',
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findOne', () => {
    it('should return a single product by ID', async () => {
      const product = await service.findOne('prod-1');
      expect(product).toBeDefined();
      expect(product.name).toBe('Cappuccino');
    });

    it('should throw NotFoundException if product does not exist', async () => {
      await expect(service.findOne('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
