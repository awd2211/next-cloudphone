import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const configService = app.get(ConfigService);

  // ========== 日志配置 ==========
  app.useLogger(app.get(Logger));
  app.flushLogs();

  // ========== 安全配置 ==========
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  // ========== 验证和转换 ==========
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // ========== CORS 配置 ==========
  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1')) {
        callback(null, true);
      } else if (process.env.NODE_ENV === 'development') {
        callback(null, true);
      } else {
        const allowedOrigins = configService.get('CORS_ORIGINS')?.split(',') || [];
        if (allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      }
    },
    credentials: true,
  });

  // ========== Swagger API 文档 ==========
  const config = new DocumentBuilder()
    .setTitle('Notification Service API')
    .setDescription('云手机平台 - 通知服务 API')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('notifications', '通知管理')
    .addTag('templates', '模板管理')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = parseInt(configService.get('PORT') || '30006');
  await app.listen(port);

  const logger = app.get(Logger);
  logger.log(`🚀 Notification Service is running on: http://localhost:${port}`);
  logger.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
}

bootstrap();
