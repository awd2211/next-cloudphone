import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { MessagePollingService } from './services/message-polling.service';

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

  // Graceful shutdown
  const pollingService = app.get(MessagePollingService);

  process.on('SIGTERM', async () => {
    logger.log('SIGTERM received, stopping all polling tasks...');
    pollingService.stopAllPolling();
    await app.close();
  });

  process.on('SIGINT', async () => {
    logger.log('SIGINT received, stopping all polling tasks...');
    pollingService.stopAllPolling();
    await app.close();
  });

  const port = configService.get<number>('PORT', 30007);
  await app.listen(port);

  logger.log(`🚀 SMS Receive Service is running on: http://localhost:${port}`);
  logger.log(`📊 Environment: ${configService.get<string>('NODE_ENV')}`);
  logger.log(`💾 Database: ${configService.get<string>('DB_DATABASE')}`);
}

bootstrap();
