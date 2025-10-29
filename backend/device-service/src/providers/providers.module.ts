import { Module, OnModuleInit } from "@nestjs/common";
import { DeviceProviderFactory } from "./device-provider.factory";
import { RedroidModule } from "./redroid/redroid.module";
import { RedroidProvider } from "./redroid/redroid.provider";
import { PhysicalModule } from "./physical/physical.module";
import { PhysicalProvider } from "./physical/physical.provider";
import { HuaweiModule } from "./huawei/huawei.module";
import { HuaweiProvider } from "./huawei/huawei.provider";
import { AliyunModule } from "./aliyun/aliyun.module";
import { AliyunProvider } from "./aliyun/aliyun.provider";

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
 *
 * 导出：
 * - DeviceProviderFactory: Provider 工厂类
 */
@Module({
  imports: [
    RedroidModule, // ✅ Redroid Provider
    PhysicalModule, // ✅ Physical Provider (Phase 2A)
    HuaweiModule, // ✅ Huawei Provider (Phase 3)
    AliyunModule, // ✅ Aliyun Provider (Phase 4)
  ],
  providers: [DeviceProviderFactory],
  exports: [DeviceProviderFactory],
})
export class ProvidersModule implements OnModuleInit {
  constructor(
    private readonly providerFactory: DeviceProviderFactory,
    private readonly redroidProvider: RedroidProvider,
    private readonly physicalProvider: PhysicalProvider, // ✅ Phase 2A
    private readonly huaweiProvider: HuaweiProvider, // ✅ Phase 3
    private readonly aliyunProvider: AliyunProvider, // ✅ Phase 4
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

    console.log(
      `[ProvidersModule] Registered ${this.providerFactory.getProviderCount()} providers: ${this.providerFactory
        .getAvailableProviderTypes()
        .join(", ")}`,
    );
  }
}
