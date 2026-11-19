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
import { MockPaymentGateway } from './mock-payment-gateway.service';

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

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
    private readonly mockGateway: MockPaymentGateway,
  ) {}

  public validateIdempotencyKeyFormat(key: string): void {
    if (!key || typeof key !== 'string' || !UUID_V4_REGEX.test(key.trim())) {
      throw new BadRequestException(
        'Idempotency-Key phải có định dạng chuẩn UUID v4 (RFC 4122).',
      );
    }
  }

  private computePayloadHash(userId: number, dto: CreatePaymentDto): string {
    const normalized = `${userId}:${dto.orderId}:${Number(dto.amount).toFixed(2)}:${dto.method}`;
    return crypto.createHash('sha256').update(normalized).digest('hex');
  }

  /**
   * Xác minh tính hợp lệ và toàn vẹn của giao dịch cũ theo FR-08 (FIX-10)
   */
  private validateIdempotentMatch(
    existingPayment: Payment,
    userId: number,
    dto: CreatePaymentDto,
    payloadHash: string,
  ): void {
    // 1. Kiểm tra IDOR: không tiết lộ dữ liệu của tài khoản khác
    if (existingPayment.userId !== userId) {
      throw new ForbiddenException(
        'Khóa idempotency đã được sử dụng bởi tài khoản khác.',
      );
    }

    // 2. Đối chiếu toàn bộ trường định danh nghiệp vụ
    const isSameOrder = existingPayment.orderId === dto.orderId;
    const isSameAmount =
      Math.abs(Number(existingPayment.amount) - dto.amount) <= 0.01;
    const isSameMethod = existingPayment.method === dto.method;
    const isSameHash =
      !existingPayment.payloadHash || existingPayment.payloadHash === payloadHash;

    if (!isSameOrder || !isSameAmount || !isSameMethod || !isSameHash) {
      throw new ConflictException(
        'Idempotency key đã được sử dụng cho một giao dịch khác với thông tin khác nhau.',
      );
    }
  }

  /**
   * Khởi tạo và xử lý giao dịch thanh toán
   */
  async processPayment(
    dto: CreatePaymentDto,
    userId: number,
  ): Promise<PaymentProcessResult> {
    const idempotencyKey = dto.idempotencyKey;
    if (!idempotencyKey) {
      throw new BadRequestException('Idempotency-Key là bắt buộc.');
    }
    this.validateIdempotencyKeyFormat(idempotencyKey);

    const payloadHash = this.computePayloadHash(userId, dto);

    // 1. Kiểm tra Idempotency trước transaction (FR-08 & EX-08 & FIX-10)
    const existingPayment = await this.paymentRepository.findOne({
      where: { idempotencyKey },
      relations: { order: true },
    });

    if (existingPayment) {
      this.validateIdempotentMatch(existingPayment, userId, dto, payloadHash);

      return {
        isDuplicate: true,
        success: existingPayment.status === PaymentStatus.SUCCESS,
        status: existingPayment.status,
        message:
          existingPayment.status === PaymentStatus.SUCCESS
            ? 'Giao dịch đã được ghi nhận thành công trước đó.'
            : existingPayment.status === PaymentStatus.PENDING
              ? 'Giao dịch đang chờ xác thực từ cổng thanh toán.'
              : `Giao dịch trước đó đã kết thúc với trạng thái ${existingPayment.status}.`,
        payment: existingPayment,
        order: existingPayment.order,
      };
    }

    // Sinh merchantReference ổn định trước khi gọi gateway (FIX-12)
    const merchantReference = `BL-REF-${dto.orderId}-${idempotencyKey.replace(/-/g, '').slice(0, 16)}`;

    // 2. Thực thi giao dịch nguyên tử TX2 với khóa dòng bi quan (Pessimistic Lock) (FIX-01)
    try {
      return await this.dataSource.transaction(async (manager: EntityManager) => {
        // Độc quyền khóa dòng Order bằng pessimistic_write (chỉ lock bảng orders)
        const order = await manager.findOne(Order, {
          where: { id: dto.orderId },
          lock: { mode: 'pessimistic_write' },
        });

        if (!order) {
          throw new NotFoundException(`Đơn hàng #${dto.orderId} không tồn tại.`);
        }

        // Kiểm tra IDOR quyền sở hữu đơn hàng
        if (order.userId !== userId) {
          throw new ForbiddenException('Bạn không có quyền thanh toán cho đơn hàng này.');
        }

        // Kiểm tra in-lock existing payment cho chính idempotencyKey này
        const inLockExistingPayment = await manager.findOne(Payment, {
          where: { idempotencyKey },
          relations: { order: true },
        });
        if (inLockExistingPayment) {
          this.validateIdempotentMatch(inLockExistingPayment, userId, dto, payloadHash);
          return {
            isDuplicate: true,
            success: inLockExistingPayment.status === PaymentStatus.SUCCESS,
            status: inLockExistingPayment.status,
            message: 'Giao dịch đã được ghi nhận bởi yêu cầu trước đó.',
            payment: inLockExistingPayment,
            order: inLockExistingPayment.order,
          };
        }

        // Kiểm tra xem đơn hàng này có đang trong giao dịch PENDING nào khác không (FIX-11)
        const pendingPayment = await manager.findOne(Payment, {
          where: { orderId: order.id, status: PaymentStatus.PENDING },
        });
        if (pendingPayment && pendingPayment.idempotencyKey !== idempotencyKey) {
          throw new ConflictException(
            'Đơn hàng đang có một giao dịch thanh toán đang chờ xử lý (PENDING). Vui lòng đối soát hoặc chờ kết quả trước khi thử lại.',
          );
        }

        // Kiểm tra máy trạng thái đơn hàng (FR-07)
        if (order.status === OrderStatus.PAID) {
          const paidPayment = await manager.findOne(Payment, {
            where: { orderId: order.id, idempotencyKey },
            relations: { order: true },
          });
          if (paidPayment) {
            this.validateIdempotentMatch(paidPayment, userId, dto, payloadHash);
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

        // Kiểm tra nếu đã có payment SUCCESS cho đơn hàng này
        const existingSuccessPayment = await manager.findOne(Payment, {
          where: { orderId: order.id, status: PaymentStatus.SUCCESS },
        });
        if (existingSuccessPayment) {
          throw new ConflictException(
            `Đơn hàng #${order.id} đã có giao dịch thanh toán thành công #${existingSuccessPayment.id}.`,
          );
        }

        // Kiểm tra khớp số tiền
        if (Math.abs(Number(order.totalAmount) - dto.amount) > 0.01) {
          throw new BadRequestException(
            `Số tiền thanh toán (${dto.amount}) không khớp với tổng tiền đơn hàng (${order.totalAmount}).`,
          );
        }

        // Cập nhật và kiểm tra hình thức nhận hàng (FIX-05)
        if (dto.pickupMethod === PickupMethod.AT_TABLE) {
          if (!dto.tableNumber || !dto.tableNumber.trim()) {
            throw new BadRequestException(
              'Vui lòng nhập số bàn hợp lệ khi chọn hình thức nhận tại bàn.',
            );
          }
          order.pickupMethod = PickupMethod.AT_TABLE;
          order.tableNumber = dto.tableNumber.trim();
        } else if (dto.pickupMethod === PickupMethod.AT_COUNTER) {
          order.pickupMethod = PickupMethod.AT_COUNTER;
          order.tableNumber = null;
        }

        // Lưu payment attempt PENDING bền vững trước khi gọi mock gateway (FIX-12)
        const paymentAttempt = manager.create(Payment, {
          orderId: order.id,
          userId,
          amount: Number(dto.amount).toFixed(2),
          method: dto.method,
          status: PaymentStatus.PENDING,
          idempotencyKey,
          transactionId: null,
          merchantReference,
          buzzerCode: null,
          refundKey: null,
          payloadHash,
        });
        const savedAttempt = await manager.save(Payment, paymentAttempt);

        // Gọi Mock Payment Gateway (FIX-12)
        const gwResult = await this.mockGateway.charge({
          merchantReference,
          amount: dto.amount,
          method: dto.method,
          mockOutcome: dto.mockOutcome,
        });

        // 3. Xử lý khi Gateway FAILED (EX-06 / FIX-03)
        if (gwResult.status === 'FAILED') {
          assertOrderTransition(order.status, OrderStatus.PAYMENT_FAILED, order.id);
          order.status = OrderStatus.PAYMENT_FAILED;
          const updatedOrder = await manager.save(Order, order);

          savedAttempt.status = PaymentStatus.FAILED;
          savedAttempt.transactionId = gwResult.transactionId;
          const savedFailedPayment = await manager.save(Payment, savedAttempt);

          return {
            success: false,
            status: PaymentStatus.FAILED,
            message:
              gwResult.reason ||
              'Thanh toán thất bại: Số dư tài khoản không đủ hoặc thẻ bị từ chối.',
            payment: savedFailedPayment,
            order: updatedOrder,
          };
        }

        // 4. Xử lý khi Gateway PENDING / Timeout (EX-07 / FIX-11)
        if (gwResult.status === 'PENDING') {
          savedAttempt.status = PaymentStatus.PENDING;
          savedAttempt.transactionId = gwResult.transactionId;
          const savedPendingPayment = await manager.save(Payment, savedAttempt);

          return {
            success: false,
            status: PaymentStatus.PENDING,
            message:
              'Giao dịch đang chờ phản hồi từ cổng thanh toán. Vui lòng đối soát hoặc kiểm tra lại sau.',
            payment: savedPendingPayment,
            order,
          };
        }

        // 5. Gateway SUCCESS: Thực hiện trừ kho OCC và finalize (TX2) (FIX-09)
        const items = await manager.find(OrderItem, {
          where: { order: { id: order.id } },
          relations: { product: true },
        });
        order.items = items;

        return await this.finalizeSuccessfulPaymentWithOcc(
          manager,
          order,
          savedAttempt,
          gwResult.transactionId,
        );
      });
    } catch (err: unknown) {
      // Khi gặp xung đột tồn kho OCC: TX2 đã rollback, thực thi TX3 Compensation (FIX-12 / BR-REFUND-OCC)
      if (err instanceof OccCompensationNeededException) {
        const compensationResult = await this.executeTx3Compensation(
          dto.orderId,
          userId,
          dto,
          idempotencyKey,
          payloadHash,
          merchantReference,
        );

        throw new ConflictException({
          statusCode: 409,
          message: err.message,
          status: compensationResult.payment.status,
          refundKey: compensationResult.payment.refundKey,
          payment: compensationResult.payment,
          order: compensationResult.order,
        });
      }

      // Xử lý race condition Unique Constraint (PostgreSQL 23505) (FIX-10)
      if ((err as { code?: string })?.code === '23505') {
        const racePayment = await this.paymentRepository.findOne({
          where: { idempotencyKey },
          relations: { order: true },
        });
        if (racePayment) {
          this.validateIdempotentMatch(racePayment, userId, dto, payloadHash);
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
   * Cơ chế chung hoàn tất thanh toán và trừ kho OCC cho cả luồng chính và reconciliation (FIX-09)
   */
  private async finalizeSuccessfulPaymentWithOcc(
    manager: EntityManager,
    order: Order,
    payment: Payment,
    transactionId: string,
  ): Promise<PaymentProcessResult> {
    for (const item of order.items) {
      if (!item.productId) continue;

      const product = await manager.findOne(Product, {
        where: { id: item.productId },
      });

      if (!product || !product.isAvailable || product.stock < item.quantity) {
        throw new OccCompensationNeededException(
          `Sản phẩm '${product?.name ?? item.productName}' hiện không đủ số lượng tồn kho (còn ${
            product?.stock ?? 0
          } ly). Đã kích hoạt hoàn tiền bồi hoàn.`,
        );
      }

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
        throw new OccCompensationNeededException(
          `Xung đột tồn kho đồng thời đối với sản phẩm '${product.name}'. Giao dịch đã được bồi hoàn tự động.`,
        );
      }
    }

    assertOrderTransition(order.status, OrderStatus.PAID, order.id);
    const buzzerCode = `#BL-${order.id.toString().padStart(4, '0')}`;
    order.status = OrderStatus.PAID;
    order.orderCode = buzzerCode;
    const paidOrder = await manager.save(Order, order);

    payment.status = PaymentStatus.SUCCESS;
    payment.transactionId = transactionId;
    payment.buzzerCode = buzzerCode;
    const savedPayment = await manager.save(Payment, payment);

    return {
      success: true,
      status: PaymentStatus.SUCCESS,
      message: 'Thanh toán thành công.',
      payment: savedPayment,
      order: paidOrder,
    };
  }

  /**
   * Thực hiện giao dịch độc lập TX3 bồi hoàn BR-REFUND-OCC qua Mock Gateway (FIX-12)
   */
  private async executeTx3Compensation(
    orderId: number,
    userId: number,
    dto: CreatePaymentDto,
    idempotencyKey: string,
    payloadHash: string,
    merchantReference: string,
  ): Promise<{ payment: Payment; order: Order }> {
    const refundKey = `refund-${idempotencyKey}`;

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

      // 1. Ghi nhận Payment REFUND_PENDING
      const refundPayment = tx3Manager.create(Payment, {
        orderId,
        userId,
        amount: Number(dto.amount).toFixed(2),
        method: dto.method,
        status: PaymentStatus.REFUND_PENDING,
        idempotencyKey,
        transactionId: `TX-COMPENSATED-${Date.now()}`,
        merchantReference,
        buzzerCode: null,
        refundKey,
        payloadHash,
      });

      // 2. Thực hiện mock refund qua gateway (FIX-12)
      const refundResult = await this.mockGateway.refund({
        merchantReference,
        refundKey,
        amount: dto.amount,
      });

      if (refundResult.status === 'SUCCESS') {
        refundPayment.status = PaymentStatus.REFUNDED;
        refundPayment.transactionId = refundResult.refundTransactionId;
      } else {
        refundPayment.status = PaymentStatus.REFUND_PENDING;
      }

      const savedRefund = await tx3Manager.save(Payment, refundPayment);
      return { payment: savedRefund, order: cancelledOrder! };
    });
  }

  /**
   * Đối soát giao dịch PENDING / TIMEOUT với kiểm tra OCC và gateway thực (FIX-09 & FIX-11)
   */
  async reconcilePayment(
    idempotencyKey: string,
    userId: number,
  ): Promise<PaymentProcessResult> {
    this.validateIdempotencyKeyFormat(idempotencyKey);

    const payment = await this.paymentRepository.findOne({
      where: { idempotencyKey },
      relations: { order: true },
    });

    if (!payment) {
      throw new NotFoundException(`Giao dịch với khóa '${idempotencyKey}' không tồn tại.`);
    }

    if (payment.userId !== userId) {
      throw new ForbiddenException('Bạn không có quyền truy cập giao dịch này.');
    }

    // Nếu đã hoàn tất SUCCESS, FAILED hoặc REFUNDED -> trả kết quả đã lưu
    if (payment.status === PaymentStatus.SUCCESS) {
      return {
        isDuplicate: true,
        success: true,
        status: PaymentStatus.SUCCESS,
        message: 'Giao dịch đã được ghi nhận thành công trước đó.',
        payment,
        order: payment.order,
      };
    }

    if (payment.status === PaymentStatus.FAILED) {
      return {
        isDuplicate: true,
        success: false,
        status: PaymentStatus.FAILED,
        message: 'Giao dịch đã thất bại trước đó.',
        payment,
        order: payment.order,
      };
    }

    if (payment.status === PaymentStatus.REFUNDED) {
      return {
        isDuplicate: true,
        success: false,
        status: PaymentStatus.REFUNDED,
        message: 'Giao dịch đã được bồi hoàn hoàn tiền trước đó.',
        payment,
        order: payment.order,
      };
    }

    if (payment.status === PaymentStatus.REFUND_PENDING) {
      // Thử hoàn tất thao tác refund đang dở dang tại gateway
      const refundResult = await this.mockGateway.refund({
        merchantReference: payment.merchantReference!,
        refundKey: payment.refundKey!,
        amount: Number(payment.amount),
      });
      if (refundResult.status === 'SUCCESS') {
        payment.status = PaymentStatus.REFUNDED;
        payment.transactionId = refundResult.refundTransactionId;
        const updated = await this.paymentRepository.save(payment);
        return {
          isDuplicate: true,
          success: false,
          status: PaymentStatus.REFUNDED,
          message: 'Bồi hoàn hoàn tiền đã được hoàn tất thành công.',
          payment: updated,
          order: payment.order,
        };
      }
      return {
        isDuplicate: true,
        success: false,
        status: PaymentStatus.REFUND_PENDING,
        message: 'Tiến trình hoàn tiền vẫn đang được xử lý tại cổng thanh toán.',
        payment,
        order: payment.order,
      };
    }

    // Tra cứu trạng thái thực tế từ Mock Gateway (FIX-11)
    const gwResult = await this.mockGateway.queryTransaction(
      payment.merchantReference ?? '',
    );

    if (!gwResult || gwResult.status === 'PENDING') {
      return {
        isDuplicate: true,
        success: false,
        status: PaymentStatus.PENDING,
        message:
          'Giao dịch vẫn đang chờ xử lý từ cổng thanh toán. Vui lòng đối soát lại sau.',
        payment,
        order: payment.order,
      };
    }

    if (gwResult.status === 'FAILED') {
      return await this.dataSource.transaction(async (manager) => {
        const order = await manager.findOne(Order, {
          where: { id: payment.orderId },
          lock: { mode: 'pessimistic_write' },
        });
        if (order && order.status !== OrderStatus.PAYMENT_FAILED) {
          order.status = OrderStatus.PAYMENT_FAILED;
          await manager.save(Order, order);
        }
        payment.status = PaymentStatus.FAILED;
        payment.transactionId = gwResult.transactionId;
        const saved = await manager.save(Payment, payment);

        return {
          success: false,
          status: PaymentStatus.FAILED,
          message: 'Giao dịch thất bại tại cổng thanh toán.',
          payment: saved,
          order: order!,
        };
      });
    }

    // Gateway báo SUCCESS: Thực hiện trừ kho OCC và finalize (TX2) (FIX-09)
    try {
      return await this.dataSource.transaction(async (manager: EntityManager) => {
        const order = await manager.findOne(Order, {
          where: { id: payment.orderId },
          lock: { mode: 'pessimistic_write' },
        });

        if (!order) {
          throw new NotFoundException(`Đơn hàng #${payment.orderId} không tồn tại.`);
        }

        // Kiểm tra xem đã có ai hoàn tất reconcile trước chưa (chống concurrent reconcile)
        if (order.status === OrderStatus.PAID) {
          const freshPayment = await manager.findOne(Payment, {
            where: { id: payment.id },
            relations: { order: true },
          });
          return {
            isDuplicate: true,
            success: true,
            status: PaymentStatus.SUCCESS,
            message: 'Giao dịch đã được đối soát thành công trước đó.',
            payment: freshPayment!,
            order,
          };
        }

        const items = await manager.find(OrderItem, {
          where: { order: { id: order.id } },
          relations: { product: true },
        });
        order.items = items;

        return await this.finalizeSuccessfulPaymentWithOcc(
          manager,
          order,
          payment,
          gwResult.transactionId,
        );
      });
    } catch (err: unknown) {
      if (err instanceof OccCompensationNeededException) {
        const compensationResult = await this.executeTx3Compensation(
          payment.orderId,
          userId,
          {
            orderId: payment.orderId,
            amount: Number(payment.amount),
            method: payment.method,
            idempotencyKey: payment.idempotencyKey,
          },
          idempotencyKey,
          payment.payloadHash || '',
          payment.merchantReference || '',
        );

        throw new ConflictException({
          statusCode: 409,
          message: err.message,
          status: compensationResult.payment.status,
          refundKey: compensationResult.payment.refundKey,
          payment: compensationResult.payment,
          order: compensationResult.order,
        });
      }
      throw err;
    }
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
