import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  // 启用全局异常过滤器
  app.useGlobalFilters(new AllExceptionsFilter());

  // 启用全局验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // 启用 CORS
  const corsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',')
    : [
        'http://localhost:30001',
        'http://localhost:30002',
        'http://localhost:5173',
        'http://localhost:5174',
      ];

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // 设置全局前缀
  app.setGlobalPrefix('api');

  // Swagger API 文档配置
  const config = new DocumentBuilder()
    .setTitle('API Gateway')
    .setDescription('云手机平台 - API 网关统一文档')
    .setVersion('1.0')
    .addTag('auth', '认证授权')
    .addTag('proxy', '服务代理')
    .addTag('health', '健康检查')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = process.env.PORT || 30000;
  await app.listen(port);

  logger.log(`🚀 API Gateway is running on: http://localhost:${port}`);
  logger.log(`📡 API prefix: /api`);
  logger.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
  logger.log(`🌐 CORS enabled for: ${corsOrigins.join(', ')}`);
  logger.log(`✅ Health check: http://localhost:${port}/api/health`);
}

bootstrap();
