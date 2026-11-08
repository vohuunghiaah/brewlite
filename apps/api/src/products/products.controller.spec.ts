import { Test, TestingModule } from '@nestjs/testing';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

describe('ProductsController', () => {
  let controller: ProductsController;
  let service: ProductsService;

  const mockProduct = {
    id: 'prod-1',
    name: 'Cappuccino',
    category: 'Cà phê',
    basePrice: 45000,
    imageUrl: 'http://img.com/cap.png',
  };

  const mockProductsService = {
    findAll: jest.fn().mockResolvedValue([mockProduct]),
    findOne: jest.fn().mockResolvedValue(mockProduct),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        {
          provide: ProductsService,
          useValue: mockProductsService,
        },
      ],
    }).compile();

    controller = module.get<ProductsController>(ProductsController);
    service = module.get<ProductsService>(ProductsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return all products', async () => {
    const result = await controller.findAll('Cà phê', 'Cap');
    expect(result).toEqual([mockProduct]);
    expect(service.findAll).toHaveBeenCalledWith('Cà phê', 'Cap');
  });

  it('should return one product by ID', async () => {
    const result = await controller.findOne('prod-1');
    expect(result).toEqual(mockProduct);
    expect(service.findOne).toHaveBeenCalledWith('prod-1');
  });
});
