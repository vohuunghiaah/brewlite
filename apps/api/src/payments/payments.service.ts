import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { Order, OrderStatus } from '../orders/entities/order.entity';
import { Product } from '../products/entities/product.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { Payment, PaymentStatus } from './entities/payment.entity';

export interface PaymentProcessResult {
  success: boolean;
  isDuplicate?: boolean;
  status: PaymentStatus;
  message?: string;
  payment: Payment;
  order: Order;
}

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly dataSource: DataSource,
  ) {}

  async processPayment(
    dto: CreatePaymentDto,
    userId: number,
  ): Promise<PaymentProcessResult> {
    // 1. Kiểm tra Idempotency (FR-08 & Alt-5 & Exc-8)
    const existingPayment = await this.paymentRepository.findOne({
      where: { idempotencyKey: dto.idempotencyKey },
      relations: { order: true },
    });

    if (existingPayment) {
      if (existingPayment.userId !== userId) {
        throw new ForbiddenException(
          'Khóa idempotency đã được sử dụng bởi tài khoản khác.',
        );
      }

      // Đối chiếu payload (cùng khóa nhưng khác nội dung -> 409 Conflict)
      if (
        existingPayment.orderId !== dto.orderId ||
        Math.abs(Number(existingPayment.amount) - dto.amount) > 0.01
      ) {
        throw new ConflictException(
          'Idempotency key đã được sử dụng cho một giao dịch khác với thông tin khác nhau.',
        );
      }

      // Trả lại kết quả giao dịch trước đó nguyên vẹn, không thực hiện lại giao dịch
      return {
        isDuplicate: true,
        success: existingPayment.status === PaymentStatus.SUCCESS,
        status: existingPayment.status,
        payment: existingPayment,
        order: existingPayment.order,
      };
    }

    // 2. Kiểm tra tính hợp lệ và quyền sở hữu đơn hàng (FR-04, FR-05)
    const order = await this.orderRepository.findOne({
      where: { id: dto.orderId },
      relations: { items: { product: true } },
    });

    if (!order) {
      throw new NotFoundException(`Đơn hàng #${dto.orderId} không tồn tại.`);
    }

    if (order.userId !== userId) {
      throw new ForbiddenException('Bạn không có quyền thanh toán cho đơn hàng này.');
    }

    // Kiểm tra máy trạng thái đơn hàng (Exc-10)
    if (order.status === OrderStatus.PAID) {
      throw new BadRequestException(
        `Đơn hàng #${order.id} đã được thanh toán thành công trước đó.`,
      );
    }

    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException(
        `Đơn hàng #${order.id} đã bị hủy, không thể tiếp tục thanh toán.`,
      );
    }

    // Kiểm tra số tiền (Exc-5)
    if (Math.abs(Number(order.totalAmount) - dto.amount) > 0.01) {
      throw new BadRequestException(
        `Số tiền thanh toán (${dto.amount}) không khớp với tổng tiền đơn hàng (${order.totalAmount}).`,
      );
    }

    // 3. Xử lý trường hợp Giả lập Thất bại từ Developer Test Mode (Figma Screen 05 / Exc-6)
    if (dto.mockOutcome === 'FAILED') {
      const failedPayment = this.paymentRepository.create({
        orderId: order.id,
        userId,
        amount: String(dto.amount),
        method: dto.method,
        status: PaymentStatus.FAILED,
        idempotencyKey: dto.idempotencyKey,
        transactionId: `TX-FAIL-${Date.now()}`,
      });

      const savedPayment = await this.paymentRepository.save(failedPayment);

      order.status = OrderStatus.PAYMENT_FAILED;
      const updatedOrder = await this.orderRepository.save(order);

      return {
        success: false,
        status: PaymentStatus.FAILED,
        message:
          'Thanh toán thất bại: Số dư tài khoản không đủ hoặc thẻ bị từ chối bởi nhà cung cấp.',
        payment: savedPayment,
        order: updatedOrder,
      };
    }

    // 4. Luồng thanh toán thành công — TX2 (ACID Transaction + Trừ kho OCC) (FR-06, FR-09, Exc-11)
    return await this.dataSource.transaction(async (manager) => {
      // 4.1. Kiểm tra tồn kho và thực hiện trừ kho với Khóa lạc quan (OCC)
      for (const item of order.items) {
        if (!item.productId) continue;

        const product = await manager.findOne(Product, {
          where: { id: item.productId },
        });

        if (!product || !product.isAvailable || product.stock < item.quantity) {
          throw new BadRequestException(
            `Sản phẩm '${product?.name ?? item.productName}' hiện không đủ số lượng tồn kho (còn ${
              product?.stock ?? 0
            } ly).`,
          );
        }

        // Thực hiện update với điều kiện version OCC
        const updateResult = await manager
          .createQueryBuilder()
          .update(Product)
          .set({
            stock: () => `stock - ${item.quantity}`,
            version: () => `version + 1`,
          })
          .where('id = :id AND version = :version AND stock >= :qty', {
            id: item.productId,
            version: product.version,
            qty: item.quantity,
          })
          .execute();

        if (updateResult.affected === 0) {
          // Xung đột phiên bản đồng thời (Optimistic Concurrency Conflict)
          throw new ConflictException(
            `Xung đột tồn kho đồng thời đối với sản phẩm '${product.name}'. Vui lòng thử lại.`,
          );
        }
      }

      // 4.2. Cập nhật trạng thái đơn hàng sang PAID và cấp mã nhận nước Buzzer
      order.status = OrderStatus.PAID;
      order.orderCode = `#BL-${1000 + (order.id % 9000)}`;
      if (dto.pickupMethod) {
        order.pickupMethod = dto.pickupMethod;
      }
      if (dto.tableNumber) {
        order.tableNumber = dto.tableNumber;
      }
      const paidOrder = await manager.save(Order, order);

      // 4.3. Tạo bản ghi giao dịch Payment SUCCESS
      const payment = manager.create(Payment, {
        orderId: order.id,
        userId,
        amount: String(dto.amount),
        method: dto.method,
        status: PaymentStatus.SUCCESS,
        idempotencyKey: dto.idempotencyKey,
        transactionId: `TX-SUCCESS-${Date.now()}`,
      });
      const savedPayment = await manager.save(Payment, payment);

      return {
        success: true,
        status: PaymentStatus.SUCCESS,
        payment: savedPayment,
        order: paidOrder,
      };
    });
  }

  async findByOrder(orderId: number, userId: number): Promise<Payment[]> {
    const order = await this.orderRepository.findOneBy({ id: orderId });
    if (!order) {
      throw new NotFoundException(`Đơn hàng #${orderId} không tồn tại.`);
    }
    if (order.userId !== userId) {
      throw new ForbiddenException('Bạn không có quyền truy cập thanh toán của đơn hàng này.');
    }
    return this.paymentRepository.find({
      where: { orderId },
      order: { createdAt: 'DESC' },
    });
  }
}
