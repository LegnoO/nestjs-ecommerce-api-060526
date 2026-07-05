import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ConfigService } from '@nestjs/config';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import { IS_PROD } from './common/constants/env.constants';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const reflector = app.get(Reflector);

  // ─── Security headers ──────────────────────────────────────────────────────
  app.use(helmet());

  app.use(cookieParser());

  // ─── CORS ──────────────────────────────────────────────────────────────────
  app.enableCors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-device-name'],
  });

  // ─── Global validation pipe ────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      disableErrorMessages: IS_PROD,
    }),
  );

  // ─── Class serializer ──────────────────────────────────────────────────────
  app.useGlobalInterceptors(new ClassSerializerInterceptor(reflector));

  app.useGlobalFilters(new HttpExceptionFilter(), new PrismaExceptionFilter());

  const port = config.get<number>('PORT', 3000);
  await app.listen(port);
}
void bootstrap();
