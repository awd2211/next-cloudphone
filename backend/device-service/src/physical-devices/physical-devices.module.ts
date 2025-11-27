import { Module } from '@nestjs/common';
import { PhysicalDevicesController } from './physical-devices.controller';
import { PhysicalModule } from '../providers/physical/physical.module';
import { AuthModule } from '../auth/auth.module';

/**
 * PhysicalDevicesModule
 *
 * 物理设备池管理模块
 *
 * 提供管理 API：
 * - 网络扫描发现设备（含 SSE 实时流 + Token 认证）
 * - 手动注册设备
 * - 查询设备列表
 * - 健康检查
 * - 设备状态管理
 */
@Module({
  imports: [
    PhysicalModule, // 提供 DevicePoolService 和 DeviceDiscoveryService
    AuthModule, // 提供 JwtService 用于 SSE 端点的 Token 验证
  ],
  controllers: [PhysicalDevicesController],
})
export class PhysicalDevicesModule {}
