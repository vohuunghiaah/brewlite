import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { PaymentMethod } from '../entities/payment.entity';

export enum PickupMethod {
  AT_COUNTER = 'AT_COUNTER',
  AT_TABLE = 'AT_TABLE',
}

export class CreatePaymentDto {
  @IsInt()
  @Min(1)
  orderId: number;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsEnum(PaymentMethod, {
    message: 'Phương thức thanh toán phải là MOMO, VIETQR hoặc CARD',
  })
  method: PaymentMethod;

  @IsOptional()
  @IsUUID('4', {
    message: 'Idempotency-Key phải có định dạng chuẩn UUID v4',
  })
  idempotencyKey?: string;

  @IsOptional()
  @IsEnum(['SUCCESS', 'FAILED', 'PENDING'], {
    message: 'mockOutcome chỉ chấp nhận SUCCESS, FAILED hoặc PENDING',
  })
  mockOutcome?: 'SUCCESS' | 'FAILED' | 'PENDING';

  @IsOptional()
  @IsEnum(PickupMethod, {
    message: 'Hình thức nhận hàng phải là AT_COUNTER hoặc AT_TABLE',
  })
  pickupMethod?: PickupMethod;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  tableNumber?: string;
}
