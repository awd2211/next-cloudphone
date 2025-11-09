import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { ConsulService, setupMetricsEndpoint, initTracing } from '@cloudphone/shared';

async function bootstrap() {
  // ========== OpenTelemetry 追踪初始化 ==========
  initTracing({
    serviceName: 'api-gateway',
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
          styleSrc: ["'self'", "'unsafe-inline'"], // Swagger需要
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Swagger需要
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
      crossOriginEmbedderPolicy: false, // Swagger需要
      crossOriginResourcePolicy: { policy: 'cross-origin' }, // API需要
    })
  );

  // ========== 日志配置 ==========

  // 使用 Pino 作为应用的 Logger
  app.useLogger(app.get(Logger));
  app.flushLogs();

  // ========== 验证和转换 ==========

  // 启用全局验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    })
  );

  // ========== CORS 配置 ==========

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void
    ) => {
      // 允许所有 localhost 和配置的域名
      const allowedOrigins = configService.get('CORS_ORIGINS')?.split(',') || [];

      // 开发环境：允许所有 localhost 端口
      if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1')) {
        callback(null, true);
      } else if (allowedOrigins.length > 0 && allowedOrigins.includes(origin)) {
        callback(null, true);
      } else if (process.env.NODE_ENV === 'development') {
        // 开发环境允许所有来源
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-Request-ID',
      'x-request-id',
      'Accept',
      'Origin',
    ],
    exposedHeaders: ['X-Request-ID', 'x-request-id'],
  });

  // ========== API 版本控制 ==========

  // API Gateway 不设置全局前缀，因为它是代理，路由直接映射到后端服务
  // 后端服务自己有 setGlobalPrefix('api/v1')
  // app.setGlobalPrefix("api/v1", {
  //   exclude: [
  //     'health',           // 健康检查不需要版本
  //     'health/detailed',
  //     'health/liveness',
  //     'health/readiness',
  //     'metrics',          // Prometheus metrics 不需要版本
  //   ],
  // });

  // ========== Swagger API 文档配置 ==========

  const config = new DocumentBuilder()
    .setTitle('API Gateway')
    .setDescription('云手机平台 - API 网关统一文档')
    .setVersion('1.0.0')
    .addTag('auth', '认证授权')
    .addTag('proxy', '服务代理')
    .addTag('health', '健康检查')
    .addTag('circuit-breaker', '熔断器')
    .addTag('rate-limiting', '限流')
    .addServer('http://localhost:30000', '本地开发环境')
    .addServer('https://api.cloudphone.com', '生产环境')
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

  const port = parseInt(configService.get('PORT') || '30000');
  // ========== Prometheus Metrics 端点 ==========
  setupMetricsEndpoint(app);

  await app.listen(port);

  // ========== 注册到 Consul ==========

  try {
    const consulService = app.get(ConsulService);
    await consulService.registerService('api-gateway', port, ['v1', 'gateway'], '/api/health');
    console.log(`✅ Service registered to Consul`);
  } catch (error) {
    console.warn(`⚠️  Failed to register to Consul: ${error.message}`);
  }

  // ========== 服务启动日志 ==========

  console.log(`🚀 API Gateway is running on: http://localhost:${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/docs`);
  console.log(`🔗 API Base URL: http://localhost:${port}`);
  console.log(`✅ Health check: http://localhost:${port}/health`);
  console.log(
    `🔗 Consul: http://${configService.get('CONSUL_HOST', 'localhost')}:${configService.get('CONSUL_PORT', 8500)}`
  );
  console.log(`🔒 Helmet security: ENABLED`);
  console.log(`🔄 Graceful shutdown: ENABLED`);
}

bootstrap();
