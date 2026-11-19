import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { PaymentMethod } from '../entities/payment.entity';

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

  @IsString()
  @MaxLength(128)
  idempotencyKey: string;

  @IsOptional()
  @IsEnum(['SUCCESS', 'FAILED'], {
    message: 'mockOutcome chỉ chấp nhận SUCCESS hoặc FAILED',
  })
  mockOutcome?: 'SUCCESS' | 'FAILED';

  @IsOptional()
  @IsString()
  @MaxLength(30)
  pickupMethod?: 'AT_COUNTER' | 'AT_TABLE';

  @IsOptional()
  @IsString()
  @MaxLength(20)
  tableNumber?: string;
}
