
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsNumberString,
  Min,
  MinLength,
} from 'class-validator';

export class CreateProductDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  // Giá dạng chuỗi để tương thích PostgreSQL DECIMAL
  @IsNumberString()
  price!: string;

  @IsOptional()
  @IsString()
  imageUrl?: string | null;

  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number;
}
