import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
import { ProductSize } from '../entities/order-item.entity';

export { ProductSize };

export class CreateOrderItemDto {
  @IsInt()
  @IsPositive()
  productId: number;

  @IsOptional()
  @IsEnum(ProductSize, { message: 'Kích cỡ phải là SMALL, MEDIUM hoặc LARGE' })
  size?: ProductSize;

  @IsOptional()
  @IsArray()
  @IsString({ each: true, message: 'Tên topping phải là chuỗi' })
  toppings?: string[];

  @IsInt()
  @IsPositive()
  quantity: number;
}
