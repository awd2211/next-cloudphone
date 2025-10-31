import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Device, DeviceStatus } from '../entities/device.entity';

export interface PortAllocation {
  adbPort: number;
  webrtcPort: number;
  scrcpyPort?: number;
}

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

  // 端口使用缓存
  private usedAdbPorts: Set<number> = new Set();
  private usedWebrtcPorts: Set<number> = new Set();
  private usedScrcpyPorts: Set<number> = new Set();

  constructor(
    @InjectRepository(Device)
    private devicesRepository: Repository<Device>
  ) {
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
    const adbPort = this.allocateAdbPort();
    const webrtcPort = this.allocateWebrtcPort();

    return {
      adbPort,
      webrtcPort,
    };
  }

  /**
   * 分配 ADB 端口
   */
  private allocateAdbPort(): number {
    for (let port = this.ADB_PORT_START; port <= this.ADB_PORT_END; port++) {
      if (!this.usedAdbPorts.has(port)) {
        this.usedAdbPorts.add(port);
        this.logger.debug(`Allocated ADB port: ${port}`);
        return port;
      }
    }

    throw new Error(`No available ADB ports in range ${this.ADB_PORT_START}-${this.ADB_PORT_END}`);
  }

  /**
   * 分配 WebRTC 端口
   */
  private allocateWebrtcPort(): number {
    for (let port = this.WEBRTC_PORT_START; port <= this.WEBRTC_PORT_END; port++) {
      if (!this.usedWebrtcPorts.has(port)) {
        this.usedWebrtcPorts.add(port);
        this.logger.debug(`Allocated WebRTC port: ${port}`);
        return port;
      }
    }

    throw new Error(
      `No available WebRTC ports in range ${this.WEBRTC_PORT_START}-${this.WEBRTC_PORT_END}`
    );
  }

  /**
   * 分配 SCRCPY 端口
   */
  allocateScrcpyPort(): number {
    for (let port = this.SCRCPY_PORT_START; port <= this.SCRCPY_PORT_END; port++) {
      if (!this.usedScrcpyPorts.has(port)) {
        this.usedScrcpyPorts.add(port);
        this.logger.debug(`Allocated SCRCPY port: ${port}`);
        return port;
      }
    }

    throw new Error(
      `No available SCRCPY ports in range ${this.SCRCPY_PORT_START}-${this.SCRCPY_PORT_END}`
    );
  }

  /**
   * 释放端口
   */
  releasePorts(allocation: Partial<PortAllocation>): void {
    if (allocation.adbPort) {
      this.usedAdbPorts.delete(allocation.adbPort);
      this.logger.debug(`Released ADB port: ${allocation.adbPort}`);
    }

    if (allocation.webrtcPort) {
      this.usedWebrtcPorts.delete(allocation.webrtcPort);
      this.logger.debug(`Released WebRTC port: ${allocation.webrtcPort}`);
    }

    if (allocation.scrcpyPort) {
      this.usedScrcpyPorts.delete(allocation.scrcpyPort);
      this.logger.debug(`Released SCRCPY port: ${allocation.scrcpyPort}`);
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
