import { IsIn } from 'class-validator';
import { OrderStatus } from '../entities/order.entity';

export const serviceTargets = [OrderStatus.PREPARING, OrderStatus.READY, OrderStatus.COMPLETED];

export class UpdateOrderStatusDto {
  @IsIn(serviceTargets)
  status: OrderStatus;
}
