import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { Product } from './entities/product.entity';
import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';

describe('ProductsService', () => {
  let service: ProductsService;

  const repository = { find: jest.fn(), findOne: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProductsService, { provide: getRepositoryToken(Product), useValue: repository }],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  it('loads products in ascending ID order', async () => {
    repository.find.mockResolvedValue([{ id: 1 }]);
    await expect(service.findAll()).resolves.toEqual([{ id: 1 }]);
    expect(repository.find).toHaveBeenCalledWith({ order: { id: 'ASC' } });
  });

  it('returns a product or rejects missing IDs', async () => {
    repository.findOne.mockResolvedValueOnce({ id: 7 }).mockResolvedValueOnce(null);
    await expect(service.findOne(7)).resolves.toEqual({ id: 7 });
    expect(repository.findOne).toHaveBeenCalledWith({ where: { id: 7 } });
    await expect(service.findOne(99)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
