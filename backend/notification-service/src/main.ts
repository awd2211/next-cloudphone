import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: true, // 启用 CORS for WebSocket
    bufferLogs: true,
  });

  // 使用 Pino 作为应用的 Logger
  app.useLogger(app.get(Logger));
  app.flushLogs();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.enableCors({
    origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'],
    credentials: true,
  });

  // 移除 global prefix 以与其他微服务保持一致
  // app.setGlobalPrefix('api');

  // Swagger API 文档配置
  const config = new DocumentBuilder()
    .setTitle('Notification Service API')
    .setDescription('云手机平台 - 通知服务 API 文档')
    .setVersion('1.0')
    .addTag('notifications', '通知管理')
    .addTag('websocket', 'WebSocket 实时通知')
    .addTag('templates', '通知模板')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = process.env.PORT || 30006;
  await app.listen(port);

  console.log(`🚀 Notification Service is running on: http://localhost:${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
  console.log(`🔌 WebSocket Server: ws://localhost:${port}`);
}

bootstrap();
