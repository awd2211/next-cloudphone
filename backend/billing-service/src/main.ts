import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ConsulService } from '@cloudphone/shared';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  // 使用 Pino 作为应用的 Logger
  app.useLogger(app.get(Logger));
  app.flushLogs();

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }));

  app.enableCors({
    origin: ['http://localhost:30001', 'http://localhost:30002'],
    credentials: true,
  });

  // Swagger API 文档配置
  const config = new DocumentBuilder()
    .setTitle('Billing Service API')
    .setDescription('云手机平台 - 计费服务 API 文档')
    .setVersion('1.0')
    .addTag('billing', '计费管理')
    .addTag('plans', '套餐管理')
    .addTag('orders', '订单管理')
    .addTag('usage', '使用记录')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = parseInt(process.env.PORT) || 30005;
  await app.listen(port);

  // 注册到 Consul
  try {
    const consulService = app.get(ConsulService);
    await consulService.registerService('billing-service', port, ['v1', 'billing']);
    console.log(`✅ Service registered to Consul`);
  } catch (error) {
    console.warn(`⚠️  Failed to register to Consul: ${error.message}`);
  }

  console.log(`🚀 Billing Service is running on: http://localhost:${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/docs`);
  console.log(`🔗 RabbitMQ: ${process.env.RABBITMQ_URL || 'amqp://localhost:5672'}`);
  console.log(`🔗 Consul: http://${process.env.CONSUL_HOST || 'localhost'}:${process.env.CONSUL_PORT || 8500}`);
}

bootstrap();
