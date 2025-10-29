import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { CacheService } from "../../cache/cache.service";
import {
  PhysicalDeviceInfo,
  PooledDevice,
  DevicePoolStatus,
  DeviceAllocationRequest,
  HealthCheckResult,
} from "./physical.types";
import { AdbService } from "../../adb/adb.service";

/**
 * 物理设备池管理服务
 *
 * 职责：
 * 1. 设备池管理（注册、注销、查询）
 * 2. 设备分配和释放
 * 3. 设备健康检查
 * 4. 设备状态维护
 *
 * 存储：使用 Redis 存储设备池状态
 */
@Injectable()
export class DevicePoolService {
  private readonly logger = new Logger(DevicePoolService.name);

  // Redis 键前缀
  private readonly POOL_KEY_PREFIX = "physical_device_pool";
  private readonly DEVICE_KEY_PREFIX = "physical_device";

  constructor(
    private cacheService: CacheService,
    private adbService: AdbService,
  ) {}

  /**
   * 添加设备到池
   *
   * @param deviceInfo 设备信息
   * @returns 池设备对象
   */
  async addDevice(deviceInfo: PhysicalDeviceInfo): Promise<PooledDevice> {
    this.logger.log(`Adding device to pool: ${deviceInfo.id}`);

    // 检查设备是否已存在
    const existing = await this.getDevice(deviceInfo.id);
    if (existing) {
      throw new BadRequestException(
        `Device ${deviceInfo.id} already exists in pool`,
      );
    }

    // 创建池设备对象
    const pooledDevice: PooledDevice = {
      ...deviceInfo,
      poolStatus: DevicePoolStatus.AVAILABLE,
      healthScore: 100, // 初始满分
      lastActiveAt: new Date(),
    };

    // 保存到 Redis
    await this.saveDevice(pooledDevice);

    // 更新设备 ID 索引
    await this.addToIndex(deviceInfo.id);

    this.logger.log(`Device added to pool: ${deviceInfo.id}`);
    return pooledDevice;
  }

  /**
   * 从池中移除设备
   *
   * @param deviceId 设备 ID
   */
  async removeDevice(deviceId: string): Promise<void> {
    this.logger.log(`Removing device from pool: ${deviceId}`);

    const device = await this.getDevice(deviceId);
    if (!device) {
      throw new NotFoundException(`Device ${deviceId} not found in pool`);
    }

    if (device.poolStatus === DevicePoolStatus.ALLOCATED) {
      throw new BadRequestException(
        `Device ${deviceId} is currently allocated, cannot remove`,
      );
    }

    // 从 Redis 删除
    await this.cacheService.del(this.getDeviceKey(deviceId));

    // 从索引中移除
    await this.removeFromIndex(deviceId);

    this.logger.log(`Device removed from pool: ${deviceId}`);
  }

  /**
   * 分配设备给用户
   *
   * @param request 分配请求
   * @returns 分配的设备
   */
  async allocateDevice(
    request: DeviceAllocationRequest,
  ): Promise<PooledDevice> {
    this.logger.log(`Allocating device for user: ${request.userId}`);

    // 获取所有可用设备
    const availableDevices = await this.getAvailableDevices();

    if (availableDevices.length === 0) {
      throw new NotFoundException("No available devices in pool");
    }

    // 过滤符合要求的设备
    let candidates = availableDevices;

    if (request.requirements) {
      candidates = this.filterDevicesByRequirements(
        candidates,
        request.requirements,
      );

      if (candidates.length === 0) {
        throw new NotFoundException("No devices match the requirements");
      }
    }

    // 选择最佳设备
    const selectedDevice = this.selectBestDevice(
      candidates,
      request.preferredDeviceId,
    );

    // 标记为已分配
    selectedDevice.poolStatus = DevicePoolStatus.ALLOCATED;
    selectedDevice.allocatedToUserId = request.userId;
    selectedDevice.allocatedAt = new Date();
    selectedDevice.lastActiveAt = new Date();

    await this.saveDevice(selectedDevice);

    this.logger.log(
      `Device allocated: ${selectedDevice.id} → user ${request.userId}`,
    );

    return selectedDevice;
  }

  /**
   * 释放设备
   *
   * @param deviceId 设备 ID
   */
  async releaseDevice(deviceId: string): Promise<void> {
    this.logger.log(`Releasing device: ${deviceId}`);

    const device = await this.getDevice(deviceId);
    if (!device) {
      throw new NotFoundException(`Device ${deviceId} not found in pool`);
    }

    if (device.poolStatus !== DevicePoolStatus.ALLOCATED) {
      this.logger.warn(
        `Device ${deviceId} is not allocated, status: ${device.poolStatus}`,
      );
      return;
    }

    // 标记为可用
    device.poolStatus = DevicePoolStatus.AVAILABLE;
    device.allocatedToUserId = undefined;
    device.allocatedAt = undefined;
    device.lastActiveAt = new Date();

    await this.saveDevice(device);

    this.logger.log(`Device released: ${deviceId}`);
  }

  /**
   * 获取设备
   *
   * @param deviceId 设备 ID
   * @returns 设备对象
   */
  async getDevice(deviceId: string): Promise<PooledDevice | null> {
    const key = this.getDeviceKey(deviceId);
    const device = await this.cacheService.get<PooledDevice>(key);
    return device;
  }

  /**
   * 获取所有可用设备
   *
   * @returns 可用设备列表
   */
  async getAvailableDevices(): Promise<PooledDevice[]> {
    const allDevices = await this.getAllDevices();
    return allDevices.filter(
      (d) => d.poolStatus === DevicePoolStatus.AVAILABLE,
    );
  }

  /**
   * 获取所有设备
   *
   * @returns 所有设备列表
   *
   * 注意：由于 CacheService 不支持 keys() 方法，这里使用维护设备 ID 列表的方式
   * 在 Phase 2B 大规模部署时，会优化为使用 Redis SCAN 命令
   */
  async getAllDevices(): Promise<PooledDevice[]> {
    // 从设备 ID 列表获取所有设备
    const deviceIds =
      (await this.cacheService.get<string[]>("physical_device:index")) || [];

    const devices: PooledDevice[] = [];

    for (const deviceId of deviceIds) {
      const device = await this.getDevice(deviceId);
      if (device) {
        devices.push(device);
      }
    }

    return devices;
  }

  /**
   * 检查设备健康
   *
   * @param deviceId 设备 ID
   * @returns 健康检查结果
   */
  async checkDeviceHealth(deviceId: string): Promise<HealthCheckResult> {
    const device = await this.getDevice(deviceId);
    if (!device) {
      throw new NotFoundException(`Device ${deviceId} not found in pool`);
    }

    const serial = `${device.ipAddress}:${device.adbPort}`;
    const result: HealthCheckResult = {
      deviceId,
      healthy: true,
      healthScore: 100,
      checks: {
        adbConnected: false,
        androidBooted: false,
        storageAvailable: false,
      },
      checkedAt: new Date(),
    };

    try {
      // 1. 检查 ADB 连接和 Android 启动状态
      // 通过尝试执行 shell 命令来检查连接性
      let bootOutput: string;
      try {
        bootOutput = await this.adbService.executeShellCommand(
          deviceId,
          "getprop sys.boot_completed",
          3000,
        );
        result.checks.adbConnected = true;
        result.checks.androidBooted = bootOutput.trim() === "1";
      } catch (error) {
        // ADB 命令失败，说明未连接
        result.checks.adbConnected = false;
        result.checks.androidBooted = false;
        result.healthy = false;
        result.healthScore -= 50;
        result.errorMessage = "ADB not connected";
        return result;
      }

      if (!result.checks.androidBooted) {
        result.healthy = false;
        result.healthScore -= 30;
        result.errorMessage = "Android not booted";
        return result;
      }

      // 3. 检查存储空间
      const dfOutput = await this.adbService.executeShellCommand(
        deviceId,
        "df /data",
        3000,
      );
      const storageMatch = dfOutput.match(/(\d+)%/);
      if (storageMatch) {
        const usagePercent = parseInt(storageMatch[1], 10);
        result.checks.storageAvailable = usagePercent < 90;

        if (usagePercent > 90) {
          result.healthScore -= 10;
        }
      }

      // 4. 检查电池（可选）
      try {
        const batteryOutput = await this.adbService.executeShellCommand(
          deviceId,
          "dumpsys battery | grep level",
          3000,
        );
        const batteryMatch = batteryOutput.match(/level: (\d+)/);
        if (batteryMatch) {
          result.checks.batteryLevel = parseInt(batteryMatch[1], 10);

          if (result.checks.batteryLevel < 20) {
            result.healthScore -= 10;
          }
        }
      } catch (error) {
        // 电池检查失败不影响整体健康
      }

      // 5. 检查温度（可选）
      try {
        const tempOutput = await this.adbService.executeShellCommand(
          deviceId,
          "dumpsys battery | grep temperature",
          3000,
        );
        const tempMatch = tempOutput.match(/temperature: (\d+)/);
        if (tempMatch) {
          result.checks.temperature = parseInt(tempMatch[1], 10) / 10; // 转为摄氏度

          if (result.checks.temperature > 45) {
            result.healthScore -= 15;
            result.errorMessage = "High temperature";
          }
        }
      } catch (error) {
        // 温度检查失败不影响整体健康
      }

      // 更新设备健康评分
      device.healthScore = result.healthScore;
      device.lastHeartbeatAt = new Date();

      if (result.healthScore < 30) {
        device.poolStatus = DevicePoolStatus.ERROR;
        device.errorMessage = result.errorMessage || "Low health score";
      }

      await this.saveDevice(device);
    } catch (error) {
      result.healthy = false;
      result.healthScore = 0;
      result.errorMessage = error.message;

      // 标记设备为离线
      device.poolStatus = DevicePoolStatus.OFFLINE;
      device.errorMessage = error.message;
      await this.saveDevice(device);
    }

    return result;
  }

  /**
   * 更新设备状态
   *
   * @param deviceId 设备 ID
   * @param status 新状态
   */
  async updateDeviceStatus(
    deviceId: string,
    status: DevicePoolStatus,
  ): Promise<void> {
    const device = await this.getDevice(deviceId);
    if (!device) {
      throw new NotFoundException(`Device ${deviceId} not found in pool`);
    }

    device.poolStatus = status;
    device.lastActiveAt = new Date();

    await this.saveDevice(device);

    this.logger.log(`Device status updated: ${deviceId} → ${status}`);
  }

  /**
   * 保存设备到 Redis
   */
  private async saveDevice(device: PooledDevice): Promise<void> {
    const key = this.getDeviceKey(device.id);
    await this.cacheService.set(key, device, 0); // 永久存储，TTL=0 表示不过期
  }

  /**
   * 获取设备的 Redis 键
   */
  private getDeviceKey(deviceId: string): string {
    return `${this.DEVICE_KEY_PREFIX}:${deviceId}`;
  }

  /**
   * 根据要求过滤设备
   */
  private filterDevicesByRequirements(
    devices: PooledDevice[],
    requirements: DeviceAllocationRequest["requirements"],
  ): PooledDevice[] {
    return devices.filter((device) => {
      // 健康评分
      if (
        requirements.minHealthScore &&
        device.healthScore < requirements.minHealthScore
      ) {
        return false;
      }

      // 设备分组
      if (
        requirements.deviceGroup &&
        device.deviceGroup !== requirements.deviceGroup
      ) {
        return false;
      }

      // 设备标签
      if (requirements.tags && requirements.tags.length > 0) {
        const deviceTags = device.tags || [];
        const hasAllTags = requirements.tags.every((tag) =>
          deviceTags.includes(tag),
        );
        if (!hasAllTags) {
          return false;
        }
      }

      // Android 版本
      if (
        requirements.androidVersion &&
        device.properties?.androidVersion !== requirements.androidVersion
      ) {
        return false;
      }

      return true;
    });
  }

  /**
   * 选择最佳设备
   *
   * 策略：
   * 1. 优先选择用户指定的设备（亲和性）
   * 2. 选择健康评分最高的设备
   */
  private selectBestDevice(
    devices: PooledDevice[],
    preferredDeviceId?: string,
  ): PooledDevice {
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

  /**
   * 添加设备 ID 到索引
   */
  private async addToIndex(deviceId: string): Promise<void> {
    const index =
      (await this.cacheService.get<string[]>("physical_device:index")) || [];
    if (!index.includes(deviceId)) {
      index.push(deviceId);
      await this.cacheService.set("physical_device:index", index, 0); // 永久存储
    }
  }

  /**
   * 从索引中移除设备 ID
   */
  private async removeFromIndex(deviceId: string): Promise<void> {
    const index =
      (await this.cacheService.get<string[]>("physical_device:index")) || [];
    const newIndex = index.filter((id) => id !== deviceId);
    await this.cacheService.set("physical_device:index", newIndex, 0);
  }
}
