import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { HttpModule } from '@nestjs/axios';
import { AppsService } from './apps.service';
import { AppsController } from './apps.controller';
import { AppInstallationSaga } from './installation.saga'; // ✅ 应用安装 Saga
// import { AppsConsumer } from './apps.consumer';  // ✅ Consumer 已移至 AppRabbitMQModule
import { Application } from '../entities/application.entity';
import { DeviceApplication } from '../entities/device-application.entity';
import { AppAuditRecord } from '../entities/app-audit-record.entity';
import { MinioModule } from '../minio/minio.module';
import { ApkModule } from '../apk/apk.module';
import { SagaModule } from '@cloudphone/shared';

@Module({
  imports: [
    TypeOrmModule.forFeature([Application, DeviceApplication, AppAuditRecord]),
    MulterModule.register({
      dest: '/tmp/apk-uploads',
    }),
    HttpModule,
    MinioModule,
    ApkModule,
    SagaModule, // ✅ AppsService 依赖 SagaOrchestratorService
    // EventBusModule 是全局模块，已在 AppModule 中导入，无需重复导入
  ],
  controllers: [AppsController],
  providers: [
    AppsService,
    AppInstallationSaga, // ✅ 注册应用安装 Saga
  ],
  exports: [AppsService],
})
export class AppsModule {}
