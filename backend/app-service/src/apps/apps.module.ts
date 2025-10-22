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

@Module({
  imports: [
    TypeOrmModule.forFeature([Application, DeviceApplication]),
    MulterModule.register({
      dest: '/tmp/apk-uploads',
    }),
    HttpModule,
    MinioModule,
    ApkModule,
    // EventBusModule 是全局模块，已在 AppModule 中导入，无需重复导入
  ],
  controllers: [AppsController],
  providers: [AppsService, AppsConsumer],
  exports: [AppsService],
})
export class AppsModule {}
