import { Module, OnModuleInit, Logger, Inject, Optional } from '@nestjs/common';
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
import { AliyunProviderV2 } from './aliyun/aliyun-v2.provider';
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
 * - AliyunProviderV2 (Phase 4.1 - 2023-09-30 API) ✅
 * - ProvidersService (管理服务) ✅
 * - ProvidersController (REST API) ✅
 *
 * 环境变量:
 * - ALIYUN_SDK_VERSION=v2 启用新版阿里云SDK (推荐)
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
  private readonly logger = new Logger(ProvidersModule.name);

  constructor(
    private readonly providerFactory: DeviceProviderFactory,
    private readonly redroidProvider: RedroidProvider,
    private readonly physicalProvider: PhysicalProvider, // ✅ Phase 2A
    private readonly huaweiProvider: HuaweiProvider, // ✅ Phase 3
    private readonly aliyunProvider: AliyunProvider, // ✅ Phase 4
    private readonly aliyunProviderV2: AliyunProviderV2 // ✅ Phase 4.1 - 2023-09-30 API
  ) {}

  /**
   * 模块初始化时自动注册所有 Providers
   *
   * 阿里云 Provider 版本选择:
   * - ALIYUN_SDK_VERSION=v2 → AliyunProviderV2 (推荐，使用2023-09-30 API)
   * - 其他值或未设置 → AliyunProvider (旧版，使用2020-08-14 API)
   */
  onModuleInit() {
    // 注册 Redroid Provider
    this.providerFactory.registerProvider(this.redroidProvider);

    // ✅ Phase 2A: 注册 Physical Provider
    this.providerFactory.registerProvider(this.physicalProvider);

    // ✅ Phase 3: 注册 Huawei Provider
    this.providerFactory.registerProvider(this.huaweiProvider);

    // ✅ Phase 4/4.1: 根据环境变量选择阿里云 Provider 版本
    const aliyunSdkVersion = process.env.ALIYUN_SDK_VERSION;
    if (aliyunSdkVersion === 'v2') {
      this.providerFactory.registerProvider(this.aliyunProviderV2);
      this.logger.log('Using AliyunProviderV2 (2023-09-30 API) - Instance Group model');
    } else {
      this.providerFactory.registerProvider(this.aliyunProvider);
      this.logger.log('Using AliyunProvider (2020-08-14 API) - Legacy mode');
    }

    this.logger.log(
      `Registered ${this.providerFactory.getProviderCount()} providers: ${this.providerFactory
        .getAvailableProviderTypes()
        .join(', ')}`
    );
  }
}
