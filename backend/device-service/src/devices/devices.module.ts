import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { DevicesService } from './devices.service';
import { DevicesController } from './devices.controller';
import { DevicesConsumer } from './devices.consumer'; // ✅ V2: 启用消费者 (现在 @RabbitSubscribe 可以工作)
import { SmsEventsConsumer } from '../rabbitmq/consumers/sms-events.consumer'; // ✅ SMS 事件消费者
import { BatchOperationsService } from './batch-operations.service';
import { BatchOperationsController } from './batch-operations.controller';
import { CloudDeviceTokenService } from './cloud-device-token.service';
import { CloudDeviceSyncService } from './cloud-device-sync.service';
import { DeviceDeletionSaga } from './deletion.saga'; // ✅ 设备删除 Saga
import { Device } from '../entities/device.entity';
import { DockerModule } from '../docker/docker.module';
import { AdbModule } from '../adb/adb.module';
import { PortManagerModule } from '../port-manager/port-manager.module';
import { QuotaModule } from '../quota/quota.module';
import { ProvidersModule } from '../providers/providers.module';
import { PhysicalModule } from '../providers/physical/physical.module';
import { ScrcpyModule } from '../scrcpy/scrcpy.module';
import { AliyunModule } from '../providers/aliyun/aliyun.module';
import { HuaweiModule } from '../providers/huawei/huawei.module';
import { EventOutboxModule, SagaModule } from '@cloudphone/shared';

@Module({
  imports: [
    TypeOrmModule.forFeature([Device]),
    HttpModule, // ✅ For DeviceDeletionSaga HTTP calls
    ProvidersModule, // ✅ Provider 抽象层
    PhysicalModule, // ✅ 物理设备支持
    ScrcpyModule, // ✅ SCRCPY 投屏
    AliyunModule, // ✅ 阿里云 ECP（for CloudDeviceTokenService）
    HuaweiModule, // ✅ 华为云 CPH（for CloudDeviceTokenService）
    DockerModule,
    AdbModule,
    PortManagerModule,
    QuotaModule,
    EventOutboxModule, // ✅ Transactional Outbox Pattern
    SagaModule, // ✅ Saga Pattern for distributed transactions
    // EventBusModule 是全局模块，已在 AppModule 中导入，无需重复导入
  ],
  controllers: [DevicesController, BatchOperationsController],
  providers: [
    DevicesService,
    DevicesConsumer, // ✅ V2: 启用 RabbitMQ 消费者
    SmsEventsConsumer, // ✅ SMS 事件消费者
    BatchOperationsService,
    CloudDeviceTokenService, // ✅ 云设备 Token 自动刷新
    CloudDeviceSyncService, // ✅ 云设备状态同步
    DeviceDeletionSaga, // ✅ 设备删除 Saga
  ],
  exports: [
    DevicesService,
    BatchOperationsService,
    CloudDeviceTokenService,
    CloudDeviceSyncService,
  ],
})
export class DevicesModule {}
