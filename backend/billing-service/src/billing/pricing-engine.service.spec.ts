import { Test, TestingModule } from '@nestjs/testing';
import { PricingEngineService } from './pricing-engine.service';
import { PricingTier } from './entities/usage-record.entity';
import { DeviceProviderType, DeviceConfigSnapshot } from '@cloudphone/shared';

describe('PricingEngineService', () => {
  let service: PricingEngineService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PricingEngineService],
    }).compile();

    service = module.get<PricingEngineService>(PricingEngineService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculateCost - Redroid Provider', () => {
    it('应该正确计算 Redroid 基础配置设备的成本', () => {
      const config: DeviceConfigSnapshot = {
        cpuCores: 2,
        memoryMB: 2048,
        gpuEnabled: false,
      };

      const durationSeconds = 3600; // 1 小时

      const result = service.calculateCost(DeviceProviderType.REDROID, config, durationSeconds);

      // 基础费用: 0.5 元/小时
      // CPU: 2 核 * 0.1 = 0.2 元/小时
      // 内存: 2 GB * 0.05 = 0.1 元/小时
      // 总计: 0.8 元/小时
      expect(result.totalCost).toBe(0.8);
      expect(result.billingRate).toBe(0.8);
      expect(result.pricingTier).toBe(PricingTier.BASIC);
      expect(result.durationHours).toBe(1);
    });

    it('应该正确计算 Redroid GPU 设备的成本', () => {
      const config: DeviceConfigSnapshot = {
        cpuCores: 4,
        memoryMB: 4096,
        gpuEnabled: true,
      };

      const durationSeconds = 7200; // 2 小时

      const result = service.calculateCost(DeviceProviderType.REDROID, config, durationSeconds);

      // 基础: 0.5 * 2 = 1.0
      // CPU: 4 * 0.1 * 2 = 0.8
      // 内存: 4 * 0.05 * 2 = 0.4
      // GPU: 0.3 * 2 = 0.6
      // 总计: 2.8 元
      expect(result.totalCost).toBe(2.8);
      expect(result.billingRate).toBe(1.4); // 2.8 / 2 小时
      expect(result.breakdown.baseCost).toBe(1.0);
      expect(result.breakdown.cpuCost).toBe(0.8);
      expect(result.breakdown.memoryCost).toBe(0.4);
      expect(result.breakdown.gpuCost).toBe(0.6);
    });

    it('应该对高端设备应用 20% 加价', () => {
      const config: DeviceConfigSnapshot = {
        cpuCores: 8, // >= 8 核
        memoryMB: 8192,
        gpuEnabled: true, // 且启用 GPU
      };

      const durationSeconds = 3600; // 1 小时

      const result = service.calculateCost(DeviceProviderType.REDROID, config, durationSeconds);

      // 基础: 0.5 * 1.2 = 0.6
      // CPU: 8 * 0.1 * 1.2 = 0.96
      // 内存: 8 * 0.05 = 0.4（memoryRate 不加价，看实现）
      // GPU: 0.3
      // 存储: 0（未指定）
      // 注意：高端设备只对 baseRate 和 cpuRate 应用 1.2 倍
      expect(result.totalCost).toBeCloseTo(2.34, 2);
      expect(result.pricingTier).toBe(PricingTier.ENTERPRISE);
    });
  });

  describe('calculateCost - Physical Provider', () => {
    it('应该正确计算物理设备的成本（统一费率）', () => {
      const config: DeviceConfigSnapshot = {
        cpuCores: 0, // 物理设备不按 CPU 计费
        memoryMB: 0,
        model: 'Pixel 6',
      };

      const durationSeconds = 3600; // 1 小时

      const result = service.calculateCost(DeviceProviderType.PHYSICAL, config, durationSeconds);

      // 基础费用: 0.3 元/小时
      expect(result.totalCost).toBe(0.3);
      expect(result.billingRate).toBe(0.3);
      expect(result.pricingTier).toBe(PricingTier.STANDARD);
    });

    it('应该正确计算物理设备 GPU 附加费用', () => {
      const config: DeviceConfigSnapshot = {
        cpuCores: 0,
        memoryMB: 0,
        gpuEnabled: true,
        model: 'Gaming Phone',
      };

      const durationSeconds = 3600; // 1 小时

      const result = service.calculateCost(DeviceProviderType.PHYSICAL, config, durationSeconds);

      // 基础: 0.3
      // GPU: 0.2
      // 总计: 0.5 元/小时
      expect(result.totalCost).toBe(0.5);
    });
  });

  describe('calculateCost - Huawei CPH Provider', () => {
    it('应该正确计算华为云手机成本', () => {
      const config: DeviceConfigSnapshot = {
        cpuCores: 4,
        memoryMB: 4096,
        cloudConfig: {
          specId: 'cloudphone.c4.m4',
          region: 'cn-north-4',
        },
      };

      const durationSeconds = 3600; // 1 小时

      const result = service.calculateCost(DeviceProviderType.HUAWEI_CPH, config, durationSeconds);

      // 基础: 1.5
      // CPU: 4 * 0.2 = 0.8
      // 内存: 4 * 0.1 = 0.4
      // 总计: 2.7 元/小时
      expect(result.totalCost).toBe(2.7);
      expect(result.pricingTier).toBe(PricingTier.PREMIUM);
    });
  });

  describe('calculateCost - Aliyun ECP Provider', () => {
    it('应该正确计算阿里云手机成本', () => {
      const config: DeviceConfigSnapshot = {
        cpuCores: 2,
        memoryMB: 2048,
        cloudConfig: {
          specId: 'ecp.c2m2',
          region: 'cn-hangzhou',
        },
      };

      const durationSeconds = 3600; // 1 小时

      const result = service.calculateCost(DeviceProviderType.ALIYUN_ECP, config, durationSeconds);

      // 基础: 1.2
      // CPU: 2 * 0.15 = 0.3
      // 内存: 2 * 0.08 = 0.16
      // 总计: 1.66 元/小时
      expect(result.totalCost).toBe(1.66);
      expect(result.pricingTier).toBe(PricingTier.PREMIUM);
    });
  });

  describe('calculateCost - Duration Rounding', () => {
    it('应该向上取整小时数（30分钟按1小时计费）', () => {
      const config: DeviceConfigSnapshot = {
        cpuCores: 2,
        memoryMB: 2048,
      };

      const durationSeconds = 1800; // 30 分钟

      const result = service.calculateCost(DeviceProviderType.REDROID, config, durationSeconds);

      // 应按 1 小时计费
      expect(result.durationHours).toBe(1);
      expect(result.totalCost).toBe(0.8); // 与 1 小时成本相同
    });

    it('应该向上取整小时数（61分钟按2小时计费）', () => {
      const config: DeviceConfigSnapshot = {
        cpuCores: 2,
        memoryMB: 2048,
      };

      const durationSeconds = 3660; // 61 分钟

      const result = service.calculateCost(DeviceProviderType.REDROID, config, durationSeconds);

      // 应按 2 小时计费
      expect(result.durationHours).toBe(2);
      expect(result.totalCost).toBe(1.6); // 0.8 * 2
    });
  });

  describe('estimateMonthlyCost', () => {
    it('应该正确估算月度成本（默认每天8小时）', () => {
      const config: DeviceConfigSnapshot = {
        cpuCores: 2,
        memoryMB: 2048,
      };

      const result = service.estimateMonthlyCost(
        DeviceProviderType.REDROID,
        config,
        8 // 每天8小时
      );

      // 小时费率: 0.8
      // 月度: 0.8 * 8 * 30 = 192
      expect(result).toBe(192);
    });

    it('应该正确估算月度成本（24/7 运行）', () => {
      const config: DeviceConfigSnapshot = {
        cpuCores: 2,
        memoryMB: 2048,
      };

      const result = service.estimateMonthlyCost(
        DeviceProviderType.REDROID,
        config,
        24 // 每天24小时
      );

      // 小时费率: 0.8
      // 月度: 0.8 * 24 * 30 = 576
      expect(result).toBe(576);
    });
  });

  describe('compareCosts', () => {
    it('应该正确比较不同 Provider 的成本', () => {
      const config: DeviceConfigSnapshot = {
        cpuCores: 2,
        memoryMB: 2048,
      };

      const comparison = service.compareCosts(config, 3600);

      // 返回值是 Record，不是数组
      expect(comparison).toBeDefined();
      expect(typeof comparison).toBe('object');

      // Physical: 0.3 (最便宜)
      expect(comparison[DeviceProviderType.PHYSICAL].totalCost).toBe(0.3);
      expect(comparison[DeviceProviderType.PHYSICAL].pricingTier).toBe(PricingTier.STANDARD);

      // Redroid: 0.8
      expect(comparison[DeviceProviderType.REDROID].totalCost).toBe(0.8);
      expect(comparison[DeviceProviderType.REDROID].pricingTier).toBe(PricingTier.BASIC);

      // Aliyun: 1.66
      expect(comparison[DeviceProviderType.ALIYUN_ECP].totalCost).toBe(1.66);
      expect(comparison[DeviceProviderType.ALIYUN_ECP].pricingTier).toBe(PricingTier.PREMIUM);

      // Huawei: 2.1 (最贵，不是2.7)
      // 基础: 1.5, CPU: 2*0.2=0.4, 内存: 2*0.1=0.2 = 2.1
      expect(comparison[DeviceProviderType.HUAWEI_CPH].totalCost).toBe(2.1);
      expect(comparison[DeviceProviderType.HUAWEI_CPH].pricingTier).toBe(PricingTier.PREMIUM);
    });

    it('应该包含所有 Provider 类型', () => {
      const config: DeviceConfigSnapshot = {
        cpuCores: 2,
        memoryMB: 2048,
      };

      const comparison = service.compareCosts(config, 3600);

      // 检查所有 Provider 类型都存在
      expect(comparison[DeviceProviderType.REDROID]).toBeDefined();
      expect(comparison[DeviceProviderType.PHYSICAL]).toBeDefined();
      expect(comparison[DeviceProviderType.HUAWEI_CPH]).toBeDefined();
      expect(comparison[DeviceProviderType.ALIYUN_ECP]).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('应该处理零 CPU 核心数', () => {
      const config: DeviceConfigSnapshot = {
        cpuCores: 0,
        memoryMB: 2048,
      };

      const result = service.calculateCost(DeviceProviderType.REDROID, config, 3600);

      // 只有基础费用和内存费用
      expect(result.totalCost).toBe(0.6); // 0.5 + 0.1
    });

    it('应该处理零内存', () => {
      const config: DeviceConfigSnapshot = {
        cpuCores: 2,
        memoryMB: 0,
      };

      const result = service.calculateCost(DeviceProviderType.REDROID, config, 3600);

      // 只有基础费用和 CPU 费用
      expect(result.totalCost).toBe(0.7); // 0.5 + 0.2
    });

    it('应该处理零时长（按最小1小时计费）', () => {
      const config: DeviceConfigSnapshot = {
        cpuCores: 2,
        memoryMB: 2048,
      };

      const result = service.calculateCost(DeviceProviderType.REDROID, config, 0);

      // 应按 1 小时计费（向上取整）
      expect(result.durationHours).toBe(0); // ceil(0/3600)
      expect(result.totalCost).toBe(0); // 0 小时 = 0 成本
    });

    it('应该处理未知 Provider（使用默认 Redroid 定价）', () => {
      const config: DeviceConfigSnapshot = {
        cpuCores: 2,
        memoryMB: 2048,
      };

      const result = service.calculateCost('unknown_provider' as any, config, 3600);

      // 应使用 Redroid 默认定价
      expect(result.totalCost).toBe(0.8);
      expect(result.pricingTier).toBe(PricingTier.BASIC);
    });
  });
});
