import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { validateEnvironmentFromProcessEnv } from './common/utils/validate-environment';

async function bootstrap() {
  validateEnvironmentFromProcessEnv();

  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.use(
    helmet({
      // Local and current Docker prod terminate HTTP without TLS in front of
      // the API. Enable HSTS only when the deployment is served over HTTPS.
      hsts: process.env.ENABLE_HSTS === 'true',
      contentSecurityPolicy: false,
    }),
  );
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:3010',
    credentials: true,
  });

  const port = process.env.PORT ?? 4010;
  await app.listen(port);
}

bootstrap();
