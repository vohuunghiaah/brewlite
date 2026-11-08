
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  ParseIntPipe,
} from '@nestjs/common';

import { ProductsService } from './products.service';
import { Product } from './entities/product.entity';

@Controller('products')
export class ProductsController {

  constructor(
    private readonly productsService: ProductsService,
  ) {}

  // GET /products
  // Lấy danh sách sản phẩm
  @Get()
  findAll() {
    return this.productsService.findAll();
  }

  // GET /products/:id
  // Lấy chi tiết sản phẩm
  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.productsService.findOne(id);
  }

  // POST /products
  // Thêm sản phẩm mới
  @Post()
  create(@Body() data: Partial<Product>) {
    return this.productsService.create(data);
  }

  // PATCH /products/:id
  // Cập nhật sản phẩm
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: Partial<Product>,
  ) {
    return this.productsService.update(id, data);
  }

  // DELETE /products/:id
  // Xóa sản phẩm
  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.productsService.remove(id);
  }
}
