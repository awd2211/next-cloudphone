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
    serviceName: 'notification-service',
    serviceVersion: '1.0.0',
    jaegerEndpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:4318/v1/traces',
    enabled: process.env.OTEL_ENABLED !== 'false',
  });

  const app = await NestFactory.create(AppModule, { 
    bufferLogs: true,
    cors: true, // 启用 CORS（WebSocket 需要）
  });

  const configService = app.get(ConfigService);

  // ========== 日志配置 ==========
  app.useLogger(app.get(Logger));
  app.flushLogs();

  // ========== 安全配置 ==========
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    })
  );

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
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void
    ) => {
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
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-ID', 'x-request-id'],
  });

  // ========== API 版本控制 ==========

  // 微服务不设置全局前缀，由 API Gateway 统一处理版本路由
  // app.setGlobalPrefix('api/v1', {
  //   exclude: ['health', 'metrics', 'socket.io', 'socket.io/(.*)'],
  // });

  // ========== Swagger API 文档 ==========
  const config = new DocumentBuilder()
    .setTitle('Notification Service API')
    .setDescription('云手机平台 - 通知服务 API')
    .setVersion('1.0.0')
    .addBearerAuth()
    .addTag('notifications', '通知管理')
    .addTag('templates', '模板管理')
    .addTag('websocket', 'WebSocket 实时通知')
    .addTag('email', '邮件通知')
    .addServer('http://localhost:30006', '本地开发环境')
    .addServer('https://api.cloudphone.run', '生产环境')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  // ========== Prometheus Metrics 端点 ==========
  setupMetricsEndpoint(app);

  const port = parseInt(configService.get('PORT') || '30006');
  await app.listen(port);

  // ========== 注册到 Consul ==========
  const bootstrapLogger = new NestLogger('Bootstrap');

  try {
    const consulService = app.get(ConsulService);
    await consulService.registerService('notification-service', port, ['v1', 'notifications']);
    bootstrapLogger.log(`✅ Service registered to Consul`);
  } catch (error) {
    bootstrapLogger.warn(`⚠️  Failed to register to Consul: ${error.message}`);
  }

  // ========== 服务启动日志 ==========

  const logger = app.get(Logger);
  logger.log(`🚀 Notification Service is running on: http://localhost:${port}`);
  logger.log(`📚 API Documentation: http://localhost:${port}/docs`);
  logger.log(`🔗 API Base URL: http://localhost:${port}`);
  logger.log(`🔗 RabbitMQ: ${configService.get('RABBITMQ_URL', 'amqp://localhost:5672')}`);
  logger.log(
    `🔗 Consul: http://${configService.get('CONSUL_HOST', 'localhost')}:${configService.get('CONSUL_PORT', 8500)}`
  );
}

bootstrap();

// Webpack HMR 支持
declare const module: any;
if (module.hot) {
  module.hot.accept();
  module.hot.dispose(() => {
    // 在热更新前执行清理
  });
}
