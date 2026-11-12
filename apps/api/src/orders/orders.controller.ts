import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
} from '@nestjs/common';

import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
  ) {}

  // GET /orders
  @Get()
  findAll() {
    return this.ordersService.findAll();
  }

  // GET /orders/:id
  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.ordersService.findOne(id);
  }

  // POST /orders
  @Post()
  create(
    @Body() createOrderDto: CreateOrderDto,
  ) {
    return this.ordersService.create(createOrderDto);
  }
}