import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ConsulService } from '@cloudphone/shared';

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
    .setVersion('1.0.0')
    .addBearerAuth()
    .addTag('Virtual Numbers', 'Manage virtual phone numbers for SMS reception')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    logger.log('SIGTERM received, shutting down...');
    await app.close();
  });

  process.on('SIGINT', async () => {
    logger.log('SIGINT received, shutting down...');
    await app.close();
  });

  const port = parseInt(configService.get<string>('PORT', '30008'), 10);
  await app.listen(port);

  // ========== 注册到 Consul ==========

  try {
    const consulService = app.get(ConsulService);
    await consulService.registerService('sms-receive-service', port, ['v1', 'sms']);
    logger.log(`✅ Service registered to Consul`);
  } catch (error) {
    logger.warn(`⚠️  Failed to register to Consul: ${error.message}`);
  }

  // ========== 服务启动日志 ==========

  logger.log(`🚀 SMS Receive Service is running on: http://localhost:${port}`);
  logger.log(`📚 API Documentation: http://localhost:${port}/docs`);
  logger.log(`📊 Environment: ${configService.get<string>('NODE_ENV')}`);
  logger.log(`💾 Database: ${configService.get<string>('DB_DATABASE')}`);
}

bootstrap();
