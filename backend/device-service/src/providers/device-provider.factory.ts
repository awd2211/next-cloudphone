import { Injectable, NotFoundException, Logger } from "@nestjs/common";
import {
  IDeviceProvider,
  IDeviceProviderFactory,
} from "./device-provider.interface";
import { DeviceProviderType } from "./provider.types";

/**
 * DeviceProviderFactory
 *
 * 设备提供商工厂类，负责管理和获取不同类型的设备 Provider
 *
 * 职责：
 * 1. 注册所有 Provider 实现（Redroid、Physical、Huawei、Aliyun）
 * 2. 根据 DeviceProviderType 返回对应的 Provider 实例
 * 3. 检查 Provider 可用性
 *
 * 使用方式：
 * ```typescript
 * const provider = this.providerFactory.getProvider(DeviceProviderType.REDROID);
 * const device = await provider.create(config);
 * ```
 */
@Injectable()
export class DeviceProviderFactory implements IDeviceProviderFactory {
  private readonly logger = new Logger(DeviceProviderFactory.name);
  private providers = new Map<DeviceProviderType, IDeviceProvider>();

  /**
   * 获取指定类型的 Provider
   *
   * @param type - Provider 类型
   * @returns Provider 实例
   * @throws NotFoundException - 如果 Provider 未注册
   */
  getProvider(type: DeviceProviderType): IDeviceProvider {
    const provider = this.providers.get(type);
    if (!provider) {
      throw new NotFoundException(
        `Device provider '${type}' not found. ` +
          `Available providers: ${Array.from(this.providers.keys()).join(", ")}`,
      );
    }
    return provider;
  }

  /**
   * 注册一个 Provider 实现
   *
   * @param provider - Provider 实例
   */
  registerProvider(provider: IDeviceProvider): void {
    const type = provider.providerType;

    if (this.providers.has(type)) {
      this.logger.warn(
        `Provider '${type}' is already registered, overwriting`,
      );
    }

    this.providers.set(type, provider);
    this.logger.log(`Registered provider: ${type}`);
  }

  /**
   * 获取所有已注册的 Provider
   *
   * @returns Provider 实例数组
   */
  getAllProviders(): IDeviceProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * 检查指定类型的 Provider 是否可用
   *
   * @param type - Provider 类型
   * @returns 是否可用
   */
  isProviderAvailable(type: DeviceProviderType): boolean {
    return this.providers.has(type);
  }

  /**
   * 获取所有可用的 Provider 类型列表
   *
   * @returns Provider 类型数组
   */
  getAvailableProviderTypes(): DeviceProviderType[] {
    return Array.from(this.providers.keys());
  }

  /**
   * 移除一个 Provider（用于测试或动态卸载）
   *
   * @param type - Provider 类型
   * @returns 是否成功移除
   */
  unregisterProvider(type: DeviceProviderType): boolean {
    const existed = this.providers.has(type);
    if (existed) {
      this.providers.delete(type);
      this.logger.log(`Unregistered provider: ${type}`);
    }
    return existed;
  }

  /**
   * 获取 Provider 数量
   *
   * @returns 已注册的 Provider 数量
   */
  getProviderCount(): number {
    return this.providers.size;
  }
}
