import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

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
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('proxy', '代理管理相关接口')
    .addTag('statistics', '统计分析相关接口')
    .addTag('admin', '管理员接口')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  // 优雅关闭
  app.enableShutdownHooks();

  // 启动服务
  const port = process.env.PORT || 30007;
  await app.listen(port, '0.0.0.0');

  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   🚀 Proxy Service is running!                              ║
║                                                              ║
║   📍 Server:    http://localhost:${port}                      ║
║   📚 API Docs:  http://localhost:${port}/api-docs            ║
║   🏥 Health:    http://localhost:${port}/health              ║
║                                                              ║
║   Environment: ${process.env.NODE_ENV || 'development'}                                ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
  `);
}

bootstrap();
