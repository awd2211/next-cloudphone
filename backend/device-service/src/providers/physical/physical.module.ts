import { Module } from "@nestjs/common";
import { PhysicalProvider } from "./physical.provider";
import { DevicePoolService } from "./device-pool.service";
import { DeviceDiscoveryService } from "./device-discovery.service";
import { AdbModule } from "../../adb/adb.module";
import { ScrcpyModule } from "../../scrcpy/scrcpy.module";

/**
 * PhysicalModule
 *
 * 物理设备 Provider 模块，管理通过网络连接的真实 Android 设备
 *
 * 功能：
 * - 设备池管理 (DevicePoolService)
 * - 设备发现 (DeviceDiscoveryService)
 * - 设备控制 (PhysicalProvider)
 * - 屏幕镜像 (ScrcpyService)
 *
 * Phase 2A: 支持 10-100 台物理设备
 */
@Module({
  imports: [
    AdbModule, // 提供 AdbService 用于设备控制
    ScrcpyModule, // ✅ 提供 ScrcpyService 用于屏幕镜像
  ],
  providers: [PhysicalProvider, DevicePoolService, DeviceDiscoveryService],
  exports: [
    PhysicalProvider,
    DevicePoolService, // 导出供管理接口使用
    DeviceDiscoveryService, // 导出供管理接口使用
  ],
})
export class PhysicalModule {}
