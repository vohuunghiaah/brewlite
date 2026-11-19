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
    if (existingPayment.userId !== userId) {
      throw new ForbiddenException(
        'Khóa idempotency đã được sử dụng bởi tài khoản khác.',
      );
    }

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
   * Khởi tạo và xử lý giao dịch thanh toán bền vững (FIX-14: Commit-Before-Gateway Architecture)
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
    const merchantReference = `BL-REF-${dto.orderId}-${idempotencyKey.replace(/-/g, '').slice(0, 16)}`;

    // 1. Kiểm tra Idempotency trước transaction (FR-08 & EX-08 & FIX-10)
    let paymentAttempt = await this.paymentRepository.findOne({
      where: { idempotencyKey },
      relations: { order: true },
    });

    if (paymentAttempt) {
      this.validateIdempotentMatch(paymentAttempt, userId, dto, payloadHash);

      // Nếu giao dịch đã kết thúc ở trạng thái cuối cùng, trả về kết quả ngay
      if (paymentAttempt.status === PaymentStatus.SUCCESS) {
        return {
          isDuplicate: true,
          success: true,
          status: PaymentStatus.SUCCESS,
          message: 'Giao dịch đã được ghi nhận thành công trước đó.',
          payment: paymentAttempt,
          order: paymentAttempt.order,
        };
      }

      if (paymentAttempt.status === PaymentStatus.FAILED) {
        return {
          isDuplicate: true,
          success: false,
          status: PaymentStatus.FAILED,
          message: 'Giao dịch trước đó đã kết thúc với trạng thái FAILED.',
          payment: paymentAttempt,
          order: paymentAttempt.order,
        };
      }

      if (paymentAttempt.status === PaymentStatus.REFUNDED) {
        return {
          isDuplicate: true,
          success: false,
          status: PaymentStatus.REFUNDED,
          message: 'Giao dịch trước đó đã được hoàn tiền bồi hoàn (REFUNDED).',
          payment: paymentAttempt,
          order: paymentAttempt.order,
        };
      }

      if (paymentAttempt.status === PaymentStatus.REFUND_PENDING) {
        // Tiếp tục hoàn tất hoàn tiền dở dang
        return await this.reconcilePayment(idempotencyKey, userId);
      }
    }

    // 2. TX1: Tạo và COMMIT Payment PENDING trước khi gọi gateway (FIX-14)
    if (!paymentAttempt) {
      try {
        paymentAttempt = await this.dataSource.transaction(
          async (manager: EntityManager) => {
            const order = await manager.findOne(Order, {
              where: { id: dto.orderId },
              lock: { mode: 'pessimistic_write' },
            });

            if (!order) {
              throw new NotFoundException(`Đơn hàng #${dto.orderId} không tồn tại.`);
            }

            if (order.userId !== userId) {
              throw new ForbiddenException(
                'Bạn không có quyền thanh toán cho đơn hàng này.',
              );
            }

            // Kiểm tra in-lock existing payment cho chính idempotencyKey này
            const inLockPayment = await manager.findOne(Payment, {
              where: { idempotencyKey },
              relations: { order: true },
            });
            if (inLockPayment) {
              this.validateIdempotentMatch(inLockPayment, userId, dto, payloadHash);
              return inLockPayment;
            }

            // Kiểm tra xem đơn hàng có giao dịch PENDING hoặc REFUND_PENDING nào khác không (FIX-11 & FIX-21)
            const activePendingPayment = await manager.findOne(Payment, {
              where: [
                { orderId: order.id, status: PaymentStatus.PENDING },
                { orderId: order.id, status: PaymentStatus.REFUND_PENDING },
              ],
            });
            if (
              activePendingPayment &&
              activePendingPayment.idempotencyKey !== idempotencyKey
            ) {
              throw new ConflictException(
                'Đơn hàng đang có một giao dịch thanh toán hoặc bồi hoàn đang chờ xử lý (PENDING/REFUND_PENDING). Vui lòng đối soát hoặc chờ kết quả trước khi thử lại.',
              );
            }

            // Kiểm tra máy trạng thái đơn hàng (FR-07)
            if (order.status === OrderStatus.PAID) {
              const paidPayment = await manager.findOne(Payment, {
                where: { orderId: order.id, idempotencyKey },
                relations: { order: true },
              });
              if (paidPayment) {
                return paidPayment;
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

            if (Math.abs(Number(order.totalAmount) - dto.amount) > 0.01) {
              throw new BadRequestException(
                `Số tiền thanh toán (${dto.amount}) không khớp với tổng tiền đơn hàng (${order.totalAmount}).`,
              );
            }

            // Cập nhật thông tin nhận hàng
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
            await manager.save(Order, order);

            // Tạo và lưu attempt PENDING (FIX-14: commit bền vững trước gateway)
            const newAttempt = manager.create(Payment, {
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

            return await manager.save(Payment, newAttempt);
          },
        );
      } catch (err: unknown) {
        if ((err as { code?: string })?.code === '23505') {
          const racePayment = await this.paymentRepository.findOne({
            where: { idempotencyKey },
            relations: { order: true },
          });
          if (racePayment) {
            this.validateIdempotentMatch(racePayment, userId, dto, payloadHash);
            paymentAttempt = racePayment;
          } else {
            throw err;
          }
        } else {
          throw err;
        }
      }
    }

    if (!paymentAttempt) {
      throw new ConflictException('Không thể khởi tạo phiên thanh toán.');
    }

    if (paymentAttempt.status === PaymentStatus.SUCCESS) {
      const currentOrder =
        paymentAttempt.order ||
        (await this.orderRepository.findOne({
          where: { id: paymentAttempt.orderId },
        }));
      return {
        isDuplicate: true,
        success: true,
        status: PaymentStatus.SUCCESS,
        message: 'Giao dịch đã được ghi nhận thành công trước đó.',
        payment: paymentAttempt,
        order: currentOrder!,
      };
    }

    // 3. Gọi cổng thanh toán giả lập BÊN NGOÀI DATABASE TRANSACTION (FIX-14 & FIX-15)
    // Không giữ DB lock hay transaction trong lúc gọi mock gateway
    let gwResult = await this.mockGateway.queryTransaction(merchantReference);
    if (!gwResult) {
      gwResult = await this.mockGateway.charge({
        merchantReference,
        amount: dto.amount,
        method: dto.method,
        mockOutcome: dto.mockOutcome,
      });
    }

    // 4. Xử lý kết quả Gateway FAILED (EX-06 / FIX-03)
    if (gwResult.status === 'FAILED') {
      return await this.dataSource.transaction(async (manager) => {
        const order = await manager.findOne(Order, {
          where: { id: paymentAttempt.orderId },
          lock: { mode: 'pessimistic_write' },
        });
        if (order && order.status !== OrderStatus.PAYMENT_FAILED) {
          assertOrderTransition(order.status, OrderStatus.PAYMENT_FAILED, order.id);
          order.status = OrderStatus.PAYMENT_FAILED;
          await manager.save(Order, order);
        }

        paymentAttempt.status = PaymentStatus.FAILED;
        paymentAttempt.transactionId = gwResult.transactionId;
        const savedFailed = await manager.save(Payment, paymentAttempt);

        return {
          success: false,
          status: PaymentStatus.FAILED,
          message:
            gwResult.reason ||
            'Thanh toán thất bại: Số dư tài khoản không đủ hoặc thẻ bị từ chối.',
          payment: savedFailed,
          order: order!,
        };
      });
    }

    // 5. Xử lý kết quả Gateway PENDING (EX-07 / FIX-11)
    if (gwResult.status === 'PENDING') {
      paymentAttempt.transactionId = gwResult.transactionId;
      const savedPending = await this.paymentRepository.save(paymentAttempt);
      const order =
        paymentAttempt.order ||
        (await this.orderRepository.findOne({
          where: { id: paymentAttempt.orderId },
        }));

      return {
        success: false,
        status: PaymentStatus.PENDING,
        message:
          'Giao dịch đang chờ phản hồi từ cổng thanh toán. Vui lòng đối soát hoặc kiểm tra lại sau.',
        payment: savedPending,
        order,
      };
    }

    // 6. Gateway SUCCESS: Bắt đầu TX2 trừ kho bằng OCC và chuyển trạng thái PAID (FIX-09, FIX-14 & FIX-16)
    try {
      return await this.dataSource.transaction(async (manager: EntityManager) => {
        const order = await manager.findOne(Order, {
          where: { id: paymentAttempt.orderId },
          lock: { mode: 'pessimistic_write' },
        });

        if (!order) {
          throw new NotFoundException(
            `Đơn hàng #${paymentAttempt.orderId} không tồn tại.`,
          );
        }

        // Chống race condition: nếu order đã được PAID bởi request đối soát khác
        if (order.status === OrderStatus.PAID) {
          const freshPayment = await manager.findOne(Payment, {
            where: { id: paymentAttempt.id },
            relations: { order: true },
          });
          return {
            isDuplicate: true,
            success: true,
            status: PaymentStatus.SUCCESS,
            message: 'Giao dịch đã được ghi nhận thành công trước đó.',
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
          paymentAttempt,
          gwResult.transactionId,
        );
      });
    } catch (err: unknown) {
      // Khi gặp xung đột tồn kho OCC: TX2 đã rollback, thực thi TX3 Compensation (FIX-12 & FIX-16 / BR-REFUND-OCC)
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
   * Thực hiện giao dịch độc lập TX3 bồi hoàn BR-REFUND-OCC theo đúng chu trình FIX-16
   */
  private async executeTx3Compensation(
    orderId: number,
    userId: number,
    dto: { orderId: number; amount: number; method: string; idempotencyKey?: string },
    idempotencyKey: string,
    payloadHash: string,
    merchantReference: string,
  ): Promise<{ payment: Payment; order: Order }> {
    const refundKey = `refund-${idempotencyKey}`;

    // 1. TX3: Ghi Payment REFUND_PENDING, refundKey và CANCELLED Order rồi COMMIT (FIX-16)
    const { pendingRefundPayment, cancelledOrder } = await this.dataSource.transaction(
      async (tx3Manager: EntityManager) => {
        const order = await tx3Manager.findOne(Order, {
          where: { id: orderId },
          lock: { mode: 'pessimistic_write' },
        });

        let updatedOrder = order;
        if (order && order.status !== OrderStatus.CANCELLED) {
          order.status = OrderStatus.CANCELLED;
          updatedOrder = await tx3Manager.save(Order, order);
        }

        // Tìm payment hiện có cho key này hoặc tạo mới
        let paymentRecord = await tx3Manager.findOne(Payment, {
          where: { idempotencyKey },
        });

        if (paymentRecord) {
          paymentRecord.status = PaymentStatus.REFUND_PENDING;
          paymentRecord.refundKey = refundKey;
          paymentRecord = await tx3Manager.save(Payment, paymentRecord);
        } else {
          paymentRecord = tx3Manager.create(Payment, {
            orderId,
            userId,
            amount: Number(dto.amount).toFixed(2),
            method: dto.method as any,
            status: PaymentStatus.REFUND_PENDING,
            idempotencyKey,
            transactionId: `TX-COMPENSATED-${Date.now()}`,
            merchantReference,
            buzzerCode: null,
            refundKey,
            payloadHash,
          });
          paymentRecord = await tx3Manager.save(Payment, paymentRecord);
        }

        return { pendingRefundPayment: paymentRecord, cancelledOrder: updatedOrder! };
      },
    );

    // 2. Gọi mockGateway.refund() BÊN NGOÀI TX3 (FIX-16: không giữ DB transaction hay lock)
    const refundResult = await this.mockGateway.refund({
      merchantReference,
      refundKey,
      amount: dto.amount,
    });

    // 3. Nếu Gateway SUCCESS: Cập nhật Payment REFUNDED và Order CANCELLED trong cùng transaction TX4 (FIX-21)
    if (refundResult.status === 'SUCCESS') {
      try {
        await this.dataSource.transaction(async (tx4Manager) => {
          const freshOrder = await tx4Manager.findOne(Order, {
            where: { id: orderId },
            lock: { mode: 'pessimistic_write' },
          });
          if (freshOrder && freshOrder.status !== OrderStatus.CANCELLED) {
            freshOrder.status = OrderStatus.CANCELLED;
            await tx4Manager.save(Order, freshOrder);
          }

          const fresh = await tx4Manager.findOne(Payment, {
            where: { id: pendingRefundPayment.id },
            lock: { mode: 'pessimistic_write' },
          });
          if (fresh) {
            fresh.status = PaymentStatus.REFUNDED;
            fresh.transactionId = refundResult.refundTransactionId;
            await tx4Manager.save(Payment, fresh);
            pendingRefundPayment.status = PaymentStatus.REFUNDED;
            pendingRefundPayment.transactionId = refundResult.refundTransactionId;
          }
        });
      } catch {
        // Nếu DB update thất bại, payment vẫn ở REFUND_PENDING để reconcile hoàn tất sau
      }
    }

    return { payment: pendingRefundPayment, order: cancelledOrder };
  }

  /**
   * Đối soát giao dịch PENDING / TIMEOUT với kiểm tra OCC và gateway thực (FIX-09, FIX-11, FIX-16 & FIX-17)
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
      throw new NotFoundException(
        `Giao dịch với khóa '${idempotencyKey}' không tồn tại.`,
      );
    }

    if (payment.userId !== userId) {
      throw new ForbiddenException('Bạn không có quyền truy cập giao dịch này.');
    }

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

    // Xử lý hoàn tất trạng thái REFUND_PENDING (FIX-16)
    if (payment.status === PaymentStatus.REFUND_PENDING) {
      const refundResult = await this.mockGateway.refund({
        merchantReference: payment.merchantReference!,
        refundKey: payment.refundKey!,
        amount: Number(payment.amount),
      });

      if (refundResult.status === 'SUCCESS') {
        return await this.dataSource.transaction(async (manager) => {
          const freshOrder = await manager.findOne(Order, {
            where: { id: payment.orderId },
            lock: { mode: 'pessimistic_write' },
          });
          if (freshOrder && freshOrder.status !== OrderStatus.CANCELLED) {
            freshOrder.status = OrderStatus.CANCELLED;
            await manager.save(Order, freshOrder);
          }
          payment.status = PaymentStatus.REFUNDED;
          payment.transactionId = refundResult.refundTransactionId;
          const updated = await manager.save(Payment, payment);
          return {
            isDuplicate: true,
            success: false,
            status: PaymentStatus.REFUNDED,
            message: 'Bồi hoàn hoàn tiền đã được hoàn tất thành công.',
            payment: updated,
            order: freshOrder || payment.order,
          };
        });
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

    // Tra cứu trạng thái thực tế từ Mock Gateway bên ngoài DB lock (FIX-11 & FIX-15)
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

    // Gateway báo SUCCESS: Bắt đầu TX2 trừ kho OCC và finalize (FIX-09)
    try {
      return await this.dataSource.transaction(async (manager: EntityManager) => {
        const order = await manager.findOne(Order, {
          where: { id: payment.orderId },
          lock: { mode: 'pessimistic_write' },
        });

        if (!order) {
          throw new NotFoundException(`Đơn hàng #${payment.orderId} không tồn tại.`);
        }

        // Chống concurrent reconcile
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

  /**
   * Truy vấn trạng thái thuần đọc (Pure READ-ONLY), không gây side effects (FIX-17)
   */
  async getPaymentStatus(
    idempotencyKey: string,
    userId: number,
  ): Promise<{ status: PaymentStatus; payment: Payment; order: Order | null }> {
    this.validateIdempotencyKeyFormat(idempotencyKey);

    const payment = await this.paymentRepository.findOne({
      where: { idempotencyKey },
      relations: { order: true },
    });

    if (!payment) {
      throw new NotFoundException(
        `Giao dịch với khóa '${idempotencyKey}' không tồn tại.`,
      );
    }

    if (payment.userId !== userId) {
      throw new ForbiddenException('Bạn không có quyền truy cập giao dịch này.');
    }

    return {
      status: payment.status,
      payment,
      order: payment.order,
    };
  }

  private isReconcilingGlobal = false;

  /**
   * Đối soát hàng loạt các giao dịch dở dang phục vụ recovery sau restart ứng dụng (FIX-17 & FIX-19)
   * Sử dụng atomic coordination (PostgreSQL advisory lock) để bảo đảm an toàn khi nhiều worker cùng chạy.
   */
  async reconcilePendingPayments(): Promise<{ reconciledCount: number }> {
    if (this.isReconcilingGlobal) {
      return { reconciledCount: 0 };
    }
    this.isReconcilingGlobal = true;

    try {
      const pendings = await this.paymentRepository.find({
        where: [
          { status: PaymentStatus.PENDING },
          { status: PaymentStatus.REFUND_PENDING },
        ],
        relations: { order: true },
        order: { createdAt: 'ASC' },
      });

      let count = 0;
      for (const p of pendings) {
        let lockAcquired = true;
        if (this.dataSource && this.dataSource.isInitialized) {
          try {
            const lockResult = await this.dataSource.query(
              `SELECT pg_try_advisory_lock(hashtext($1)) as locked`,
              [`reconcile_lock_${p.idempotencyKey}`],
            );
            lockAcquired = lockResult?.[0]?.locked === true;
          } catch {
            lockAcquired = true;
          }
        }

        if (!lockAcquired) {
          // Worker khác đang xử lý giao dịch này
          continue;
        }

        try {
          await this.reconcilePayment(p.idempotencyKey, p.userId);
          count++;
        } catch {
          // Bỏ qua lỗi đơn lẻ để tiếp tục các giao dịch khác
        } finally {
          if (this.dataSource && this.dataSource.isInitialized) {
            try {
              await this.dataSource.query(
                `SELECT pg_advisory_unlock(hashtext($1))`,
                [`reconcile_lock_${p.idempotencyKey}`],
              );
            } catch {
              // Ignore unlock error
            }
          }
        }
      }
      return { reconciledCount: count };
    } finally {
      this.isReconcilingGlobal = false;
    }
  }

  async findByOrder(orderId: number, userId: number): Promise<Payment[]> {
    const order = await this.orderRepository.findOneBy({ id: orderId });
    if (!order) {
      throw new NotFoundException(`Đơn hàng #${orderId} không tồn tại.`);
    }
    if (order.userId !== userId) {
      throw new ForbiddenException(
        'Bạn không có quyền truy cập thanh toán của đơn hàng này.',
      );
    }
    return this.paymentRepository.find({
      where: { orderId },
      order: { createdAt: 'DESC' },
    });
  }
}
