import {
  Controller,
  Post,
  Body,
  Headers,
  UseGuards,
  Req,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { ProcessPaymentDto } from './dto/process-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  async processPayment(
    @Req() req: any,
    @Headers('Idempotency-Key') idempotencyKey: string,
    @Body() dto: ProcessPaymentDto,
  ) {
    return this.paymentsService.processPayment(
      req.user.id,
      idempotencyKey,
      dto,
    );
  }
}
