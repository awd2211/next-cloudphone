import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: true,
  });

  const configService = app.get(ConfigService);
  const port = parseInt(configService.get('PORT') || '30006');

  await app.listen(port);

  console.log(`🚀 Notification Service is running on: http://localhost:${port}`);
}

bootstrap();
