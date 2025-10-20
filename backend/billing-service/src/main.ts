import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }));

  app.enableCors({
    origin: ['http://localhost:30001', 'http://localhost:30002'],
    credentials: true,
  });

  app.setGlobalPrefix('api');

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
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = process.env.PORT || 30005;
  await app.listen(port);

  console.log(`🚀 Billing Service is running on: http://localhost:${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
}

bootstrap();
