
import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Product } from './entities/product.entity';

@Injectable()
export class ProductsService {

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  // 1. Lấy danh sách sản phẩm
  async findAll(): Promise<Product[]> {
    return this.productRepository.find({
      order: {
        id: 'ASC',
      },
    });
  }

  // 2. Lấy sản phẩm theo ID
  async findOne(id: number): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException(
        `Không tìm thấy sản phẩm có ID ${id}`,
      );
    }

    return product;
  }

  // 3. Thêm sản phẩm
  async create(data: Partial<Product>): Promise<Product> {
    const product = this.productRepository.create(data);

    return this.productRepository.save(product);
  }

  // 4. Cập nhật sản phẩm
  async update(
    id: number,
    data: Partial<Product>,
  ): Promise<Product> {

    const product = await this.findOne(id);

    Object.assign(product, data);

    return this.productRepository.save(product);
  }

  // 5. Xóa sản phẩm
  async remove(id: number) {

    const product = await this.findOne(id);

    await this.productRepository.remove(product);

    return {
      message: 'Xóa sản phẩm thành công',
    };
  }
}
