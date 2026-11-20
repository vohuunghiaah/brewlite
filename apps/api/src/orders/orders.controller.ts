import {
  BadRequestException,
  Controller,
  Get,
  Header,
  Post,
  Patch,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';

import type { AuthenticatedUser } from '../auth/auth.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';

import { StaffGuard } from '../auth/staff.guard';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
  ) {}

  // GET /orders
  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.ordersService.findAll(user.id);
  }

  // GET /orders/me (SRS §2 FR-11, UC-06 - must precede :id to avoid ParseIntPipe capturing 'me')
  @Get('me')
  findMyOrders(@CurrentUser() user: AuthenticatedUser) {
    return this.ordersService.findAll(user.id);
  }

  @Get('staff')
  @Header('Cache-Control', 'private, no-store')
  @UseGuards(StaffGuard)
  serviceQueue() {
    return this.ordersService.serviceQueue();
  }

  @Patch(':id/status')
  @UseGuards(StaffGuard)
  updateStatus(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateOrderStatusDto) {
    if (id < 1 || id > 2_147_483_647) throw new BadRequestException('ID đơn hàng không hợp lệ');
    return this.ordersService.updateServiceStatus(id, dto.status);
  }

  // GET /orders/:id
  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (id < 1 || id > 2_147_483_647) {
      throw new BadRequestException('ID đơn hàng không hợp lệ');
    }
    return this.ordersService.findOne(id, user.id);
  }

  // POST /orders
  @Post()
  create(
    @Body() createOrderDto: CreateOrderDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ordersService.create(createOrderDto, user.id);
  }
}
