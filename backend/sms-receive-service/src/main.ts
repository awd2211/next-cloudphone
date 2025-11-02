import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const configService = app.get(ConfigService);

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Swagger API Documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('SMS Receive Service API')
    .setDescription('Virtual phone number and SMS receiving service for Cloud Phone Platform')
    .setVersion('1.0')
    .addTag('Virtual Numbers', 'Manage virtual phone numbers for SMS reception')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    logger.log('SIGTERM received, shutting down...');
    await app.close();
  });

  process.on('SIGINT', async () => {
    logger.log('SIGINT received, shutting down...');
    await app.close();
  });

  const port = configService.get<number>('PORT', 30007);
  await app.listen(port);

  logger.log(`🚀 SMS Receive Service is running on: http://localhost:${port}`);
  logger.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
  logger.log(`📊 Environment: ${configService.get<string>('NODE_ENV')}`);
  logger.log(`💾 Database: ${configService.get<string>('DB_DATABASE')}`);
}

bootstrap();
