import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';

import { OrdersService } from './orders.service';
import { Order } from './entities/order.entity';
import { OrderItem, ProductSize } from './entities/order-item.entity';
import { Product } from '../products/entities/product.entity';
import { CreateOrderDto } from './dto/create-order.dto';

describe('OrdersService - Customization & Cart Acceptance Tests', () => {
  let service: OrdersService;
  let orderRepository: jest.Mocked<Partial<Repository<Order>>>;
  let productRepository: jest.Mocked<Partial<Repository<Product>>>;
  let dataSource: jest.Mocked<Partial<DataSource>>;

  const mockProductLatte = {
    id: 1,
    name: 'Cà phê Latte',
    price: '45000.00',
    isAvailable: true,
  } as Product;

  const mockProductUnavailable = {
    id: 2,
    name: 'Cold Brew Đào',
    price: '50000.00',
    isAvailable: false,
  } as Product;

  beforeEach(async () => {
    orderRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      existsBy: jest.fn().mockResolvedValue(false),
      create: jest.fn((dto) => dto as Order),
      save: jest.fn((entity) => Promise.resolve(Object.assign({ id: 101 }, entity) as Order)),
    };

    productRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
    };

    dataSource = {
      transaction: jest.fn(async (cb: any) => {
        const manager = {
          getRepository: (entityClass: any) => {
            if (entityClass === Product) {
              return {
                findOne: jest.fn(async ({ where }: any) => {
                  if (where.id === 1) return mockProductLatte;
                  if (where.id === 2) return mockProductUnavailable;
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
                save: jest.fn(async (order: any) => ({ id: 101, ...order })),
              };
            }
            throw new Error(`Unexpected entity class: ${entityClass}`);
          },
        };
        return cb(manager);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: getRepositoryToken(Order),
          useValue: orderRepository,
        },
        {
          provide: getRepositoryToken(Product),
          useValue: productRepository,
        },
        {
          provide: DataSource,
          useValue: dataSource,
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  it('1. should calculate unitPrice correctly for default SMALL size without toppings', async () => {
    const dto: CreateOrderDto = {
      customerName: 'Nguyễn Văn A',
      customerPhone: '0901234567',
      items: [
        {
          productId: 1,
          size: ProductSize.SMALL,
          toppings: [],
          quantity: 2,
        },
      ],
    };

    const result = await service.create(dto, 1);
    expect(result).toBeDefined();
    expect(result.status).toBe('PENDING');
    expect(result.items.length).toBe(1);
    expect(result.items[0].unitPrice).toBe('45000.00');
    expect(result.items[0].subtotal).toBe('90000.00');
    expect(result.totalAmount).toBe('90000.00');
  });

  it('2. should calculate unitPrice correctly for MEDIUM size (+5.000) and Kem cheese (+10.000)', async () => {
    const dto: CreateOrderDto = {
      customerName: 'Trần Thị B',
      customerPhone: '0912345678',
      note: '50% đường, ít đá',
      items: [
        {
          productId: 1,
          size: ProductSize.MEDIUM,
          toppings: ['Kem cheese'],
          quantity: 1,
        },
      ],
    };

    const result = await service.create(dto, 1);
    expect(result).toBeDefined();
    expect(result.status).toBe('PENDING');
    // 45.000 (base) + 5.000 (MEDIUM) + 10.000 (Kem cheese) = 60.000
    expect(result.items[0].unitPrice).toBe('60000.00');
    expect(result.items[0].subtotal).toBe('60000.00');
    expect(result.totalAmount).toBe('60000.00');
    expect(result.items[0].size).toBe(ProductSize.MEDIUM);
    expect(result.items[0].toppings).toEqual(['Kem cheese']);
  });

  it('3. should calculate unitPrice correctly for LARGE size (+10.000) with multiple toppings', async () => {
    const dto: CreateOrderDto = {
      customerName: 'Lê Văn C',
      customerPhone: '0988776655',
      items: [
        {
          productId: 1,
          size: ProductSize.LARGE,
          toppings: ['Trân châu trắng', 'Thạch đào'],
          quantity: 2,
        },
      ],
    };

    const result = await service.create(dto, 1);
    expect(result).toBeDefined();
    // 45.000 (base) + 10.000 (LARGE) + 8.000 + 8.000 = 71.000
    expect(result.items[0].unitPrice).toBe('71000.00');
    expect(result.items[0].subtotal).toBe('142000.00');
    expect(result.totalAmount).toBe('142000.00');
  });

  it('4. should reject order with invalid size', async () => {
    const dto: any = {
      customerName: 'Phạm D',
      customerPhone: '0933221100',
      items: [
        {
          productId: 1,
          size: 'EXTRA_LARGE',
          quantity: 1,
        },
      ],
    };

    await expect(service.create(dto, 1)).rejects.toThrow(BadRequestException);
  });

  it('5. should reject order with invalid topping', async () => {
    const dto: CreateOrderDto = {
      customerName: 'Hoàng E',
      customerPhone: '0944556677',
      items: [
        {
          productId: 1,
          size: ProductSize.SMALL,
          toppings: ['Topping Không Tồn Tại'],
          quantity: 1,
        },
      ],
    };

    await expect(service.create(dto, 1)).rejects.toThrow(BadRequestException);
  });

  it('6. should reject order when product is unavailable', async () => {
    const dto: CreateOrderDto = {
      customerName: 'Vũ F',
      customerPhone: '0911223344',
      items: [
        {
          productId: 2, // unavailable product
          quantity: 1,
        },
      ],
    };

    await expect(service.create(dto, 1)).rejects.toThrow(BadRequestException);
  });

  it('7. should reject order when product does not exist', async () => {
    const dto: CreateOrderDto = {
      customerName: 'Đặng G',
      customerPhone: '0922334455',
      items: [
        {
          productId: 9999, // non-existent
          quantity: 1,
        },
      ],
    };

    await expect(service.create(dto, 1)).rejects.toThrow(NotFoundException);
  });

  it('8. should retrieve all orders via findAll with user isolation, items.product relations and DESC order', async () => {
    (orderRepository.find as jest.Mock).mockResolvedValue([
      { id: 2, status: 'PAID', totalAmount: '90000.00', createdAt: new Date('2026-11-20T10:00:00Z') },
      { id: 1, status: 'PENDING', totalAmount: '60000.00', createdAt: new Date('2026-11-20T09:00:00Z') },
    ]);

    const orders = await service.findAll(1);
    expect(orders).toHaveLength(2);
    expect(orderRepository.find).toHaveBeenCalledWith({
      where: { userId: 1 },
      relations: {
        items: {
          product: true,
        },
      },
      order: {
        createdAt: 'DESC',
      },
    });

    // Verify isolation for another user
    (orderRepository.find as jest.Mock).mockClear();
    (orderRepository.find as jest.Mock).mockResolvedValue([]);
    const user2Orders = await service.findAll(2);
    expect(user2Orders).toEqual([]);
    expect(orderRepository.find).toHaveBeenCalledWith({
      where: { userId: 2 },
      relations: {
        items: {
          product: true,
        },
      },
      order: {
        createdAt: 'DESC',
      },
    });
  });

  it('9. should retrieve single order via findOne or throw NotFound', async () => {
    (orderRepository.findOne as jest.Mock).mockResolvedValueOnce({
      id: 1,
      status: 'PENDING',
    });

    const order = await service.findOne(1, 1);
    expect(order.id).toBe(1);

    (orderRepository.findOne as jest.Mock).mockResolvedValueOnce(null);
    await expect(service.findOne(999, 1)).rejects.toThrow(NotFoundException);
  });

  it('10. should reject order with duplicate toppings in payload (FIX-04)', async () => {
    const dto: CreateOrderDto = {
      customerName: 'Nguyễn Văn Hack',
      customerPhone: '0909998877',
      items: [
        {
          productId: 1,
          size: ProductSize.MEDIUM,
          toppings: ['Kem cheese', 'Kem cheese'],
          quantity: 1,
        },
      ],
    };

    await expect(service.create(dto, 1)).rejects.toThrow(BadRequestException);
    await expect(service.create(dto, 1)).rejects.toThrow(
      'Danh sách topping không được chứa các phần tử trùng lặp',
    );
  });

  it('11. should preserve individual item note in OrderItem and order note in Order (FIX-02)', async () => {
    const dto: CreateOrderDto = {
      customerName: 'Trần Thị Chi Tiết',
      customerPhone: '0988112233',
      note: 'Ghi chú toàn đơn: Giao trước 9h',
      items: [
        {
          productId: 1,
          size: ProductSize.MEDIUM,
          toppings: ['Kem cheese'],
          note: '30% đường, không đá',
          quantity: 1,
        },
      ],
    };

    const result = await service.create(dto, 1);
    expect(result).toBeDefined();
    expect(result.note).toBe('Ghi chú toàn đơn: Giao trước 9h');
    expect(result.items[0].note).toBe('30% đường, không đá');
    expect(result.items[0].size).toBe(ProductSize.MEDIUM);
    expect(result.items[0].unitPrice).toBe('60000.00');
  });

  it('12. should throw ForbiddenException when order exists but belongs to another user (IDOR protection)', async () => {
    (orderRepository.findOne as jest.Mock).mockResolvedValueOnce(null);
    (orderRepository.existsBy as jest.Mock).mockResolvedValueOnce(true);

    await expect(service.findOne(101, 2)).rejects.toThrow(ForbiddenException);
  });
});
