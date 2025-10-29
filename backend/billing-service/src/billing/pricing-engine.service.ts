import { Injectable, Logger } from '@nestjs/common';
import { DeviceProviderType, DeviceConfigSnapshot } from '@cloudphone/shared';
import { PricingTier } from './entities/usage-record.entity';

/**
 * 定价规则配置
 */
export interface PricingRule {
  /** 基础费率（元/小时） */
  baseRate: number;

  /** CPU 每核心费率（元/小时） */
  cpuRate?: number;

  /** 内存每 GB 费率（元/小时） */
  memoryRate?: number;

  /** GPU 附加费率（元/小时） */
  gpuRate?: number;

  /** 存储每 GB 费率（元/小时） */
  storageRate?: number;

  /** 定价层级 */
  tier: PricingTier;
}

/**
 * 计费计算结果
 */
export interface BillingCalculation {
  /** 总成本（元） */
  totalCost: number;

  /** 计费费率（元/小时） */
  billingRate: number;

  /** 定价层级 */
  pricingTier: PricingTier;

  /** 成本明细 */
  breakdown: {
    baseCost: number;
    cpuCost: number;
    memoryCost: number;
    gpuCost: number;
    storageCost: number;
  };

  /** 使用时长（小时） */
  durationHours: number;
}

/**
 * 计费引擎服务
 *
 * 负责根据设备提供商类型和配置计算使用成本
 * 支持差异化定价策略
 */
@Injectable()
export class PricingEngineService {
  private readonly logger = new Logger(PricingEngineService.name);

  /**
   * 定价矩阵
   *
   * 定义了不同设备提供商的计费规则
   */
  private readonly pricingMatrix: Record<DeviceProviderType, PricingRule> = {
    // Redroid 容器设备
    // 优势：成本最低，资源灵活
    // 定价策略：按资源计费（CPU + 内存 + GPU）
    [DeviceProviderType.REDROID]: {
      baseRate: 0.5, // 0.5 元/小时
      cpuRate: 0.1, // 每核 +0.1 元/小时
      memoryRate: 0.05, // 每 GB +0.05 元/小时
      gpuRate: 0.3, // GPU +0.3 元/小时
      storageRate: 0.01, // 每 GB +0.01 元/小时
      tier: PricingTier.BASIC,
    },

    // 物理设备
    // 优势：性能稳定，真实硬件
    // 定价策略：固定费率（设备成本已摊销）
    [DeviceProviderType.PHYSICAL]: {
      baseRate: 0.3, // 0.3 元/小时（成本低）
      cpuRate: 0, // 不按 CPU 计费
      memoryRate: 0, // 不按内存计费
      gpuRate: 0.2, // GPU 设备 +0.2 元/小时
      storageRate: 0,
      tier: PricingTier.STANDARD,
    },

    // 华为云手机
    // 优势：企业级可靠性
    // 定价策略：按云厂商规格定价
    [DeviceProviderType.HUAWEI_CPH]: {
      baseRate: 1.5, // 1.5 元/小时（云服务成本高）
      cpuRate: 0.2, // 每核 +0.2 元/小时
      memoryRate: 0.1, // 每 GB +0.1 元/小时
      gpuRate: 0, // 华为云手机暂不支持独立 GPU
      storageRate: 0.02, // 每 GB +0.02 元/小时
      tier: PricingTier.PREMIUM,
    },

    // 阿里云手机
    // 优势：WebRTC 低延迟
    // 定价策略：按云厂商规格定价
    [DeviceProviderType.ALIYUN_ECP]: {
      baseRate: 1.2, // 1.2 元/小时
      cpuRate: 0.15, // 每核 +0.15 元/小时
      memoryRate: 0.08, // 每 GB +0.08 元/小时
      gpuRate: 0, // 阿里云手机暂不支持独立 GPU
      storageRate: 0.015, // 每 GB +0.015 元/小时
      tier: PricingTier.PREMIUM,
    },
  };

  /**
   * 计算设备使用成本
   *
   * @param providerType 设备提供商类型
   * @param deviceConfig 设备配置快照
   * @param durationSeconds 使用时长（秒）
   * @returns 计费计算结果
   */
  calculateCost(
    providerType: DeviceProviderType,
    deviceConfig: DeviceConfigSnapshot,
    durationSeconds: number,
  ): BillingCalculation {
    // 获取定价规则
    const pricingRule = this.getPricingRule(providerType, deviceConfig);

    // 计算使用时长（小时，向上取整）
    const durationHours = Math.ceil(durationSeconds / 3600);

    // 计算各项成本
    const baseCost = pricingRule.baseRate * durationHours;

    const cpuCost =
      (pricingRule.cpuRate || 0) *
      (deviceConfig.cpuCores || 0) *
      durationHours;

    const memoryCost =
      (pricingRule.memoryRate || 0) *
      (deviceConfig.memoryMB || 0) / 1024 * // 转换为 GB
      durationHours;

    const gpuCost =
      (pricingRule.gpuRate || 0) *
      (deviceConfig.gpuEnabled ? 1 : 0) *
      durationHours;

    const storageCost =
      (pricingRule.storageRate || 0) *
      (deviceConfig.storageGB || 0) *
      durationHours;

    // 计算总成本
    const totalCost = baseCost + cpuCost + memoryCost + gpuCost + storageCost;

    // 计算每小时费率
    const billingRate = totalCost / (durationHours || 1);

    this.logger.debug(
      `Calculated cost for ${providerType}: ${totalCost.toFixed(4)} CNY (${durationHours}h @ ${billingRate.toFixed(4)} CNY/h)`,
    );

    return {
      totalCost: Math.round(totalCost * 100) / 100, // 四舍五入到分
      billingRate: Math.round(billingRate * 10000) / 10000, // 保留 4 位小数
      pricingTier: pricingRule.tier,
      breakdown: {
        baseCost: Math.round(baseCost * 100) / 100,
        cpuCost: Math.round(cpuCost * 100) / 100,
        memoryCost: Math.round(memoryCost * 100) / 100,
        gpuCost: Math.round(gpuCost * 100) / 100,
        storageCost: Math.round(storageCost * 100) / 100,
      },
      durationHours,
    };
  }

  /**
   * 获取定价规则
   *
   * 可以根据设备配置动态调整定价规则
   * 例如：高配设备使用更高的定价层级
   *
   * @param providerType 设备提供商类型
   * @param deviceConfig 设备配置快照
   * @returns 定价规则
   */
  getPricingRule(
    providerType: DeviceProviderType,
    deviceConfig: DeviceConfigSnapshot,
  ): PricingRule {
    let rule = this.pricingMatrix[providerType];

    if (!rule) {
      this.logger.warn(
        `Unknown provider type: ${providerType}, using default pricing`,
      );
      // 使用 Redroid 作为默认定价
      rule = this.pricingMatrix[DeviceProviderType.REDROID];
    }

    // 根据设备配置动态调整定价层级
    if (this.isHighEndDevice(deviceConfig)) {
      // 高端设备使用 ENTERPRISE 层级
      return {
        ...rule,
        tier: PricingTier.ENTERPRISE,
        // 高端设备费率提升 20%
        baseRate: rule.baseRate * 1.2,
        cpuRate: (rule.cpuRate || 0) * 1.2,
        memoryRate: (rule.memoryRate || 0) * 1.2,
      };
    }

    return rule;
  }

  /**
   * 判断是否为高端设备
   *
   * @param config 设备配置
   * @returns 是否为高端设备
   */
  private isHighEndDevice(config: DeviceConfigSnapshot): boolean {
    // 高端设备定义：
    // - CPU >= 8 核
    // - 内存 >= 16GB
    // - 启用 GPU
    const highCpu = (config.cpuCores || 0) >= 8;
    const highMemory = (config.memoryMB || 0) >= 16 * 1024;
    const hasGpu = config.gpuEnabled || false;

    return (highCpu && highMemory) || (highCpu && hasGpu);
  }

  /**
   * 获取所有定价规则（用于管理界面展示）
   *
   * @returns 定价矩阵
   */
  getAllPricingRules(): Record<DeviceProviderType, PricingRule> {
    return { ...this.pricingMatrix };
  }

  /**
   * 估算设备每月成本
   *
   * @param providerType 设备提供商类型
   * @param deviceConfig 设备配置
   * @param hoursPerDay 每天使用小时数
   * @returns 月成本估算
   */
  estimateMonthlyCost(
    providerType: DeviceProviderType,
    deviceConfig: DeviceConfigSnapshot,
    hoursPerDay: number = 8,
  ): number {
    const daysPerMonth = 30;
    const totalSeconds = hoursPerDay * daysPerMonth * 3600;

    const calculation = this.calculateCost(
      providerType,
      deviceConfig,
      totalSeconds,
    );

    return calculation.totalCost;
  }

  /**
   * 比较不同 Provider 的成本
   *
   * @param deviceConfig 设备配置
   * @param durationSeconds 使用时长
   * @returns 各 Provider 的成本对比
   */
  compareCosts(
    deviceConfig: DeviceConfigSnapshot,
    durationSeconds: number,
  ): Record<DeviceProviderType, BillingCalculation> {
    const comparison: Partial<Record<DeviceProviderType, BillingCalculation>> =
      {};

    for (const providerType of Object.values(DeviceProviderType)) {
      comparison[providerType] = this.calculateCost(
        providerType,
        deviceConfig,
        durationSeconds,
      );
    }

    return comparison as Record<DeviceProviderType, BillingCalculation>;
  }
}
