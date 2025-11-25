import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger as NestLogger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { ConsulService, setupMetricsEndpoint, initTracing } from '@cloudphone/shared';

async function bootstrap() {
  // ========== OpenTelemetry 追踪初始化 ==========
  initTracing({
    serviceName: 'app-service',
    serviceVersion: '1.0.0',
    jaegerEndpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:4318/v1/traces',
    enabled: process.env.OTEL_ENABLED !== 'false',
  });

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
    })
  );

  // ========== 日志配置 ==========

  // 使用 Pino 作为应用的 Logger
  app.useLogger(app.get(Logger));
  app.flushLogs();

  // ========== 验证和转换 ==========

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  // ========== CORS 配置 ==========

  app.enableCors({
    origin: configService.get('CORS_ORIGINS')?.split(',') || '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-ID', 'x-request-id'],
  });

  // ========== API 版本控制 ==========

  // 微服务不设置全局前缀，由 API Gateway 统一处理版本路由
  // app.setGlobalPrefix('api/v1', {
  //   exclude: ['health', 'metrics'],
  // });

  // ========== Swagger API 文档配置 ==========

  const config = new DocumentBuilder()
    .setTitle('App Service API')
    .setDescription('云手机平台 - 应用管理服务 API 文档')
    .setVersion('1.0.0')
    .addTag('apps', '应用管理')
    .addTag('installations', '应用安装管理')
    .addTag('marketplace', '应用市场')
    .addTag('reviews', '应用审核')
    .addServer('http://localhost:30003', '本地开发环境')
    .addServer('https://api.cloudphone.run', '生产环境')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  // ========== 优雅关闭配置 ==========

  app.enableShutdownHooks();

  const port = parseInt(configService.get('PORT') || '30003');
  // ========== Prometheus Metrics 端点 ==========
  setupMetricsEndpoint(app);

  await app.listen(port);

  // ========== 注册到 Consul ==========
  const logger = new NestLogger('Bootstrap');

  try {
    const consulService = app.get(ConsulService);
    await consulService.registerService('app-service', port, ['v1', 'apps']);
    logger.log(`✅ Service registered to Consul`);
  } catch (error) {
    logger.warn(`⚠️  Failed to register to Consul: ${error.message}`);
  }

  // ========== 服务启动日志 ==========

  logger.log(`🚀 App Service is running on: http://localhost:${port}`);
  logger.log(`📚 API Documentation: http://localhost:${port}/docs`);
  logger.log(`🔗 API Base URL: http://localhost:${port}`);
  logger.log(`🔗 RabbitMQ: ${configService.get('RABBITMQ_URL', 'amqp://localhost:5672')}`);
  logger.log(
    `🔗 Consul: http://${configService.get('CONSUL_HOST', 'localhost')}:${configService.get('CONSUL_PORT', 8500)}`
  );
  logger.log(`🔒 Helmet security: ENABLED`);
  logger.log(`🔄 Graceful shutdown: ENABLED`);
}

bootstrap();
