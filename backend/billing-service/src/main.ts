import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { ConsulService } from '@cloudphone/shared';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const configService = app.get(ConfigService);

  // ========== 安全配置 ==========

  // Helmet 安全头配置
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // ========== 日志配置 ==========

  // 使用 Pino 作为应用的 Logger
  app.useLogger(app.get(Logger));
  app.flushLogs();

  // ========== 验证和转换 ==========

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // ========== CORS 配置 ==========

  app.enableCors({
    origin: configService.get('CORS_ORIGINS')?.split(',') || '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // ========== API 版本控制 ==========

  // 设置全局前缀和版本
  app.setGlobalPrefix('api/v1', {
    exclude: [
      'health',           // 健康检查不需要版本
      'health/detailed',
      'health/liveness',
      'health/readiness',
      'metrics',          // Prometheus metrics 不需要版本
    ],
  });

  // ========== Swagger API 文档配置 ==========

  const config = new DocumentBuilder()
    .setTitle('Billing Service API')
    .setDescription('云手机平台 - 计费服务 API 文档')
    .setVersion('1.0.0')
    .addTag('billing', '计费管理')
    .addTag('plans', '套餐管理')
    .addTag('orders', '订单管理')
    .addTag('usage', '使用记录')
    .addTag('invoices', '发票管理')
    .addTag('payments', '支付管理')
    .addServer('http://localhost:30005', '本地开发环境')
    .addServer('https://api.cloudphone.com', '生产环境')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/v1/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  // ========== 优雅关闭配置 ==========

  app.enableShutdownHooks();

  const port = parseInt(configService.get('PORT') || '30005');
  await app.listen(port);

  // ========== 注册到 Consul ==========

  try {
    const consulService = app.get(ConsulService);
    await consulService.registerService('billing-service', port, ['v1', 'billing']);
    console.log(`✅ Service registered to Consul`);
  } catch (error) {
    console.warn(`⚠️  Failed to register to Consul: ${error.message}`);
  }

  // ========== 服务启动日志 ==========

  console.log(`🚀 Billing Service is running on: http://localhost:${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/api/v1/docs`);
  console.log(`🔗 API Base URL: http://localhost:${port}/api/v1`);
  console.log(`🔗 RabbitMQ: ${configService.get('RABBITMQ_URL', 'amqp://localhost:5672')}`);
  console.log(`🔗 Consul: http://${configService.get('CONSUL_HOST', 'localhost')}:${configService.get('CONSUL_PORT', 8500)}`);
  console.log(`🔒 Helmet security: ENABLED`);
  console.log(`🔄 Graceful shutdown: ENABLED`);
}

bootstrap();
