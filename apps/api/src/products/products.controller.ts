
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';

import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CatalogAdminGuard } from './guards/catalog-admin.guard';

@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
  ) {}

  // GET /products
  // Lấy danh sách tất cả sản phẩm (Public)
  @Get()
  findAll() {
    return this.productsService.findAll();
  }

  // GET /products/:id
  // Lấy thông tin chi tiết sản phẩm (Public)
  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.productsService.findOne(id);
  }

  // POST /products
  // Thêm sản phẩm mới (Protected by CatalogAdminGuard)
  @Post()
  @UseGuards(CatalogAdminGuard)
  create(
    @Body() data: CreateProductDto,
  ) {
    return this.productsService.create(data);
  }

  // PATCH /products/:id
  // Cập nhật thông tin sản phẩm (Protected by CatalogAdminGuard)
  @Patch(':id')
  @UseGuards(CatalogAdminGuard)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdateProductDto,
  ) {
    return this.productsService.update(id, data);
  }

  // DELETE /products/:id
  // Xóa sản phẩm (Protected by CatalogAdminGuard)
  @Delete(':id')
  @UseGuards(CatalogAdminGuard)
  remove(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.productsService.remove(id);
  }
}
