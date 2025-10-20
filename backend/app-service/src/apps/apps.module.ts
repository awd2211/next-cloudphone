import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { HttpModule } from '@nestjs/axios';
import { AppsService } from './apps.service';
import { AppsController } from './apps.controller';
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
  ],
  controllers: [AppsController],
  providers: [AppsService],
  exports: [AppsService],
})
export class AppsModule {}
