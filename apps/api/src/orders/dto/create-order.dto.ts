import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  IsArray,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';

import { Type } from 'class-transformer';
import { CreateOrderItemDto } from './create-order-item.dto';

export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  customerName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  customerPhone: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];
}