import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProductsModule } from './products/products.module';

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
      inject: [ConfigService],

      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,

        host: config.get<string>('DATABASE_HOST', 'localhost'),

        port: Number(
          config.get<string>('DATABASE_PORT') ?? 5432,
        ),

        username: config.get<string>('DATABASE_USER'),

        password: config.get<string>('DATABASE_PASSWORD'),

        database: config.get<string>('DATABASE_NAME'),

        // Tự động nhận diện Entity trong các module
        autoLoadEntities: true,

        // Chỉ sử dụng trong môi trường phát triển
        synchronize: true,

        // Ghi log câu truy vấn SQL khi phát triển
        logging: true,

        // Thử kết nối lại nếu PostgreSQL chưa sẵn sàng
        retryAttempts: 5,
        retryDelay: 3000,
      }),
    }),

    ProductsModule,
  ],

  controllers: [AppController],

  providers: [AppService],
})
export class AppModule {}