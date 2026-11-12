import { BadRequestException } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';

export const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [
    OrderStatus.PAID,
    OrderStatus.PAYMENT_FAILED,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.PAYMENT_FAILED]: [OrderStatus.PAID, OrderStatus.CANCELLED],
  [OrderStatus.PAID]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
  [OrderStatus.PREPARING]: [OrderStatus.READY, OrderStatus.CANCELLED],
  [OrderStatus.READY]: [OrderStatus.COMPLETED],
  [OrderStatus.COMPLETED]: [],
  [OrderStatus.CANCELLED]: [],
};

export function assertTransition(
  currentStatus: OrderStatus,
  targetStatus: OrderStatus,
): void {
  if (currentStatus === targetStatus) {
    return;
  }

  const allowed = VALID_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(targetStatus)) {
    throw new BadRequestException(
      `Không thể chuyển trạng thái đơn hàng từ '${currentStatus}' sang '${targetStatus}'.`,
    );
  }
}
