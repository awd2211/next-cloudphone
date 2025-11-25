import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UnifiedCacheService } from '@cloudphone/shared';
import { AdbService } from '../../adb/adb.service';
import {
  PhysicalDeviceInfo,
  PooledDevice,
  DevicePoolStatus,
  DeviceAllocationRequest,
  HealthCheckResult,
} from './physical.types';
import {
  ShardConfig,
  ShardStats,
  GlobalPoolStats,
  ShardSelectionStrategy,
  ShardSelectionRequest,
  PoolOperationResult,
} from './sharded-pool.types';

/**
 * ShardedPoolService
 *
 * Phase 2B: 分片设备池服务（支持 1000+ 设备）
 *
 * 架构特性：
 * - 按设备分组（deviceGroup）分片
 * - 每个分片独立存储在 Redis
 * - 使用 Redis SCAN 替代维护索引
 * - 支持跨分片查询和负载均衡
 * - 区域亲和性分配
 *
 * 分片键格式：
 * - physical_shard:{shardId}:device:{deviceId}
 * - physical_shard:{shardId}:index (设备 ID 集合)
 * - physical_shard:config (分片配置)
 */
@Injectable()
export class ShardedPoolService {
  private readonly logger = new Logger(ShardedPoolService.name);

  /** Redis 键前缀 */
  private readonly SHARD_PREFIX = 'physical_shard';

  /** 分片配置缓存 */
  private shardConfigs: Map<string, ShardConfig> = new Map();

  /** 轮询计数器 */
  private roundRobinCounter = 0;

  constructor(
    private cacheService: UnifiedCacheService,
    private adbService: AdbService,
    private configService: ConfigService
  ) {
    this.initializeShards();
  }

  /**
   * 初始化分片配置
   */
  private async initializeShards() {
    // 从配置文件或数据库加载分片配置
    // 这里使用默认配置作为示例
    const defaultShards: ShardConfig[] = [
      {
        shardId: 'shard-01',
        shardName: 'Rack A',
        deviceGroups: ['rack-A'],
        capacity: 500,
        region: 'cn-north',
        weight: 1,
        enabled: true,
      },
      {
        shardId: 'shard-02',
        shardName: 'Rack B',
        deviceGroups: ['rack-B'],
        capacity: 500,
        region: 'cn-north',
        weight: 1,
        enabled: true,
      },
      {
        shardId: 'shard-03',
        shardName: 'Rack C',
        deviceGroups: ['rack-C'],
        capacity: 500,
        region: 'cn-south',
        weight: 1,
        enabled: true,
      },
    ];

    for (const shard of defaultShards) {
      this.shardConfigs.set(shard.shardId, shard);
    }

    this.logger.log(`Initialized ${this.shardConfigs.size} shards`);
  }

  /**
   * 添加设备到分片
   */
  async addDevice(deviceInfo: PhysicalDeviceInfo): Promise<PoolOperationResult<PooledDevice>> {
    const startTime = Date.now();

    try {
      // 确定分片
      const shardId = this.determineShardForDevice(deviceInfo);
      const shard = this.shardConfigs.get(shardId);

      if (!shard || !shard.enabled) {
        return {
          success: false,
          error: `Shard ${shardId} not found or disabled`,
        };
      }

      // 检查容量
      const stats = await this.getShardStats(shardId);
      if (stats.total >= shard.capacity) {
        return {
          success: false,
          error: `Shard ${shardId} is at capacity (${shard.capacity})`,
        };
      }

      // 创建池设备对象
      const pooledDevice: PooledDevice = {
        ...deviceInfo,
        poolStatus: DevicePoolStatus.AVAILABLE,
        healthScore: 100,
        lastActiveAt: new Date(),
      };

      // 保存到分片
      await this.saveDeviceToShard(shardId, pooledDevice);

      // 添加到分片索引
      await this.addToShardIndex(shardId, deviceInfo.id);

      this.logger.log(`Device ${deviceInfo.id} added to shard ${shardId}`);

      return {
        success: true,
        data: pooledDevice,
        shardId,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      this.logger.error(`Failed to add device: ${error.message}`);
      return {
        success: false,
        error: error.message,
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * 分配设备（智能分片选择）
   */
  async allocateDevice(
    request: DeviceAllocationRequest
  ): Promise<PoolOperationResult<PooledDevice>> {
    const startTime = Date.now();

    try {
      // 选择分片
      const shardSelectionRequest: ShardSelectionRequest = {
        strategy: ShardSelectionStrategy.LEAST_USED,
        deviceGroup: request.requirements?.deviceGroup,
        preferredRegion: request.preferredRegion,
        minHealthScore: request.requirements?.minHealthScore || 60,
      };

      const selectedShards = await this.selectShards(shardSelectionRequest);

      if (selectedShards.length === 0) {
        return {
          success: false,
          error: 'No suitable shards found',
        };
      }

      // 从选中的分片中查找可用设备
      for (const shardId of selectedShards) {
        const devices = await this.getAvailableDevicesFromShard(shardId);

        // 过滤符合要求的设备
        let candidates = this.filterDevicesByRequirements(devices, request.requirements);

        if (candidates.length === 0) {
          continue;
        }

        // 选择最佳设备
        const selectedDevice = this.selectBestDevice(candidates, request.preferredDeviceId);

        // 分配设备
        selectedDevice.poolStatus = DevicePoolStatus.ALLOCATED;
        selectedDevice.allocatedToUserId = request.userId;
        selectedDevice.allocatedAt = new Date();
        selectedDevice.lastActiveAt = new Date();

        await this.saveDeviceToShard(shardId, selectedDevice);

        this.logger.log(
          `Device ${selectedDevice.id} allocated from shard ${shardId} to user ${request.userId}`
        );

        return {
          success: true,
          data: selectedDevice,
          shardId,
          duration: Date.now() - startTime,
        };
      }

      return {
        success: false,
        error: 'No available devices found in any shard',
        duration: Date.now() - startTime,
      };
    } catch (error) {
      this.logger.error(`Failed to allocate device: ${error.message}`);
      return {
        success: false,
        error: error.message,
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * 释放设备
   */
  async releaseDevice(deviceId: string): Promise<PoolOperationResult<void>> {
    const startTime = Date.now();

    try {
      // 查找设备所在分片
      const shardId = await this.findDeviceShard(deviceId);
      if (!shardId) {
        return {
          success: false,
          error: `Device ${deviceId} not found in any shard`,
        };
      }

      const device = await this.getDeviceFromShard(shardId, deviceId);
      if (!device) {
        return {
          success: false,
          error: `Device ${deviceId} not found`,
        };
      }

      // 释放设备
      device.poolStatus = DevicePoolStatus.AVAILABLE;
      device.allocatedToUserId = undefined;
      device.allocatedAt = undefined;
      device.lastActiveAt = new Date();

      await this.saveDeviceToShard(shardId, device);

      this.logger.log(`Device ${deviceId} released in shard ${shardId}`);

      return {
        success: true,
        shardId,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      this.logger.error(`Failed to release device: ${error.message}`);
      return {
        success: false,
        error: error.message,
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * 获取全局设备池统计
   */
  async getGlobalStats(): Promise<GlobalPoolStats> {
    const shardStats: ShardStats[] = [];
    let totalDevices = 0;
    let totalHealthScore = 0;
    let totalAllocated = 0;

    const byRegion: Record<string, any> = {};
    const byStatus: Record<string, number> = {};

    // 收集各分片统计
    for (const [shardId, config] of this.shardConfigs.entries()) {
      if (!config.enabled) continue;

      const stats = await this.getShardStats(shardId);
      shardStats.push(stats);

      totalDevices += stats.total;
      totalHealthScore += stats.averageHealthScore * stats.total;
      totalAllocated += stats.allocated;

      // 按区域统计
      if (config.region) {
        if (!byRegion[config.region]) {
          byRegion[config.region] = {
            total: 0,
            available: 0,
            utilizationRate: 0,
          };
        }
        byRegion[config.region].total += stats.total;
        byRegion[config.region].available += stats.available;
      }
    }

    // 计算区域使用率
    for (const region in byRegion) {
      const allocated = byRegion[region].total - byRegion[region].available;
      byRegion[region].utilizationRate =
        byRegion[region].total > 0 ? (allocated / byRegion[region].total) * 100 : 0;
    }

    return {
      totalDevices,
      totalShards: this.shardConfigs.size,
      shards: shardStats,
      globalAverageHealthScore: totalDevices > 0 ? totalHealthScore / totalDevices : 0,
      globalUtilizationRate: totalDevices > 0 ? (totalAllocated / totalDevices) * 100 : 0,
      byRegion,
      byStatus,
    };
  }

  /**
   * 获取分片统计
   */
  private async getShardStats(shardId: string): Promise<ShardStats> {
    const devices = await this.getAllDevicesFromShard(shardId);

    let available = 0;
    let allocated = 0;
    let offline = 0;
    let totalHealthScore = 0;

    for (const device of devices) {
      totalHealthScore += device.healthScore;

      switch (device.poolStatus) {
        case DevicePoolStatus.AVAILABLE:
          available++;
          break;
        case DevicePoolStatus.ALLOCATED:
          allocated++;
          break;
        case DevicePoolStatus.OFFLINE:
          offline++;
          break;
      }
    }

    return {
      shardId,
      total: devices.length,
      available,
      allocated,
      offline,
      averageHealthScore: devices.length > 0 ? totalHealthScore / devices.length : 0,
      utilizationRate: devices.length > 0 ? (allocated / devices.length) * 100 : 0,
      updatedAt: new Date(),
    };
  }

  /**
   * 选择分片（根据策略）
   */
  private async selectShards(request: ShardSelectionRequest): Promise<string[]> {
    const strategy = request.strategy || ShardSelectionStrategy.LEAST_USED;
    const enabledShards = Array.from(this.shardConfigs.values()).filter((s) => s.enabled);

    // 按设备分组过滤
    let filteredShards = enabledShards;
    if (request.deviceGroup) {
      filteredShards = filteredShards.filter((s) => s.deviceGroups.includes(request.deviceGroup!));
    }

    // 按区域过滤
    if (request.preferredRegion) {
      const regionShards = filteredShards.filter((s) => s.region === request.preferredRegion);
      if (regionShards.length > 0) {
        filteredShards = regionShards;
      }
    }

    if (filteredShards.length === 0) {
      return [];
    }

    // 根据策略排序
    switch (strategy) {
      case ShardSelectionStrategy.LEAST_USED:
        // 获取各分片使用率并排序
        const shardsWithStats = await Promise.all(
          filteredShards.map(async (shard) => {
            const stats = await this.getShardStats(shard.shardId);
            return { shard, stats };
          })
        );
        shardsWithStats.sort((a, b) => a.stats.utilizationRate - b.stats.utilizationRate);
        return shardsWithStats.map((s) => s.shard.shardId);

      case ShardSelectionStrategy.ROUND_ROBIN:
        const index = this.roundRobinCounter % filteredShards.length;
        this.roundRobinCounter++;
        return [filteredShards[index].shardId];

      case ShardSelectionStrategy.RANDOM:
        const randomIndex = Math.floor(Math.random() * filteredShards.length);
        return [filteredShards[randomIndex].shardId];

      default:
        return filteredShards.map((s) => s.shardId);
    }
  }

  /**
   * 确定设备应该放入哪个分片
   */
  private determineShardForDevice(deviceInfo: PhysicalDeviceInfo): string {
    // 根据设备分组确定分片
    if (deviceInfo.deviceGroup) {
      for (const [shardId, config] of this.shardConfigs.entries()) {
        if (config.deviceGroups.includes(deviceInfo.deviceGroup)) {
          return shardId;
        }
      }
    }

    // 默认使用第一个分片
    return Array.from(this.shardConfigs.keys())[0];
  }

  /**
   * 保存设备到分片
   */
  private async saveDeviceToShard(shardId: string, device: PooledDevice): Promise<void> {
    const key = `${this.SHARD_PREFIX}:${shardId}:device:${device.id}`;
    await this.cacheService.set(key, device, 0); // 永久存储
  }

  /**
   * 从分片获取设备
   */
  private async getDeviceFromShard(
    shardId: string,
    deviceId: string
  ): Promise<PooledDevice | null> {
    const key = `${this.SHARD_PREFIX}:${shardId}:device:${deviceId}`;
    return await this.cacheService.get<PooledDevice>(key);
  }

  /**
   * 从分片获取所有设备（使用 SCAN）
   */
  private async getAllDevicesFromShard(shardId: string): Promise<PooledDevice[]> {
    // 使用 Redis SCAN 遍历所有设备键（替代 KEYS *）
    const pattern = `${this.SHARD_PREFIX}:${shardId}:device:*`;
    const deviceKeys = await this.cacheService.scan(pattern, 100);

    if (!deviceKeys || deviceKeys.length === 0) {
      this.logger.debug(`No devices found in shard ${shardId}`);
      return [];
    }

    // 批量获取所有设备数据
    const devices: PooledDevice[] = [];
    for (const key of deviceKeys) {
      const device = await this.cacheService.get<PooledDevice>(key);
      if (device) {
        devices.push(device);
      }
    }

    this.logger.debug(`Retrieved ${devices.length} devices from shard ${shardId} using SCAN`);
    return devices;
  }

  /**
   * 从分片获取可用设备
   */
  private async getAvailableDevicesFromShard(shardId: string): Promise<PooledDevice[]> {
    const allDevices = await this.getAllDevicesFromShard(shardId);
    return allDevices.filter((d) => d.poolStatus === DevicePoolStatus.AVAILABLE);
  }

  /**
   * 添加到分片索引
   */
  private async addToShardIndex(shardId: string, deviceId: string): Promise<void> {
    const indexKey = `${this.SHARD_PREFIX}:${shardId}:index`;
    const index = (await this.cacheService.get<string[]>(indexKey)) || [];
    if (!index.includes(deviceId)) {
      index.push(deviceId);
      await this.cacheService.set(indexKey, index, 0);
    }
  }

  /**
   * 查找设备所在分片
   */
  private async findDeviceShard(deviceId: string): Promise<string | null> {
    for (const shardId of this.shardConfigs.keys()) {
      const device = await this.getDeviceFromShard(shardId, deviceId);
      if (device) {
        return shardId;
      }
    }
    return null;
  }

  /**
   * 根据要求过滤设备
   */
  private filterDevicesByRequirements(
    devices: PooledDevice[],
    requirements?: DeviceAllocationRequest['requirements']
  ): PooledDevice[] {
    if (!requirements) return devices;

    return devices.filter((device) => {
      // 健康评分
      if (requirements.minHealthScore && device.healthScore < requirements.minHealthScore) {
        return false;
      }

      // 设备分组
      if (requirements.deviceGroup && device.deviceGroup !== requirements.deviceGroup) {
        return false;
      }

      // 设备标签
      if (requirements.tags && requirements.tags.length > 0) {
        const deviceTags = device.tags || [];
        const hasAllTags = requirements.tags.every((tag) => deviceTags.includes(tag));
        if (!hasAllTags) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * 选择最佳设备
   */
  private selectBestDevice(devices: PooledDevice[], preferredDeviceId?: string): PooledDevice {
    // 用户指定设备
    if (preferredDeviceId) {
      const preferred = devices.find((d) => d.id === preferredDeviceId);
      if (preferred) {
        return preferred;
      }
    }

    // 按健康评分排序
    devices.sort((a, b) => b.healthScore - a.healthScore);

    return devices[0];
  }
}
