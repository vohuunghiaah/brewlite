import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { PaymentMethod } from '@prisma/client';

export class ProcessPaymentDto {
  @IsString()
  @IsNotEmpty({ message: 'Mã đơn hàng không được để trống.' })
  orderId: string;

  @IsEnum(PaymentMethod, {
    message: 'Phương thức thanh toán phải là E_WALLET hoặc BANK_CARD.',
  })
  method: PaymentMethod;

  @IsNumber({}, { message: 'Số tiền thanh toán phải là số hợp lệ.' })
  @Min(1000, { message: 'Số tiền thanh toán tối thiểu là 1.000đ.' })
  amount: number;

  @IsString()
  @IsOptional()
  mockOutcome?: 'SUCCESS' | 'FAILED' | 'PENDING';
}
