import * as crypto from 'crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';

import { Order, OrderStatus } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { assertOrderTransition } from '../orders/state-machine/order-state-machine';
import { Product } from '../products/entities/product.entity';
import { CreatePaymentDto, PickupMethod } from './dto/create-payment.dto';
import { Payment, PaymentStatus } from './entities/payment.entity';

export class OccCompensationNeededException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OccCompensationNeededException';
  }
}

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

  private computePayloadHash(userId: number, dto: CreatePaymentDto): string {
    const normalized = `${userId}:${dto.orderId}:${Number(dto.amount).toFixed(2)}:${dto.method}`;
    return crypto.createHash('sha256').update(normalized).digest('hex');
  }

  async processPayment(
    dto: CreatePaymentDto,
    userId: number,
  ): Promise<PaymentProcessResult> {
    const idempotencyKey = dto.idempotencyKey;
    if (!idempotencyKey) {
      throw new BadRequestException('Idempotency-Key là bắt buộc.');
    }

    const payloadHash = this.computePayloadHash(userId, dto);

    // 1. Kiểm tra Idempotency trước transaction (FR-08 & EX-08)
    const existingPayment = await this.paymentRepository.findOne({
      where: { idempotencyKey },
      relations: { order: true },
    });

    if (existingPayment) {
      // Bảo vệ IDOR: không tiết lộ dữ liệu của tài khoản khác
      if (existingPayment.userId !== userId) {
        throw new ForbiddenException(
          'Khóa idempotency đã được sử dụng bởi tài khoản khác.',
        );
      }

      // Đối chiếu toàn bộ trường định danh nghiệp vụ
      const isSameOrder = existingPayment.orderId === dto.orderId;
      const isSameAmount =
        Math.abs(Number(existingPayment.amount) - dto.amount) <= 0.01;
      const isSameMethod = existingPayment.method === dto.method;

      if (!isSameOrder || !isSameAmount || !isSameMethod) {
        throw new ConflictException(
          'Idempotency key đã được sử dụng cho một giao dịch khác với thông tin khác nhau.',
        );
      }

      return {
        isDuplicate: true,
        success: existingPayment.status === PaymentStatus.SUCCESS,
        status: existingPayment.status,
        message:
          existingPayment.status === PaymentStatus.SUCCESS
            ? 'Giao dịch đã được ghi nhận thành công trước đó.'
            : `Giao dịch trước đó đã kết thúc với trạng thái ${existingPayment.status}.`,
        payment: existingPayment,
        order: existingPayment.order,
      };
    }

    // 2. Thực thi giao dịch nguyên tử TX2 với khóa dòng bi quan (Pessimistic Lock) chống race condition (FIX-01)
    try {
      return await this.dataSource.transaction(async (manager: EntityManager) => {
        // Độc quyền khóa dòng Order bằng pessimistic_write (chỉ lock bảng orders, tránh outer join lock trên Postgres)
        const order = await manager.findOne(Order, {
          where: { id: dto.orderId },
          lock: { mode: 'pessimistic_write' },
        });

        if (!order) {
          throw new NotFoundException(`Đơn hàng #${dto.orderId} không tồn tại.`);
        }

        // Kiểm tra xem đơn hàng này đã được ghi nhận thanh toán bởi chính khóa idempotencyKey này chưa (chống race condition cùng key)
        const inLockExistingPayment = await manager.findOne(Payment, {
          where: { idempotencyKey },
          relations: { order: true },
        });
        if (inLockExistingPayment) {
          if (inLockExistingPayment.userId !== userId) {
            throw new ForbiddenException('Khóa idempotency đã được sử dụng bởi tài khoản khác.');
          }
          return {
            isDuplicate: true,
            success: inLockExistingPayment.status === PaymentStatus.SUCCESS,
            status: inLockExistingPayment.status,
            message: 'Giao dịch đã được ghi nhận bởi yêu cầu trước đó.',
            payment: inLockExistingPayment,
            order: inLockExistingPayment.order,
          };
        }

        const items = await manager.find(OrderItem, {
          where: { order: { id: order.id } },
          relations: { product: true },
        });
        order.items = items;

        if (order.userId !== userId) {
          throw new ForbiddenException('Bạn không có quyền thanh toán cho đơn hàng này.');
        }

        // Kiểm tra máy trạng thái đơn hàng (FR-07)
        if (order.status === OrderStatus.PAID) {
          // Kiểm tra xem đơn này đã được thanh toán bởi chính idempotencyKey này chưa
          const paidPayment = await manager.findOne(Payment, {
            where: { orderId: order.id, idempotencyKey },
            relations: { order: true },
          });
          if (paidPayment) {
            return {
              isDuplicate: true,
              success: true,
              status: PaymentStatus.SUCCESS,
              message: 'Giao dịch đã được ghi nhận thành công trước đó.',
              payment: paidPayment,
              order: paidPayment.order,
            };
          }

          throw new BadRequestException(
            `Đơn hàng #${order.id} đã được thanh toán thành công trước đó (PAID).`,
          );
        }

        if (order.status === OrderStatus.CANCELLED) {
          throw new BadRequestException(
            `Đơn hàng #${order.id} đã bị hủy, không thể tiếp tục thanh toán.`,
          );
        }

        if (
          order.status !== OrderStatus.PENDING &&
          order.status !== OrderStatus.PAYMENT_FAILED
        ) {
          throw new BadRequestException(
            `Trạng thái đơn hàng không hợp lệ để thanh toán: ${order.status}`,
          );
        }

        // Kiểm tra đã có payment SUCCESS cho đơn hàng này chưa (chống 2 request khác khóa cùng thành công)
        const existingSuccessPayment = await manager.findOne(Payment, {
          where: { orderId: order.id, status: PaymentStatus.SUCCESS },
        });
        if (existingSuccessPayment) {
          throw new ConflictException(
            `Đơn hàng #${order.id} đã có giao dịch thanh toán thành công #${existingSuccessPayment.id}.`,
          );
        }

        // Kiểm tra khớp số tiền (EX-04)
        if (Math.abs(Number(order.totalAmount) - dto.amount) > 0.01) {
          throw new BadRequestException(
            `Số tiền thanh toán (${dto.amount}) không khớp với tổng tiền đơn hàng (${order.totalAmount}).`,
          );
        }

        // Cập nhật và kiểm tra hình thức nhận hàng (FIX-05)
        if (dto.pickupMethod === PickupMethod.AT_TABLE) {
          if (!dto.tableNumber || !dto.tableNumber.trim()) {
            throw new BadRequestException('Vui lòng nhập số bàn hợp lệ khi chọn hình thức nhận tại bàn.');
          }
          order.pickupMethod = PickupMethod.AT_TABLE;
          order.tableNumber = dto.tableNumber.trim();
        } else if (dto.pickupMethod === PickupMethod.AT_COUNTER) {
          order.pickupMethod = PickupMethod.AT_COUNTER;
          order.tableNumber = null;
        }

        // 3. Xử lý trường hợp Giả lập Thất bại từ Developer Test Mode (EX-06 / FIX-03)
        if (dto.mockOutcome === 'FAILED') {
          assertOrderTransition(order.status, OrderStatus.PAYMENT_FAILED, order.id);
          order.status = OrderStatus.PAYMENT_FAILED;
          const updatedOrder = await manager.save(Order, order);

          const failedPayment = manager.create(Payment, {
            orderId: order.id,
            userId,
            amount: Number(dto.amount).toFixed(2),
            method: dto.method,
            status: PaymentStatus.FAILED,
            idempotencyKey,
            transactionId: `TX-FAIL-${Date.now()}`,
            merchantReference: `REF-${order.id}-${Date.now()}`,
            buzzerCode: null,
            payloadHash,
          });
          const savedPayment = await manager.save(Payment, failedPayment);

          return {
            success: false,
            status: PaymentStatus.FAILED,
            message:
              'Thanh toán thất bại: Số dư tài khoản không đủ hoặc thẻ bị từ chối bởi nhà cung cấp.',
            payment: savedPayment,
            order: updatedOrder,
          };
        }

        // 4. Xử lý trường hợp Timeout / Đang xử lý (EX-07 / FIX-04)
        if (dto.mockOutcome === 'PENDING') {
          const pendingPayment = manager.create(Payment, {
            orderId: order.id,
            userId,
            amount: Number(dto.amount).toFixed(2),
            method: dto.method,
            status: PaymentStatus.PENDING,
            idempotencyKey,
            transactionId: `TX-PENDING-${Date.now()}`,
            merchantReference: `REF-${order.id}-${Date.now()}`,
            buzzerCode: null,
            payloadHash,
          });
          const savedPayment = await manager.save(Payment, pendingPayment);

          return {
            success: false,
            status: PaymentStatus.PENDING,
            message:
              'Giao dịch đang chờ phản hồi từ cổng thanh toán. Vui lòng đối soát hoặc kiểm tra lại sau.',
            payment: savedPayment,
            order,
          };
        }

        // 5. Kiểm tra tồn kho & trừ kho Khóa lạc quan OCC (FR-09, EX-09, BR-REFUND-OCC)
        for (const item of order.items) {
          if (!item.productId) continue;

          const product = await manager.findOne(Product, {
            where: { id: item.productId },
          });

          if (!product || !product.isAvailable || product.stock < item.quantity) {
            // Hết hàng đồng thời: ném exception để rollback TX2 và kích hoạt TX3 bồi hoàn
            throw new OccCompensationNeededException(
              `Sản phẩm '${product?.name ?? item.productName}' hiện không đủ số lượng tồn kho (còn ${
                product?.stock ?? 0
              } ly). Đã kích hoạt hoàn tiền bồi hoàn.`,
            );
          }

          // Cập nhật với điều kiện OCC version
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
            // Xung đột phiên bản OCC: ném exception để rollback TX2 và kích hoạt TX3 bồi hoàn
            throw new OccCompensationNeededException(
              `Xung đột tồn kho đồng thời đối với sản phẩm '${product.name}'. Giao dịch đã được bồi hoàn tự động.`,
            );
          }
        }

        // 6. Hoàn tất thanh toán thành công: Chuyển Order sang PAID và cấp Buzzer Code duy nhất (FIX-07)
        assertOrderTransition(order.status, OrderStatus.PAID, order.id);
        const buzzerCode = `#BL-${order.id.toString().padStart(4, '0')}`;
        order.status = OrderStatus.PAID;
        order.orderCode = buzzerCode;
        const paidOrder = await manager.save(Order, order);

        const payment = manager.create(Payment, {
          orderId: order.id,
          userId,
          amount: Number(dto.amount).toFixed(2),
          method: dto.method,
          status: PaymentStatus.SUCCESS,
          idempotencyKey,
          transactionId: `TX-SUCCESS-${Date.now()}`,
          merchantReference: `REF-${order.id}-${Date.now()}`,
          buzzerCode,
          payloadHash,
        });
        const savedPayment = await manager.save(Payment, payment);

        return {
          success: true,
          status: PaymentStatus.SUCCESS,
          message: 'Thanh toán thành công.',
          payment: savedPayment,
          order: paidOrder,
        };
      });
    } catch (err: unknown) {
      // Khi gặp xung đột tồn kho OCC: TX2 đã được rollback an toàn (không trừ kho)
      // Thực hiện giao dịch độc lập TX3 (Compensation Transaction) theo BR-REFUND-OCC
      if (err instanceof OccCompensationNeededException) {
        const compensationResult = await this.executeTx3Compensation(
          dto.orderId,
          userId,
          dto,
          idempotencyKey,
          payloadHash,
        );

        throw new ConflictException({
          statusCode: 409,
          message: err.message,
          status: PaymentStatus.REFUNDED,
          refundKey: compensationResult.payment.refundKey,
          payment: compensationResult.payment,
          order: compensationResult.order,
        });
      }

      // Bắt lỗi Unique Constraint Violation (PostgreSQL 23505) khi có 2 request cùng khóa chạy song song
      if ((err as { code?: string })?.code === '23505') {
        const racePayment = await this.paymentRepository.findOne({
          where: { idempotencyKey },
          relations: { order: true },
        });
        if (racePayment) {
          return {
            isDuplicate: true,
            success: racePayment.status === PaymentStatus.SUCCESS,
            status: racePayment.status,
            message: 'Giao dịch đã được ghi nhận bởi một yêu cầu đồng thời.',
            payment: racePayment,
            order: racePayment.order,
          };
        }
      }
      throw err;
    }
  }

  /**
   * Thực hiện giao dịch độc lập TX3 theo quy trình BR-REFUND-OCC:
   * Chuyển Order sang CANCELLED và ghi nhận Payment REFUNDED với refundKey cố định.
   */
  private async executeTx3Compensation(
    orderId: number,
    userId: number,
    dto: CreatePaymentDto,
    idempotencyKey: string,
    payloadHash: string,
  ): Promise<{ payment: Payment; order: Order }> {
    return await this.dataSource.transaction(async (tx3Manager: EntityManager) => {
      const order = await tx3Manager.findOne(Order, {
        where: { id: orderId },
        lock: { mode: 'pessimistic_write' },
      });

      let cancelledOrder = order;
      if (order && order.status !== OrderStatus.CANCELLED) {
        order.status = OrderStatus.CANCELLED;
        cancelledOrder = await tx3Manager.save(Order, order);
      }

      const refundPayment = tx3Manager.create(Payment, {
        orderId,
        userId,
        amount: Number(dto.amount).toFixed(2),
        method: dto.method,
        status: PaymentStatus.REFUNDED,
        idempotencyKey,
        transactionId: `TX-COMPENSATED-${Date.now()}`,
        merchantReference: `REF-${orderId}-${Date.now()}`,
        buzzerCode: null,
        refundKey: `refund-${idempotencyKey}`,
        payloadHash,
      });
      const savedRefund = await tx3Manager.save(Payment, refundPayment);

      return { payment: savedRefund, order: cancelledOrder! };
    });
  }

  /**
   * Đối soát giao dịch PENDING / TIMEOUT (EX-07 / FIX-04)
   */
  async reconcilePayment(
    idempotencyKey: string,
    userId: number,
  ): Promise<PaymentProcessResult> {
    const payment = await this.paymentRepository.findOne({
      where: { idempotencyKey },
      relations: { order: { items: { product: true } } },
    });

    if (!payment) {
      throw new NotFoundException(`Giao dịch với khóa '${idempotencyKey}' không tồn tại.`);
    }

    if (payment.userId !== userId) {
      throw new ForbiddenException('Bạn không có quyền truy cập giao dịch này.');
    }

    if (payment.status !== PaymentStatus.PENDING) {
      return {
        isDuplicate: true,
        success: payment.status === PaymentStatus.SUCCESS,
        status: payment.status,
        message: `Giao dịch đã được xử lý trước đó với trạng thái ${payment.status}.`,
        payment,
        order: payment.order,
      };
    }

    return await this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(Order, {
        where: { id: payment.orderId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!order) {
        throw new NotFoundException(`Đơn hàng #${payment.orderId} không tồn tại.`);
      }

      const items = await manager.find(OrderItem, {
        where: { order: { id: order.id } },
        relations: { product: true },
      });
      order.items = items;

      assertOrderTransition(order.status, OrderStatus.PAID, order.id);
      const buzzerCode = `#BL-${order.id.toString().padStart(4, '0')}`;
      order.status = OrderStatus.PAID;
      order.orderCode = buzzerCode;
      const paidOrder = await manager.save(Order, order);

      payment.status = PaymentStatus.SUCCESS;
      payment.buzzerCode = buzzerCode;
      payment.transactionId = `TX-RECONCILED-${Date.now()}`;
      const savedPayment = await manager.save(Payment, payment);

      return {
        success: true,
        status: PaymentStatus.SUCCESS,
        message: 'Đối soát thành công: Giao dịch đã được hoàn tất sang PAID.',
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
