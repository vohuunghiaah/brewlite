import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import {
  OrderStatus,
  ProductSize,
  UserRole,
  DiscountType,
} from '@prisma/client';
import { assertTransition } from './state-machine/order-state-machine';

export const SIZE_PRICE_MODIFIERS: Record<ProductSize, number> = {
  [ProductSize.SMALL]: -5000,
  [ProductSize.MEDIUM]: 0,
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
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateOrderDto) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException(
        'Giỏ hàng không được để trống khi tạo đơn.',
      );
    }

    const productIds = dto.items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    let subtotal = 0;
    const orderItemsData: any[] = [];

    for (const item of dto.items) {
      const product = productMap.get(item.productId);
      if (!product) {
        throw new NotFoundException(
          `Sản phẩm với ID ${item.productId} không tồn tại.`,
        );
      }

      if (!product.isAvailable || product.stock < item.quantity) {
        throw new BadRequestException(
          `Sản phẩm '${product.name}' hiện không đủ số lượng tồn kho (còn ${product.stock} ly).`,
        );
      }

      const basePriceNum = Number(product.basePrice);
      const sizeModifier = SIZE_PRICE_MODIFIERS[item.size] || 0;

      let toppingsTotal = 0;
      if (item.toppings && Array.isArray(item.toppings)) {
        for (const top of item.toppings) {
          toppingsTotal += TOPPING_PRICES[top] || 5000;
        }
      }

      const unitPrice = Math.max(
        0,
        basePriceNum + sizeModifier + toppingsTotal,
      );
      const lineTotal = unitPrice * item.quantity;
      subtotal += lineTotal;

      orderItemsData.push({
        productId: item.productId,
        size: item.size,
        toppings: item.toppings || [],
        quantity: item.quantity,
        unitPrice,
        lineTotal,
      });
    }

    let discountAmount = 0;
    if (dto.promoCode) {
      const promo = await this.prisma.promotion.findUnique({
        where: { code: dto.promoCode.toUpperCase().trim() },
      });

      if (
        promo &&
        promo.isActive &&
        new Date() >= promo.validFrom &&
        new Date() <= promo.validUntil &&
        subtotal >= Number(promo.minOrderValue)
      ) {
        if (promo.discountType === DiscountType.PERCENTAGE) {
          discountAmount = Math.round(
            (subtotal * Number(promo.discountValue)) / 100,
          );
        } else {
          discountAmount = Math.min(subtotal, Number(promo.discountValue));
        }
      }
    }

    const totalAmount = Math.max(0, subtotal - discountAmount);
    const orderCode = `#BL-${Math.floor(1000 + Math.random() * 9000)}`;

    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          orderCode,
          userId,
          status: OrderStatus.PENDING,
          subtotal,
          discountAmount,
          totalAmount,
          note: dto.note?.trim() || null,
          promoCode: dto.promoCode ? dto.promoCode.toUpperCase().trim() : null,
          items: {
            create: orderItemsData,
          },
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      return order;
    });
  }

  async findMyOrders(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string, userRole: UserRole) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        payments: true,
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng #${id}`);
    }

    if (
      order.userId !== userId &&
      userRole !== UserRole.STAFF &&
      userRole !== UserRole.ADMIN
    ) {
      throw new ForbiddenException(
        'Bạn không có quyền truy cập vào thông tin đơn hàng của người khác.',
      );
    }

    return order;
  }

  async updateStatus(id: string, newStatus: OrderStatus, userRole: UserRole) {
    if (userRole !== UserRole.STAFF && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'Chỉ nhân viên hoặc quản lý mới có quyền cập nhật tiến độ đơn hàng.',
      );
    }

    const order = await this.prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng #${id}`);
    }

    assertTransition(order.status, newStatus);

    return this.prisma.order.update({
      where: { id },
      data: { status: newStatus },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });
  }
}
