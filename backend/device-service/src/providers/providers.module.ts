import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
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
import { AliyunEcpClient } from './aliyun/aliyun-ecp.client';
import { TencentModule } from './tencent/tencent.module';
import { TencentProvider } from './tencent/tencent.provider';
import { BaiduModule } from './baidu/baidu.module';
import { BaiduProvider } from './baidu/baidu.provider';
import { AwsModule } from './aws/aws.module';
import { AwsProvider } from './aws/aws.provider';
import { GenymotionModule } from './genymotion/genymotion.module';
import { GenymotionProvider } from './genymotion/genymotion.provider';
import { BrowserStackModule } from './browserstack/browserstack.module';
import { BrowserStackProvider } from './browserstack/browserstack.provider';
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
 * - AliyunProvider (Phase 4 - 使用 2023-09-30 API) ✅
 * - TencentProvider (云游戏 GS) ✅
 * - BaiduProvider (百度云手机 BAC) ✅
 * - AwsProvider (AWS Device Farm) ✅
 * - GenymotionProvider (Genymotion Cloud) ✅
 * - BrowserStackProvider (BrowserStack App Live) ✅
 * - ProvidersService (管理服务) ✅
 * - ProvidersController (REST API) ✅
 *
 * 导出：
 * - DeviceProviderFactory: Provider 工厂类
 * - ProvidersService: 提供商管理服务
 *
 * 架构说明：
 * - 使用 ModuleRef 延迟获取 providers，避免循环依赖
 * - HuaweiProvider 依赖 ProvidersService，使用 forwardRef 解决
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([ProviderConfig, CloudSyncRecord, CloudBillingReconciliation, Device]),
    RedroidModule, // ✅ Redroid Provider
    PhysicalModule, // ✅ Physical Provider (Phase 2A)
    HuaweiModule, // ✅ Huawei Provider (Phase 3)
    AliyunModule, // ✅ Aliyun Provider (Phase 4)
    TencentModule, // ✅ Tencent GS Provider (云游戏)
    BaiduModule, // ✅ Baidu BAC Provider (百度云手机)
    AwsModule, // ✅ AWS Device Farm Provider
    GenymotionModule, // ✅ Genymotion Cloud Provider
    BrowserStackModule, // ✅ BrowserStack App Live Provider
  ],
  controllers: [ProvidersController],
  providers: [DeviceProviderFactory, ProvidersService],
  exports: [DeviceProviderFactory, ProvidersService],
})
export class ProvidersModule implements OnModuleInit {
  private readonly logger = new Logger(ProvidersModule.name);

  constructor(
    private readonly moduleRef: ModuleRef,
    private readonly providerFactory: DeviceProviderFactory,
  ) {}

  /**
   * 模块初始化时自动注册所有 Providers
   *
   * 使用 ModuleRef.get() 延迟获取 providers，
   * 这样可以避免构造函数注入时的循环依赖问题
   */
  async onModuleInit() {
    // 延迟获取各个 provider，避免循环依赖
    const redroidProvider = this.moduleRef.get(RedroidProvider, { strict: false });
    const physicalProvider = this.moduleRef.get(PhysicalProvider, { strict: false });
    const huaweiProvider = this.moduleRef.get(HuaweiProvider, { strict: false });
    const aliyunProvider = this.moduleRef.get(AliyunProvider, { strict: false });
    const tencentProvider = this.moduleRef.get(TencentProvider, { strict: false });
    const baiduProvider = this.moduleRef.get(BaiduProvider, { strict: false });
    const awsProvider = this.moduleRef.get(AwsProvider, { strict: false });
    const genymotionProvider = this.moduleRef.get(GenymotionProvider, { strict: false });
    const browserstackProvider = this.moduleRef.get(BrowserStackProvider, { strict: false });

    // 注册 Redroid Provider
    this.providerFactory.registerProvider(redroidProvider);

    // ✅ Phase 2A: 注册 Physical Provider
    this.providerFactory.registerProvider(physicalProvider);

    // ✅ Phase 3: 注册 Huawei Provider
    this.providerFactory.registerProvider(huaweiProvider);

    // ✅ Phase 4: 注册 Aliyun Provider (2023-09-30 API - Instance Group model)
    this.providerFactory.registerProvider(aliyunProvider);
    this.logger.log('Registered AliyunProvider (2023-09-30 API) - Instance Group model');

    // ✅ Phase 5: 注册扩展云提供商
    this.providerFactory.registerProvider(tencentProvider);
    this.logger.log('Registered TencentProvider (云游戏 GS)');

    this.providerFactory.registerProvider(baiduProvider);
    this.logger.log('Registered BaiduProvider (百度云手机 BAC)');

    this.providerFactory.registerProvider(awsProvider);
    this.logger.log('Registered AwsProvider (AWS Device Farm)');

    this.providerFactory.registerProvider(genymotionProvider);
    this.logger.log('Registered GenymotionProvider (Genymotion Cloud)');

    this.providerFactory.registerProvider(browserstackProvider);
    this.logger.log('Registered BrowserStackProvider (BrowserStack App Live)');

    this.logger.log(
      `Registered ${this.providerFactory.getProviderCount()} providers: ${this.providerFactory
        .getAvailableProviderTypes()
        .join(', ')}`
    );
  }
}
