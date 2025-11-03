import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ConsulService } from '@cloudphone/shared';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

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
  await app.listen(port, '0.0.0.0');

  // 注册到 Consul（如果可用）
  const logger = new Logger('Bootstrap');
  try {
    const consulService = app.get(ConsulService);
    const serviceId = await consulService.registerService(
      'proxy-service',
      Number(port),
      ['proxy', 'management'],
      '/health'
    );

    if (serviceId) {
      logger.log(`✅ Service registered to Consul: ${serviceId}`);
    } else {
      logger.warn('⚠️  Consul registration failed (service will continue without service discovery)');
    }
  } catch (error) {
    logger.warn(`⚠️  Consul not available: ${error.message} (service will continue without service discovery)`);
  }

  console.log(`
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
