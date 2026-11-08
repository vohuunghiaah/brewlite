import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Cấu hình CORS cho Frontend BrewLite
  app.enableCors({
    origin: [
      'https://scaling-dollop-gxr9xjw7xg7gcvg5g-3000.app.github.dev',
    ],
    methods: [
      'GET',
      'POST',
      'PUT',
      'PATCH',
      'DELETE',
      'OPTIONS',
    ],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
    ],
    credentials: false,
  });

  // Khởi chạy Backend
  await app.listen(process.env.PORT ?? 3001, '0.0.0.0');

  console.log('BrewLite API đang chạy');
}

void bootstrap();