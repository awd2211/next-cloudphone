import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { ConsulService, setupMetricsEndpoint, initTracing } from '@cloudphone/shared';

async function bootstrap() {
  // ========== OpenTelemetry 追踪初始化 ==========
  initTracing({
    serviceName: 'user-service',
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

  // Cookie Parser
  app.use(cookieParser());

  // ========== 日志配置 ==========

  // 使用 Pino 作为应用的 Logger
  app.useLogger(app.get(Logger));
  app.flushLogs();

  // ========== 验证和转换 ==========

  // 全局验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  // ========== API 版本控制 ==========

  // 微服务不设置全局前缀，由 API Gateway 统一处理版本路由
  // app.setGlobalPrefix('api/v1', {
  //   exclude: ['health', 'metrics'],
  // });

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
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-request-id'],
    exposedHeaders: ['X-Total-Count'], // 暴露分页总数头
  });

  // ========== Swagger API 文档配置 ==========

  const config = new DocumentBuilder()
    .setTitle('User Service API')
    .setDescription('云手机平台 - 用户管理服务 API 文档\n\n包含用户管理、角色权限、认证授权、配额管理等核心功能')
    .setVersion('1.0.0')
    .addTag('users', '用户管理 - 用户CRUD、用户信息查询')
    .addTag('roles', '角色管理 - 角色创建、角色权限分配')
    .addTag('permissions', '权限管理 - 权限定义、权限查询')
    .addTag('数据范围管理', '数据范围权限 - 控制用户可访问的数据范围')
    .addTag('字段权限管理', '字段级权限 - 控制字段的可见性和可编辑性')
    .addTag('菜单权限管理', '菜单权限 - 控制菜单和功能的访问权限')
    .addTag('auth', '认证授权 - 登录、JWT、2FA')
    .addTag('quotas', '配额管理 - 用户资源配额控制')
    .addServer('http://localhost:30001', '本地开发环境')
    .addServer('https://api.cloudphone.com', '生产环境')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: '输入JWT Token（不需要Bearer前缀）',
        in: 'header',
      },
      'JWT-auth'
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  // ========== 优雅关闭配置 ==========

  // 启用优雅关闭
  app.enableShutdownHooks();

  const port = parseInt(configService.get('PORT') || '30001');
  // ========== Prometheus Metrics 端点 ==========
  setupMetricsEndpoint(app);

  await app.listen(port);

  // ========== 注册到 Consul ==========

  try {
    const consulService = app.get(ConsulService);
    await consulService.registerService('user-service', port, ['v1', 'users']);
    console.log(`✅ Service registered to Consul`);
  } catch (error) {
    console.warn(`⚠️  Failed to register to Consul: ${error.message}`);
  }

  // ========== 服务启动日志 ==========

  console.log(`🚀 User Service is running on: http://localhost:${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/docs`);
  console.log(`🔗 API Base URL: http://localhost:${port}`);
  console.log(
    `🔗 Consul: http://${configService.get('CONSUL_HOST', 'localhost')}:${configService.get('CONSUL_PORT', 8500)}`
  );
  console.log(`🔒 Helmet security: ENABLED`);
  console.log(`🔄 Graceful shutdown: ENABLED`);
}

bootstrap();
