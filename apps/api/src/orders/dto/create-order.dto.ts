import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProductSize } from '@prisma/client';

export class CreateOrderItemDto {
  @IsString()
  @IsNotEmpty({ message: 'Mã sản phẩm không được để trống.' })
  productId: string;

  @IsEnum(ProductSize, { message: 'Kích cỡ phải là SMALL, MEDIUM hoặc LARGE.' })
  size: ProductSize;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  toppings?: string[];

  @IsInt({ message: 'Số lượng phải là số nguyên dương.' })
  @Min(1, { message: 'Số lượng đặt tối thiểu là 1.' })
  quantity: number;
}

export class CreateOrderDto {
  @IsArray({ message: 'Danh sách sản phẩm không hợp lệ.' })
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];

  @IsString()
  @IsOptional()
  note?: string;

  @IsString()
  @IsOptional()
  promoCode?: string;
}

