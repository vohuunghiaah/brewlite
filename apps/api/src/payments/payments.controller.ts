import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';

import type { AuthenticatedUser } from '../auth/auth.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentsService } from './payments.service';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  processPayment(
    @Body() dto: CreatePaymentDto,
    @CurrentUser() user: AuthenticatedUser,
    @Headers('idempotency-key') idempotencyKeyHeader?: string,
  ) {
    const rawKey = idempotencyKeyHeader || dto.idempotencyKey;
    if (!rawKey || typeof rawKey !== 'string' || !rawKey.trim()) {
      throw new BadRequestException(
        'Idempotency-Key là bắt buộc (qua HTTP Header Idempotency-Key hoặc Body idempotencyKey).',
      );
    }
    const key = rawKey.trim();
    this.paymentsService.validateIdempotencyKeyFormat(key);
    dto.idempotencyKey = key;

    return this.paymentsService.processPayment(dto, user.id);
  }

  @Post('reconcile/:idempotencyKey')
  reconcilePaymentPost(
    @Param('idempotencyKey') idempotencyKey: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.paymentsService.reconcilePayment(idempotencyKey, user.id);
  }

  @Get('status/:idempotencyKey')
  getPaymentStatus(
    @Param('idempotencyKey') idempotencyKey: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.paymentsService.getPaymentStatus(idempotencyKey, user.id);
  }

  @Get('order/:orderId')
  findByOrder(
    @Param('orderId', ParseIntPipe) orderId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.paymentsService.findByOrder(orderId, user.id);
  }
}
