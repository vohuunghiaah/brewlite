import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Order } from '../orders/entities/order.entity';
import { Product } from '../products/entities/product.entity';
import { Payment } from './entities/payment.entity';
import { MockPaymentGateway } from './mock-payment-gateway.service';
import { PaymentsController } from './payments.controller';
import { PaymentsRecoveryWorker } from './payments-recovery.worker';
import { PaymentsService } from './payments.service';

@Module({
  imports: [TypeOrmModule.forFeature([Payment, Order, Product])],
  controllers: [PaymentsController],
  providers: [PaymentsService, MockPaymentGateway, PaymentsRecoveryWorker],
  exports: [PaymentsService, MockPaymentGateway, PaymentsRecoveryWorker],
})
export class PaymentsModule {}
