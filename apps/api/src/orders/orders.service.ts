import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In, IsNull, Not } from 'typeorm';

import { serviceTargets } from './dto/update-order-status.dto';
import { assertOrderTransition } from './state-machine/order-state-machine';
import { Order, OrderStatus } from './entities/order.entity';
import { OrderItem, ProductSize } from './entities/order-item.entity';
import { Product } from '../products/entities/product.entity';

import { CreateOrderDto } from './dto/create-order.dto';

export const SIZE_PRICE_MODIFIERS: Record<ProductSize, number> = {
  [ProductSize.SMALL]: 0,
  [ProductSize.MEDIUM]: 5000,
  [ProductSize.LARGE]: 10000,
};

export const TOPPING_PRICES: Record<string, number> = {
  'Kem cheese': 10000,
  'Trân châu trắng': 8000,
  'Thạch đào': 8000,
  'Sốt caramel': 6000,
  'Thạch sương sáo': 6000,
};

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,

    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,

    private readonly dataSource: DataSource,
  ) {}

  serviceQueue() {
    return this.orderRepository.find({
      where: { status: In([OrderStatus.PAID, OrderStatus.PREPARING, OrderStatus.READY]) },
      select: {
        id: true, orderCode: true, createdAt: true, status: true, pickupMethod: true,
        tableNumber: true, note: true, items: {
          id: true, productName: true, quantity: true, size: true, toppings: true, note: true,
        },
      },
      relations: { items: true },
      order: { createdAt: 'ASC', id: 'ASC', items: { id: 'ASC' } },
    });
  }

  updateServiceStatus(id: number, target: OrderStatus) {
    if (!serviceTargets.includes(target)) {
      throw new BadRequestException('Trạng thái ngoài quy trình phục vụ');
    }
    return this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(Order, {
        where: { id }, select: { id: true, status: true }, lock: { mode: 'pessimistic_write' },
      });
      if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');
      if (order.status === target) return { id, status: target };
      try {
        assertOrderTransition(order.status, target, id);
      } catch (error) {
        if (error instanceof BadRequestException) throw new ConflictException(error.message);
        throw error;
      }
      await manager.update(Order, id, { status: target });
      return { id, status: target };
    });
  }

  // Lấy danh sách đơn hàng
  async findAll(userId: number) {
    return this.orderRepository.find({
      where: { userId },
      relations: {
        items: {
          product: true,
        },
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  // Lấy chi tiết đơn hàng
  async findOne(id: number, userId: number) {
    const order = await this.orderRepository.findOne({
      where: { id, userId },
      relations: {
        items: {
          product: true,
        },
      },
    });

    if (!order) {
      const hasOwner = await this.orderRepository.existsBy({
        id,
        userId: Not(IsNull()),
      });
      if (hasOwner) {
        throw new ForbiddenException();
      }
      throw new NotFoundException(
        `Không tìm thấy đơn hàng ID ${id}`,
      );
    }

    return order;
  }

  // Tạo đơn hàng (UC-04 PENDING Order Creation with User Ownership)
  async create(createOrderDto: CreateOrderDto, userId: number) {
    return this.dataSource.transaction(
      async (manager) => {
        const orderItems: OrderItem[] = [];
        const quantityByProduct = new Map<number, number>();
        let totalAmount = 0;

        for (const item of createOrderDto.items) {
          const product = await manager
            .getRepository(Product)
            .findOne({
              where: {
                id: item.productId,
              },
            });

          if (!product) {
            throw new NotFoundException(
              `Không tìm thấy sản phẩm ID ${item.productId}`,
            );
          }

          if (!product.isAvailable) {
            throw new BadRequestException(
              `Sản phẩm ${product.name} hiện không có sẵn`,
            );
          }

          const requested = (quantityByProduct.get(product.id) ?? 0) + item.quantity;
          if (requested > product.stock) {
            throw new BadRequestException(`Sản phẩm ${product.name} không đủ tồn kho`);
          }
          quantityByProduct.set(product.id, requested);

          // Xác thực và tính phụ thu kích cỡ (Size)
          const size = item.size ?? ProductSize.SMALL;
          if (!Object.values(ProductSize).includes(size)) {
            throw new BadRequestException(
              `Kích cỡ '${size}' không hợp lệ. Cho phép: SMALL, MEDIUM, LARGE`,
            );
          }
          const sizeModifier = SIZE_PRICE_MODIFIERS[size] ?? 0;

          // Xác thực và tính phụ thu topping
          const toppings = Array.isArray(item.toppings) ? item.toppings : [];
          const uniqueToppings = new Set(toppings);
          if (uniqueToppings.size !== toppings.length) {
            throw new BadRequestException(
              'Danh sách topping không được chứa các phần tử trùng lặp',
            );
          }

          let toppingsTotal = 0;
          for (const top of toppings) {
            if (!Object.prototype.hasOwnProperty.call(TOPPING_PRICES, top)) {
              throw new BadRequestException(
                `Topping '${top}' không hợp lệ hoặc không có trong thực đơn`,
              );
            }
            toppingsTotal += TOPPING_PRICES[top];
          }

          const basePrice = Number(product.price);
          if (!Number.isFinite(basePrice) || basePrice < 0) {
            throw new BadRequestException(
              'Giá sản phẩm không hợp lệ',
            );
          }

          // Đơn giá được tính toán độc lập tại Backend (không phụ thuộc giá client)
          const unitPrice = Math.max(0, basePrice + sizeModifier + toppingsTotal);
          const subtotal = unitPrice * item.quantity;

          totalAmount += subtotal;

          const orderItem = manager
            .getRepository(OrderItem)
            .create({
              productName: product.name,
              size,
              toppings,
              note: item.note?.trim() || null,
              quantity: item.quantity,
              unitPrice: unitPrice.toFixed(2),
              subtotal: subtotal.toFixed(2),
              product,
            });

          orderItems.push(orderItem);
        }

        const order = manager
          .getRepository(Order)
          .create({
            userId,
            customerName: createOrderDto.customerName,
            customerPhone: createOrderDto.customerPhone,
            note: createOrderDto.note,
            totalAmount: totalAmount.toFixed(2),
            status: 'PENDING',
            items: orderItems,
          });

        return manager
          .getRepository(Order)
          .save(order);
      },
    );
  }
}
