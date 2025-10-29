import { Module } from "@nestjs/common";
import { PhysicalDevicesController } from "./physical-devices.controller";
import { PhysicalModule } from "../providers/physical/physical.module";

/**
 * PhysicalDevicesModule
 *
 * 物理设备池管理模块
 *
 * 提供管理 API：
 * - 网络扫描发现设备
 * - 手动注册设备
 * - 查询设备列表
 * - 健康检查
 * - 设备状态管理
 */
@Module({
  imports: [
    PhysicalModule, // 提供 DevicePoolService 和 DeviceDiscoveryService
  ],
  controllers: [PhysicalDevicesController],
})
export class PhysicalDevicesModule {}
