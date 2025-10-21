import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ConsulService } from '@cloudphone/shared';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  // 使用 Pino 作为应用的 Logger
  app.useLogger(app.get(Logger));
  app.flushLogs();

  const configService = app.get(ConfigService);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: configService.get('CORS_ORIGINS')?.split(',') || '*',
    credentials: true,
  });

  // Swagger API 文档配置
  const config = new DocumentBuilder()
    .setTitle('Device Service API')
    .setDescription('云手机平台 - 设备管理服务 API 文档')
    .setVersion('1.0')
    .addTag('devices', '设备管理')
    .addTag('docker', 'Docker 容器管理')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = configService.get('PORT') || 30002;
  await app.listen(port);

  // 注册到 Consul
  try {
    const consulService = app.get(ConsulService);
    await consulService.registerService('device-service', port, ['v1', 'devices']);
    console.log(`✅ Service registered to Consul`);
  } catch (error) {
    console.warn(`⚠️  Failed to register to Consul: ${error.message}`);
  }

  console.log(`🚀 Device Service is running on: http://localhost:${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
  console.log(`🔗 RabbitMQ: ${configService.get('RABBITMQ_URL', 'amqp://localhost:5672')}`);
  console.log(`🔗 Consul: http://${configService.get('CONSUL_HOST', 'localhost')}:${configService.get('CONSUL_PORT', 8500)}`);
}

bootstrap();
