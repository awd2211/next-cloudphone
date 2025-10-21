import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { ConsulService } from '@cloudphone/shared';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // 使用 Pino 作为应用的 Logger
  const logger = app.get(Logger);
  app.useLogger(logger);
  app.flushLogs();

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
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-Request-ID',
      'Accept',
      'Origin',
    ],
    exposedHeaders: ['X-Request-ID'],
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

  const port = parseInt(process.env.PORT) || 30000;
  await app.listen(port);

  // 注册到 Consul
  try {
    const consulService = app.get(ConsulService);
    await consulService.registerService('api-gateway', port, ['v1', 'gateway'], '/api/health');
    console.log(`✅ Service registered to Consul`);
  } catch (error) {
    console.warn(`⚠️  Failed to register to Consul: ${error.message}`);
  }

  console.log(`🚀 API Gateway is running on: http://localhost:${port}`);
  console.log(`📡 API prefix: /api`);
  console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
  console.log(`🌐 CORS enabled for: ${corsOrigins.join(', ')}`);
  console.log(`✅ Health check: http://localhost:${port}/health`);
  console.log(`🔗 Consul: http://${process.env.CONSUL_HOST || 'localhost'}:${process.env.CONSUL_PORT || 8500}`);
  console.log(`🔍 Consul service discovery: ${process.env.USE_CONSUL === 'true' ? 'ENABLED' : 'DISABLED'}`);
}

bootstrap();
