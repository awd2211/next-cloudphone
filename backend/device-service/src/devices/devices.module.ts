import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DevicesService } from "./devices.service";
import { DevicesController } from "./devices.controller";
// import { DevicesConsumer } from './devices.consumer';  // ✅ Consumer 已移至 DeviceRabbitMQModule
import { BatchOperationsService } from "./batch-operations.service";
import { BatchOperationsController } from "./batch-operations.controller";
import { CloudDeviceTokenService } from "./cloud-device-token.service";
import { CloudDeviceSyncService } from "./cloud-device-sync.service";
import { Device } from "../entities/device.entity";
import { DockerModule } from "../docker/docker.module";
import { AdbModule } from "../adb/adb.module";
import { PortManagerModule } from "../port-manager/port-manager.module";
import { QuotaModule } from "../quota/quota.module";
import { ProvidersModule } from "../providers/providers.module";
import { PhysicalModule } from "../providers/physical/physical.module";
import { ScrcpyModule } from "../scrcpy/scrcpy.module";
import { AliyunModule } from "../providers/aliyun/aliyun.module";
import { HuaweiModule } from "../providers/huawei/huawei.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Device]),
    ProvidersModule, // ✅ Provider 抽象层
    PhysicalModule, // ✅ 物理设备支持
    ScrcpyModule, // ✅ SCRCPY 投屏
    AliyunModule, // ✅ 阿里云 ECP（for CloudDeviceTokenService）
    HuaweiModule, // ✅ 华为云 CPH（for CloudDeviceTokenService）
    DockerModule,
    AdbModule,
    PortManagerModule,
    QuotaModule,
    // EventBusModule 是全局模块，已在 AppModule 中导入，无需重复导入
  ],
  controllers: [DevicesController, BatchOperationsController],
  providers: [
    DevicesService,
    BatchOperationsService,
    CloudDeviceTokenService, // ✅ 云设备 Token 自动刷新
    CloudDeviceSyncService, // ✅ 云设备状态同步
  ],
  exports: [DevicesService, BatchOperationsService, CloudDeviceTokenService, CloudDeviceSyncService],
})
export class DevicesModule {}
