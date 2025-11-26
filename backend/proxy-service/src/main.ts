import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger as NestLogger } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ConsulService, setupMetricsEndpoint, initTracing } from '@cloudphone/shared';

async function bootstrap() {
  // ========== OpenTelemetry 追踪初始化 ==========
  initTracing({
    serviceName: 'proxy-service',
    serviceVersion: '1.0.0',
    jaegerEndpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:4318/v1/traces',
    enabled: process.env.OTEL_ENABLED !== 'false',
  });

  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // ========== Pino Logger 初始化 ==========
  app.useLogger(app.get(Logger));

  // 全局验证管道
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

  // CORS配置
  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-ID', 'x-request-id'],
  });

  // Swagger API文档
  const config = new DocumentBuilder()
    .setTitle('Proxy Service API')
    .setDescription(
      'Enterprise-grade proxy management service for cloud phone platform',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .addTag('proxy', '代理管理相关接口')
    .addTag('statistics', '统计分析相关接口')
    .addTag('admin', '管理员接口')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  // 优雅关闭
  app.enableShutdownHooks();

  // 启动服务
  const port = process.env.PORT || 30007;
  // ========== Prometheus Metrics 端点 ==========
  setupMetricsEndpoint(app as any); // Type cast to fix workspace linking issue

  await app.listen(port, '0.0.0.0');

  // 注册到 Consul（如果可用）
  try {
    const consulService = app.get(ConsulService);
    const serviceId = await consulService.registerService(
      'proxy-service',
      Number(port),
      ['proxy', 'management'],
      '/health'
    );

    const logger = new NestLogger('Bootstrap');
    if (serviceId) {
      logger.log(`✅ Service registered to Consul: ${serviceId}`);
    } else {
      logger.warn('⚠️  Consul registration failed (service will continue without service discovery)');
    }
  } catch (error) {
    const logger = new NestLogger('Bootstrap');
    logger.warn(`⚠️  Consul not available: ${error.message} (service will continue without service discovery)`);
  }

  new NestLogger('Bootstrap').log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   🚀 Proxy Service is running!                              ║
║                                                              ║
║   📍 Server:    http://localhost:${port}                      ║
║   📚 API Docs:  http://localhost:${port}/docs                ║
║   🏥 Health:    http://localhost:${port}/health              ║
║   📊 Metrics:   http://localhost:${port}/metrics             ║
║                                                              ║
║   Environment: ${process.env.NODE_ENV || 'development'}                                ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
  `);
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
