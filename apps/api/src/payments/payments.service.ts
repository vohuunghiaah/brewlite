import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProcessPaymentDto } from './dto/process-payment.dto';
import {
  OrderStatus,
  PaymentStatus,
  LoyaltyTransactionType,
} from '@prisma/client';
import { assertTransition } from '../orders/state-machine/order-state-machine';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async processPayment(
    userId: string,
    idempotencyKey: string,
    dto: ProcessPaymentDto,
  ) {
    if (!idempotencyKey || idempotencyKey.trim() === '') {
      throw new BadRequestException(
        'Bắt buộc cung cấp Header Idempotency-Key để bảo vệ chống giao dịch trùng lặp.',
      );
    }

    const trimmedKey = idempotencyKey.trim();

    // 1. Kiểm tra Idempotency: nếu key đã xử lý, trả về kết quả cũ
    const existingPayment = await this.prisma.payment.findUnique({
      where: { idempotencyKey: trimmedKey },
      include: {
        order: true,
      },
    });

    if (existingPayment) {
      return {
        success: existingPayment.status === PaymentStatus.SUCCESS,
        status: existingPayment.status,
        isDuplicate: true,
        message: 'Giao dịch đã được xử lý trước đó (Idempotent response).',
        payment: existingPayment,
        order: existingPayment.order,
      };
    }

    // 2. Tìm và kiểm tra đơn hàng
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(
        `Không tìm thấy đơn hàng với mã ID ${dto.orderId}`,
      );
    }

    if (order.userId !== userId) {
      throw new ForbiddenException(
        'Bạn không thể thực hiện thanh toán cho đơn hàng của người khác.',
      );
    }

    if (
      order.status !== OrderStatus.PENDING &&
      order.status !== OrderStatus.PAYMENT_FAILED
    ) {
      throw new BadRequestException(
        `Đơn hàng đang ở trạng thái '${order.status}', không thể tiếp nhận thanh toán.`,
      );
    }

    if (Math.round(Number(order.totalAmount)) !== Math.round(dto.amount)) {
      throw new BadRequestException(
        `Số tiền thanh toán (${dto.amount}đ) không khớp với số tiền thực tế của đơn hàng (${order.totalAmount}đ).`,
      );
    }

    const outcome = dto.mockOutcome || 'SUCCESS';

    // 3. Xử lý trường hợp thất bại mô phỏng (FAILED)
    if (outcome === 'FAILED') {
      return this.prisma.$transaction(async (tx) => {
        assertTransition(order.status, OrderStatus.PAYMENT_FAILED);

        await tx.order.update({
          where: { id: order.id },
          data: { status: OrderStatus.PAYMENT_FAILED },
        });

        const payment = await tx.payment.create({
          data: {
            orderId: order.id,
            idempotencyKey: trimmedKey,
            method: dto.method,
            amount: dto.amount,
            status: PaymentStatus.FAILED,
            failureReason:
              'Mô phỏng thanh toán thất bại: Số dư tài khoản hoặc thẻ không đủ.',
          },
        });

        return {
          success: false,
          status: PaymentStatus.FAILED,
          isDuplicate: false,
          message: 'Thanh toán thất bại: Số dư tài khoản không đủ.',
          payment,
          order: { ...order, status: OrderStatus.PAYMENT_FAILED },
        };
      });
    }

    // 4. Xử lý trường hợp đang chờ (PENDING)
    if (outcome === 'PENDING') {
      const payment = await this.prisma.payment.create({
        data: {
          orderId: order.id,
          idempotencyKey: trimmedKey,
          method: dto.method,
          amount: dto.amount,
          status: PaymentStatus.PENDING,
          transactionRef: `PEND-${Math.floor(100000 + Math.random() * 900000)}`,
        },
      });

      return {
        success: false,
        status: PaymentStatus.PENDING,
        isDuplicate: false,
        message: 'Giao dịch đang được xử lý bởi cổng thanh toán.',
        payment,
        order,
      };
    }

    // 5. Xử lý trường hợp thành công (SUCCESS) trong Transaction + Optimistic Lock
    return this.prisma.$transaction(async (tx) => {
      // 5.1 Trừ kho sản phẩm bằng Optimistic Locking
      for (const item of order.items) {
        const prod = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (!prod || prod.stock < item.quantity) {
          throw new BadRequestException(
            `Sản phẩm '${prod?.name || item.productId}' vừa hết hàng hoặc không đủ tồn kho.`,
          );
        }

        const updateResult = await tx.product.updateMany({
          where: {
            id: item.productId,
            version: prod.version,
            stock: { gte: item.quantity },
          },
          data: {
            stock: { decrement: item.quantity },
            version: { increment: 1 },
          },
        });

        if (updateResult.count === 0) {
          throw new ConflictException(
            `Xung đột tồn kho đồng thời đối với sản phẩm '${prod.name}'. Vui lòng thử lại.`,
          );
        }
      }

      // 5.2 Chuyển trạng thái đơn sang PAID
      assertTransition(order.status, OrderStatus.PAID);

      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.PAID },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      // 5.3 Tạo bản ghi Payment SUCCESS
      const transactionRef = `TXN-${Math.floor(100000 + Math.random() * 900000)}`;
      const payment = await tx.payment.create({
        data: {
          orderId: order.id,
          idempotencyKey: trimmedKey,
          method: dto.method,
          amount: dto.amount,
          status: PaymentStatus.SUCCESS,
          transactionRef,
        },
      });

      // 5.4 Tích lũy điểm khách hàng thân thiết (1 điểm / 1.000đ)
      const pointsEarned = Math.floor(dto.amount / 1000);
      if (pointsEarned > 0) {
        await tx.user.update({
          where: { id: userId },
          data: { loyaltyPoints: { increment: pointsEarned } },
        });

        await tx.loyaltyTransaction.create({
          data: {
            userId,
            orderId: order.id,
            points: pointsEarned,
            type: LoyaltyTransactionType.EARN,
            description: `Tích lũy ${pointsEarned} điểm từ đơn hàng ${order.orderCode}`,
          },
        });
      }

      return {
        success: true,
        status: PaymentStatus.SUCCESS,
        isDuplicate: false,
        message: 'Thanh toán thành công qua Mock Payment Service.',
        payment,
        order: updatedOrder,
      };
    });
  }
}
