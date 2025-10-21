import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { HttpModule } from '@nestjs/axios';
import { AppsService } from './apps.service';
import { AppsController } from './apps.controller';
import { AppsConsumer } from './apps.consumer';
import { Application } from '../entities/application.entity';
import { DeviceApplication } from '../entities/device-application.entity';
import { MinioModule } from '../minio/minio.module';
import { ApkModule } from '../apk/apk.module';
import { EventBusModule } from '@cloudphone/shared';

@Module({
  imports: [
    TypeOrmModule.forFeature([Application, DeviceApplication]),
    MulterModule.register({
      dest: '/tmp/apk-uploads',
    }),
    HttpModule,
    MinioModule,
    ApkModule,
    // EventBusModule,  // 暂时禁用，等RabbitMQ配置完成后再启用
  ],
  controllers: [AppsController],
  providers: [AppsService], // AppsConsumer 暂时禁用
  exports: [AppsService],
})
export class AppsModule {}
