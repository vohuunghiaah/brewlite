
import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Product } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
  ) {}

  // Lấy danh sách sản phẩm
  async findAll(): Promise<Product[]> {
    return this.productsRepository.find({
      order: {
        id: 'ASC',
      },
    });
  }

  // Lấy chi tiết sản phẩm theo ID
  async findOne(id: number): Promise<Product> {
    const product = await this.productsRepository.findOne({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException(
        `Không tìm thấy sản phẩm có ID ${id}`,
      );
    }

    return product;
  }

  // Thêm sản phẩm mới
  async create(
    createProductDto: CreateProductDto,
  ): Promise<Product> {
    const product = this.productsRepository.create({
      ...createProductDto,
      price: String(createProductDto.price),
    });

    return this.productsRepository.save(product);
  }

  // Cập nhật sản phẩm
  async update(
    id: number,
    updateProductDto: UpdateProductDto,
  ): Promise<Product> {
    const product = await this.findOne(id);

    this.productsRepository.merge(product, {
      ...updateProductDto,
      ...(updateProductDto.price !== undefined && {
        price: String(updateProductDto.price),
      }),
    });

    return this.productsRepository.save(product);
  }

  // Xóa sản phẩm
  async remove(
    id: number,
  ): Promise<{ message: string }> {
    const product = await this.findOne(id);

    await this.productsRepository.remove(product);

    return {
      message: `Đã xóa sản phẩm có ID ${id}`,
    };
  }
}
