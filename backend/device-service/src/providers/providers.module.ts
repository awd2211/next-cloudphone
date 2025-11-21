import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeviceProviderFactory } from './device-provider.factory';
import { RedroidModule } from './redroid/redroid.module';
import { RedroidProvider } from './redroid/redroid.provider';
import { PhysicalModule } from './physical/physical.module';
import { PhysicalProvider } from './physical/physical.provider';
import { HuaweiModule } from './huawei/huawei.module';
import { HuaweiProvider } from './huawei/huawei.provider';
import { AliyunModule } from './aliyun/aliyun.module';
import { AliyunProvider } from './aliyun/aliyun.provider';
import { ProvidersService } from './providers.service';
import { ProvidersController } from './providers.controller';
import { ProviderConfig, CloudSyncRecord, CloudBillingReconciliation } from '../entities/provider-config.entity';
import { Device } from '../entities/device.entity';

/**
 * ProvidersModule
 *
 * 管理所有设备 Provider 的模块
 *
 * 已实现：
 * - RedroidProvider (Phase 1.3) ✅
 * - PhysicalProvider (Phase 2A) ✅
 * - HuaweiProvider (Phase 3) ✅
 * - AliyunProvider (Phase 4) ✅
 * - ProvidersService (管理服务) ✅
 * - ProvidersController (REST API) ✅
 *
 * 导出：
 * - DeviceProviderFactory: Provider 工厂类
 * - ProvidersService: 提供商管理服务
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([ProviderConfig, CloudSyncRecord, CloudBillingReconciliation, Device]),
    RedroidModule, // ✅ Redroid Provider
    PhysicalModule, // ✅ Physical Provider (Phase 2A)
    HuaweiModule, // ✅ Huawei Provider (Phase 3)
    AliyunModule, // ✅ Aliyun Provider (Phase 4)
  ],
  controllers: [ProvidersController],
  providers: [DeviceProviderFactory, ProvidersService],
  exports: [DeviceProviderFactory, ProvidersService],
})
export class ProvidersModule implements OnModuleInit {
  constructor(
    private readonly providerFactory: DeviceProviderFactory,
    private readonly redroidProvider: RedroidProvider,
    private readonly physicalProvider: PhysicalProvider, // ✅ Phase 2A
    private readonly huaweiProvider: HuaweiProvider, // ✅ Phase 3
    private readonly aliyunProvider: AliyunProvider // ✅ Phase 4
  ) {}

  /**
   * 模块初始化时自动注册所有 Providers
   */
  onModuleInit() {
    // 注册 Redroid Provider
    this.providerFactory.registerProvider(this.redroidProvider);

    // ✅ Phase 2A: 注册 Physical Provider
    this.providerFactory.registerProvider(this.physicalProvider);

    // ✅ Phase 3: 注册 Huawei Provider
    this.providerFactory.registerProvider(this.huaweiProvider);

    // ✅ Phase 4: 注册 Aliyun Provider
    this.providerFactory.registerProvider(this.aliyunProvider);

    Logger.log(
      `Registered ${this.providerFactory.getProviderCount()} providers: ${this.providerFactory
        .getAvailableProviderTypes()
        .join(', ')}`,
      'ProvidersModule'
    );
  }
}
