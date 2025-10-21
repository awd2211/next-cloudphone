import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { WINSTON_MODULE_NEST_PROVIDER, WINSTON_MODULE_PROVIDER } from 'nest-winston';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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

  // ========== 日志和异常处理 ==========

  // 使用 Winston 作为应用的 Logger
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  // 全局异常过滤器
  app.useGlobalFilters(new AllExceptionsFilter(app.get(WINSTON_MODULE_PROVIDER)));

  // 全局日志拦截器
  app.useGlobalInterceptors(new LoggingInterceptor(app.get(WINSTON_MODULE_PROVIDER)));

  // ========== 验证和转换 ==========

  // 全局验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // ========== CORS 配置 ==========

  app.enableCors({
    origin: configService.get('CORS_ORIGINS')?.split(',') || '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['X-Total-Count'],  // 暴露分页总数头
  });

  // Swagger API 文档配置
  const config = new DocumentBuilder()
    .setTitle('User Service API')
    .setDescription('云手机平台 - 用户管理服务 API 文档')
    .setVersion('1.0')
    .addTag('users', '用户管理')
    .addTag('roles', '角色管理')
    .addTag('permissions', '权限管理')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  // ========== 优雅关闭配置 ==========

  // 启用优雅关闭
  app.enableShutdownHooks();

  const port = configService.get('PORT') || 30001;
  await app.listen(port);

  console.log(`🚀 User Service is running on: http://localhost:${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
  console.log(`✅ Graceful shutdown enabled`);
}

bootstrap();
