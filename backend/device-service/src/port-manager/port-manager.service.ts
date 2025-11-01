import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Device, DeviceStatus } from '../entities/device.entity';
import Redis from 'ioredis';

export interface PortAllocation {
  adbPort: number;
  webrtcPort: number;
  scrcpyPort?: number;
}

/**
 * 端口管理服务（支持集群模式）
 *
 * 优化说明：
 * - 使用 Redis 作为分布式锁和端口分配存储
 * - 支持 PM2 集群模式下的多实例并发安全
 * - 内存缓存 fallback（Redis 不可用时降级）
 */
@Injectable()
export class PortManagerService {
  private readonly logger = new Logger(PortManagerService.name);

  // 端口范围配置
  private readonly ADB_PORT_START = 5555;
  private readonly ADB_PORT_END = 6554;
  private readonly WEBRTC_PORT_START = 8080;
  private readonly WEBRTC_PORT_END = 9079;
  private readonly SCRCPY_PORT_START = 27183;
  private readonly SCRCPY_PORT_END = 28182;

  // Redis 键前缀
  private readonly REDIS_PORT_KEY_PREFIX = 'port:allocated:';
  private readonly REDIS_LOCK_KEY_PREFIX = 'port:lock:';

  // 内存缓存（Fallback，Redis 不可用时使用）
  private usedAdbPorts: Set<number> = new Set();
  private usedWebrtcPorts: Set<number> = new Set();
  private usedScrcpyPorts: Set<number> = new Set();

  // Redis 客户端（可选）
  private redis: Redis | null = null;

  constructor(
    @InjectRepository(Device)
    private devicesRepository: Repository<Device>,
    @Optional() @Inject('REDIS_CLIENT') redisClient?: Redis
  ) {
    this.redis = redisClient || null;

    if (!this.redis) {
      this.logger.warn(
        '⚠️  Redis client not available - Port allocation will use in-memory cache (not cluster-safe)'
      );
    } else {
      this.logger.log('✅ Redis-based port allocation enabled (cluster-safe)');
    }

    this.initializePortCache();
  }

  /**
   * 初始化端口缓存 - 从数据库加载已使用的端口
   */
  private async initializePortCache() {
    try {
      const devices = await this.devicesRepository.find({
        where: [
          { status: DeviceStatus.RUNNING },
          { status: DeviceStatus.STOPPED },
          { status: DeviceStatus.PAUSED },
        ],
      });

      devices.forEach((device) => {
        if (device.adbPort) {
          this.usedAdbPorts.add(device.adbPort);
        }
        // 如果设备有 WebRTC 端口（未来扩展）
        if (device.metadata?.webrtcPort) {
          this.usedWebrtcPorts.add(device.metadata.webrtcPort);
        }
        if (device.metadata?.scrcpyPort) {
          this.usedScrcpyPorts.add(device.metadata.scrcpyPort);
        }
      });

      this.logger.log(
        `Port cache initialized: ${this.usedAdbPorts.size} ADB ports, ${this.usedWebrtcPorts.size} WebRTC ports`
      );
    } catch (error) {
      this.logger.error('Failed to initialize port cache', error);
    }
  }

  /**
   * 分配一组端口
   */
  async allocatePorts(): Promise<PortAllocation> {
    const adbPort = await this.allocateAdbPort();
    const webrtcPort = await this.allocateWebrtcPort();

    return {
      adbPort,
      webrtcPort,
    };
  }

  /**
   * 分配 ADB 端口（支持 Redis 分布式锁）
   */
  private async allocateAdbPort(): Promise<number> {
    if (this.redis) {
      return this.allocatePortWithRedis('adb', this.ADB_PORT_START, this.ADB_PORT_END);
    }

    // Fallback: 内存分配（不支持集群）
    return this.allocatePortInMemory(this.usedAdbPorts, this.ADB_PORT_START, this.ADB_PORT_END, 'ADB');
  }

  /**
   * 分配 WebRTC 端口（支持 Redis 分布式锁）
   */
  private async allocateWebrtcPort(): Promise<number> {
    if (this.redis) {
      return this.allocatePortWithRedis('webrtc', this.WEBRTC_PORT_START, this.WEBRTC_PORT_END);
    }

    // Fallback: 内存分配
    return this.allocatePortInMemory(
      this.usedWebrtcPorts,
      this.WEBRTC_PORT_START,
      this.WEBRTC_PORT_END,
      'WebRTC'
    );
  }

  /**
   * 分配 SCRCPY 端口（支持 Redis 分布式锁）
   */
  async allocateScrcpyPort(): Promise<number> {
    if (this.redis) {
      return this.allocatePortWithRedis('scrcpy', this.SCRCPY_PORT_START, this.SCRCPY_PORT_END);
    }

    // Fallback: 内存分配
    return this.allocatePortInMemory(
      this.usedScrcpyPorts,
      this.SCRCPY_PORT_START,
      this.SCRCPY_PORT_END,
      'SCRCPY'
    );
  }

  /**
   * 使用 Redis 分配端口（集群安全）
   */
  private async allocatePortWithRedis(
    portType: string,
    startPort: number,
    endPort: number
  ): Promise<number> {
    const maxRetries = 10; // 最多尝试 10 次
    const lockTimeout = 5000; // 锁超时 5 秒

    for (let retry = 0; retry < maxRetries; retry++) {
      for (let port = startPort; port <= endPort; port++) {
        const portKey = `${this.REDIS_PORT_KEY_PREFIX}${portType}:${port}`;
        const lockKey = `${this.REDIS_LOCK_KEY_PREFIX}${portType}:${port}`;

        try {
          // 尝试获取分布式锁（使用 SETNX + EXPIRE）
          const lockAcquired = await this.redis!.set(lockKey, '1', 'PX', lockTimeout, 'NX');

          if (lockAcquired) {
            try {
              // 检查端口是否已分配
              const isAllocated = await this.redis!.exists(portKey);

              if (!isAllocated) {
                // 分配端口（设置 TTL 为 24 小时，防止泄漏）
                await this.redis!.setex(portKey, 86400, Date.now().toString());

                this.logger.debug(`✅ Allocated ${portType} port: ${port} (Redis)`);
                return port;
              }
            } finally {
              // 释放锁
              await this.redis!.del(lockKey);
            }
          }
        } catch (error) {
          this.logger.error(`Error allocating port ${port}: ${error.message}`);
        }
      }

      // 所有端口都被占用，等待一小段时间后重试
      await new Promise((resolve) => setTimeout(resolve, 100 * (retry + 1)));
    }

    throw new Error(
      `No available ${portType} ports in range ${startPort}-${endPort} after ${maxRetries} retries`
    );
  }

  /**
   * 内存分配端口（Fallback，不支持集群）
   */
  private allocatePortInMemory(
    usedPorts: Set<number>,
    startPort: number,
    endPort: number,
    portType: string
  ): number {
    for (let port = startPort; port <= endPort; port++) {
      if (!usedPorts.has(port)) {
        usedPorts.add(port);
        this.logger.debug(`✅ Allocated ${portType} port: ${port} (Memory)`);
        return port;
      }
    }

    throw new Error(`No available ${portType} ports in range ${startPort}-${endPort}`);
  }

  /**
   * 释放端口（支持 Redis）
   */
  async releasePorts(allocation: Partial<PortAllocation>): Promise<void> {
    const promises: Promise<void>[] = [];

    if (allocation.adbPort) {
      promises.push(this.releasePort('adb', allocation.adbPort, this.usedAdbPorts));
    }

    if (allocation.webrtcPort) {
      promises.push(this.releasePort('webrtc', allocation.webrtcPort, this.usedWebrtcPorts));
    }

    if (allocation.scrcpyPort) {
      promises.push(this.releasePort('scrcpy', allocation.scrcpyPort, this.usedScrcpyPorts));
    }

    await Promise.all(promises);
  }

  /**
   * 释放单个端口
   */
  private async releasePort(
    portType: string,
    port: number,
    memoryCache: Set<number>
  ): Promise<void> {
    if (this.redis) {
      // 从 Redis 删除端口分配记录
      const portKey = `${this.REDIS_PORT_KEY_PREFIX}${portType}:${port}`;
      await this.redis.del(portKey);
      this.logger.debug(`✅ Released ${portType} port: ${port} (Redis)`);
    } else {
      // Fallback: 从内存缓存删除
      memoryCache.delete(port);
      this.logger.debug(`✅ Released ${portType} port: ${port} (Memory)`);
    }
  }

  /**
   * 检查端口是否可用
   */
  isPortAvailable(port: number, type: 'adb' | 'webrtc' | 'scrcpy'): boolean {
    switch (type) {
      case 'adb':
        return (
          port >= this.ADB_PORT_START && port <= this.ADB_PORT_END && !this.usedAdbPorts.has(port)
        );
      case 'webrtc':
        return (
          port >= this.WEBRTC_PORT_START &&
          port <= this.WEBRTC_PORT_END &&
          !this.usedWebrtcPorts.has(port)
        );
      case 'scrcpy':
        return (
          port >= this.SCRCPY_PORT_START &&
          port <= this.SCRCPY_PORT_END &&
          !this.usedScrcpyPorts.has(port)
        );
      default:
        return false;
    }
  }

  /**
   * 获取端口使用统计
   */
  getPortStats() {
    return {
      adb: {
        total: this.ADB_PORT_END - this.ADB_PORT_START + 1,
        used: this.usedAdbPorts.size,
        available: this.ADB_PORT_END - this.ADB_PORT_START + 1 - this.usedAdbPorts.size,
        range: `${this.ADB_PORT_START}-${this.ADB_PORT_END}`,
      },
      webrtc: {
        total: this.WEBRTC_PORT_END - this.WEBRTC_PORT_START + 1,
        used: this.usedWebrtcPorts.size,
        available: this.WEBRTC_PORT_END - this.WEBRTC_PORT_START + 1 - this.usedWebrtcPorts.size,
        range: `${this.WEBRTC_PORT_START}-${this.WEBRTC_PORT_END}`,
      },
      scrcpy: {
        total: this.SCRCPY_PORT_END - this.SCRCPY_PORT_START + 1,
        used: this.usedScrcpyPorts.size,
        available: this.SCRCPY_PORT_END - this.SCRCPY_PORT_START + 1 - this.usedScrcpyPorts.size,
        range: `${this.SCRCPY_PORT_START}-${this.SCRCPY_PORT_END}`,
      },
    };
  }
}
