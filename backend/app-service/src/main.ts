import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: configService.get('CORS_ORIGINS')?.split(',') || '*',
    credentials: true,
  });

  const port = configService.get('PORT') || 3003;
  await app.listen(port);

  console.log(`🚀 App Service is running on: http://localhost:${port}`);
}

bootstrap();
