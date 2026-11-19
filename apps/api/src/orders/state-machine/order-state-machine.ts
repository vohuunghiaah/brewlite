import { BadRequestException } from '@nestjs/common';
import { OrderStatus } from '../entities/order.entity';

export const ALLOWED_ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [
    OrderStatus.PAID,
    OrderStatus.PAYMENT_FAILED,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.PAYMENT_FAILED]: [
    OrderStatus.PAID,
    OrderStatus.PAYMENT_FAILED,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.PAID]: [
    OrderStatus.PREPARING,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.PREPARING]: [
    OrderStatus.READY,
  ],
  [OrderStatus.READY]: [
    OrderStatus.COMPLETED,
  ],
  [OrderStatus.COMPLETED]: [],
  [OrderStatus.CANCELLED]: [],
};

export function assertOrderTransition(
  current: string | OrderStatus,
  target: OrderStatus,
  orderId?: number,
): void {
  const currentStatus = current as OrderStatus;
  if (currentStatus === target) {
    return;
  }

  const allowed = ALLOWED_ORDER_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(target)) {
    const idMsg = orderId ? ` đối với đơn hàng #${orderId}` : '';
    throw new BadRequestException(
      `Chuyển trạng thái đơn hàng không hợp lệ: Không thể chuyển từ '${currentStatus}' sang '${target}'${idMsg} (FR-07).`,
    );
  }
}
