import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';

describe('ProductsController', () => {
  let controller: ProductsController;

  const productsService = { findAll: jest.fn(), findOne: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [{ provide: ProductsService, useValue: productsService }],
    }).compile();

    controller = module.get<ProductsController>(ProductsController);
  });

  it('delegates menu and detail requests', async () => {
    const product = { id: 7, name: 'Coffee', price: '45000', isAvailable: true };
    productsService.findAll.mockResolvedValue([product]);
    productsService.findOne.mockResolvedValue(product);
    await expect(controller.findAll()).resolves.toEqual([product]);
    await expect(controller.findOne(7)).resolves.toEqual(product);
    expect(productsService.findOne).toHaveBeenCalledWith(7);
  });

  it('handles empty product list from service', async () => {
    productsService.findAll.mockResolvedValue([]);
    await expect(controller.findAll()).resolves.toEqual([]);
  });

  it('propagates NotFoundException for missing product', async () => {
    productsService.findOne.mockRejectedValue(
      new NotFoundException('Không tìm thấy sản phẩm có ID 999'),
    );
    await expect(controller.findOne(999)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
