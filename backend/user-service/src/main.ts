import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
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
          styleSrc: ["'self'", "'unsafe-inline'"],  // Swagger需要
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],  // Swagger需要
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
      crossOriginEmbedderPolicy: false,  // Swagger需要
      crossOriginResourcePolicy: { policy: 'cross-origin' },  // API需要
    }),
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
    }),
  );

  // ========== API 版本控制 ==========

  // 设置全局前缀和版本
  app.setGlobalPrefix('api/v1', {
    exclude: [
      'health',           // 健康检查不需要版本
      'health/detailed',
      'health/liveness',
      'health/readiness',
      'health/pool',
      'health/circuit-breakers',
      'metrics',          // Prometheus metrics 不需要版本
    ],
  });

  // ========== CORS 配置 ==========

  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
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
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['X-Total-Count'],  // 暴露分页总数头
  });

  // ========== Swagger API 文档配置 ==========

  const config = new DocumentBuilder()
    .setTitle('User Service API')
    .setDescription('云手机平台 - 用户管理服务 API 文档')
    .setVersion('1.0.0')
    .addTag('users', '用户管理')
    .addTag('roles', '角色管理')
    .addTag('permissions', '权限管理')
    .addTag('auth', '认证授权')
    .addTag('quotas', '配额管理')
    .addServer('http://localhost:30001', '本地开发环境')
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

  // 启用优雅关闭
  app.enableShutdownHooks();

  const port = parseInt(configService.get('PORT') || '30001');
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
  console.log(`📚 API Documentation: http://localhost:${port}/api/v1/docs`);
  console.log(`🔗 API Base URL: http://localhost:${port}/api/v1`);
  console.log(`🔗 Consul: http://${configService.get('CONSUL_HOST', 'localhost')}:${configService.get('CONSUL_PORT', 8500)}`);
  console.log(`🔒 Helmet security: ENABLED`);
  console.log(`🔄 Graceful shutdown: ENABLED`);
}

bootstrap();
