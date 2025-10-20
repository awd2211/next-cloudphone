import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { AppsService } from './apps.service';
import { AppsController } from './apps.controller';
import { Application } from '../entities/application.entity';
import { DeviceApplication } from '../entities/device-application.entity';
import { MinioModule } from '../minio/minio.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Application, DeviceApplication]),
    MulterModule.register({
      dest: '/tmp/apk-uploads',
    }),
    MinioModule,
  ],
  controllers: [AppsController],
  providers: [AppsService],
  exports: [AppsService],
})
export class AppsModule {}
