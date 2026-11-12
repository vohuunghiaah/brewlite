import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { resolveCorsOrigin } from './common/utils/cors.util';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const allowedOrigins = resolveCorsOrigin(
    process.env.NODE_ENV,
    process.env.CORS_ORIGIN,
  );

  app.enableCors({
    origin: allowedOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`[BREWLITE_API] Running on http://localhost:${port}/api`);
}

bootstrap();
