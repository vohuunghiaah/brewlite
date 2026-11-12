
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { ProductsSeedService } from './products-seed.service';

import { Product } from './entities/product.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product]),
  ],

  controllers: [
    ProductsController,
  ],

  providers: [
    ProductsService,
    ProductsSeedService,
  ],

  exports: [
    ProductsService,
  ],
})
export class ProductsModule {}
