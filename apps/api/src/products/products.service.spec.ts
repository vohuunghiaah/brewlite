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

  it('returns an empty array when no products exist', async () => {
    repository.find.mockResolvedValue([]);
    await expect(service.findAll()).resolves.toEqual([]);
    expect(repository.find).toHaveBeenCalledWith({ order: { id: 'ASC' } });
  });

  it('returns a product or rejects missing IDs', async () => {
    repository.findOne.mockResolvedValueOnce({ id: 7, name: 'Cà phê Latte' }).mockResolvedValueOnce(null);
    await expect(service.findOne(7)).resolves.toEqual({ id: 7, name: 'Cà phê Latte' });
    expect(repository.findOne).toHaveBeenCalledWith({ where: { id: 7 } });
    await expect(service.findOne(99)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.findOne(99)).rejects.toThrow('Không tìm thấy sản phẩm có ID 99');
  });

  it('propagates repository errors when querying products', async () => {
    repository.find.mockRejectedValueOnce(new Error('Database query failure'));
    await expect(service.findAll()).rejects.toThrow('Database query failure');

    repository.findOne.mockRejectedValueOnce(new Error('Database connection lost'));
    await expect(service.findOne(1)).rejects.toThrow('Database connection lost');
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
