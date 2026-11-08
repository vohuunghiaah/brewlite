import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';

import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Product } from '../products/entities/product.entity';

import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,

    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,

    private readonly dataSource: DataSource,
  ) {}

  // Lấy danh sách đơn hàng
  async findAll() {
    return this.orderRepository.find({
      relations: {
        items: true,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  // Lấy chi tiết đơn hàng
  async findOne(id: number) {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: {
        items: {
          product: true,
        },
      },
    });

    if (!order) {
      throw new NotFoundException(
        `Không tìm thấy đơn hàng ID ${id}`,
      );
    }

    return order;
  }

  // Tạo đơn hàng
  async create(createOrderDto: CreateOrderDto) {
    return this.dataSource.transaction(
      async (manager) => {
        const orderItems: OrderItem[] = [];
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

          const unitPrice = Number(product.price);

          if (!Number.isFinite(unitPrice) || unitPrice < 0) {
            throw new BadRequestException(
              'Giá sản phẩm không hợp lệ',
            );
          }

          const subtotal = unitPrice * item.quantity;

          totalAmount += subtotal;

          const orderItem = manager
            .getRepository(OrderItem)
            .create({
              productName: product.name,
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