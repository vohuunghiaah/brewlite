
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
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
  ) {}

  // GET /products
  // Lấy danh sách tất cả sản phẩm
  @Get()
  findAll() {
    return this.productsService.findAll();
  }

  // GET /products/:id
  // Lấy thông tin chi tiết sản phẩm
  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.productsService.findOne(id);
  }

  // POST /products
  // Thêm sản phẩm mới
  @Post()
  create(
    @Body() data: CreateProductDto,
  ) {
    return this.productsService.create(data);
  }

  // PATCH /products/:id
  // Cập nhật thông tin sản phẩm
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdateProductDto,
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
