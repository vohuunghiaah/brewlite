import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';
import { AuthModule } from './auth/auth.module';
import { PaymentsModule } from './payments/payments.module';
import { databaseOptions } from './database';
import { HealthController } from './health.controller';

@Module({
  imports: [
    // Đọc biến môi trường từ file .env ở thư mục gốc
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
    }),

    // Cấu hình kết nối PostgreSQL
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: () => ({
        ...databaseOptions(),
        autoLoadEntities: true,
        migrationsRun: true,
        retryAttempts: 5,
        retryDelay: 3000,
      }),
    }),

    ProductsModule,
    AuthModule,
    OrdersModule,
    PaymentsModule,
  ],

  controllers: [AppController, HealthController],

  providers: [AppService],
})
export class AppModule {}
