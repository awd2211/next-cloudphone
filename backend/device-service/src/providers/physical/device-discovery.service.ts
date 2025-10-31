import { Injectable, Logger } from '@nestjs/common';
import { AdbService } from '../../adb/adb.service';
import { PhysicalDeviceInfo, NetworkScanConfig } from './physical.types';

/**
 * 物理设备发现服务
 *
 * 职责：
 * 1. 网络扫描发现设备
 * 2. mDNS 服务发现（未来支持）
 * 3. 手动注册设备
 * 4. 验证设备可用性
 */
@Injectable()
export class DeviceDiscoveryService {
  private readonly logger = new Logger(DeviceDiscoveryService.name);

  constructor(private adbService: AdbService) {}

  /**
   * 扫描网络发现设备
   *
   * @param config 扫描配置
   * @returns 发现的设备列表
   */
  async scanNetwork(config: NetworkScanConfig): Promise<PhysicalDeviceInfo[]> {
    this.logger.log(`Scanning network: ${config.networkCidr}`);

    const ipAddresses = this.expandCidr(config.networkCidr);
    const portRange = config.portRange || { start: 5555, end: 5555 };
    const concurrency = config.concurrency || 50;
    const timeoutMs = config.timeoutMs || 3000;

    this.logger.debug(
      `Scanning ${ipAddresses.length} IPs, ports ${portRange.start}-${portRange.end}, concurrency ${concurrency}`
    );

    const devices: PhysicalDeviceInfo[] = [];

    // 批量扫描（并发控制）
    for (let i = 0; i < ipAddresses.length; i += concurrency) {
      const batch = ipAddresses.slice(i, i + concurrency);

      const results = await Promise.allSettled(
        batch.map((ip) => this.scanIpRange(ip, portRange.start, portRange.end, timeoutMs))
      );

      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          devices.push(result.value);
        }
      }

      this.logger.debug(
        `Scanned ${Math.min(i + concurrency, ipAddresses.length)}/${ipAddresses.length} IPs, found ${devices.length} devices`
      );
    }

    this.logger.log(`Network scan complete: found ${devices.length} devices`);
    return devices;
  }

  /**
   * 扫描单个 IP 的端口范围
   */
  private async scanIpRange(
    ip: string,
    startPort: number,
    endPort: number,
    timeoutMs: number
  ): Promise<PhysicalDeviceInfo | null> {
    for (let port = startPort; port <= endPort; port++) {
      const device = await this.tryConnectAdb(ip, port, timeoutMs);
      if (device) {
        return device;
      }
    }
    return null;
  }

  /**
   * 尝试连接 ADB 并获取设备信息
   */
  private async tryConnectAdb(
    ip: string,
    port: number,
    timeoutMs: number
  ): Promise<PhysicalDeviceInfo | null> {
    const serial = `${ip}:${port}`;

    try {
      // 尝试连接 ADB
      const connected = await this.connectWithTimeout(ip, port, timeoutMs);
      if (!connected) {
        return null;
      }

      // 获取设备属性
      const properties = await this.adbService.getDeviceProperties(serial);

      // 获取设备序列号作为唯一 ID
      const deviceId = properties['ro.serialno'] || properties['ro.boot.serialno'] || serial;

      const device: PhysicalDeviceInfo = {
        id: deviceId,
        name: `${properties['ro.product.manufacturer']}-${properties['ro.product.model']}`,
        ipAddress: ip,
        adbPort: port,
        properties: {
          manufacturer: properties['ro.product.manufacturer'],
          model: properties['ro.product.model'],
          androidVersion: properties['ro.build.version.release'],
          serialNumber: deviceId,
        },
        discoveryMethod: 'network_scan',
        discoveredAt: new Date(),
      };

      this.logger.debug(`Found device at ${serial}: ${device.name}`);
      return device;
    } catch (error) {
      // 连接失败，继续扫描下一个
      return null;
    }
  }

  /**
   * 带超时的 ADB 连接
   */
  private async connectWithTimeout(ip: string, port: number, timeoutMs: number): Promise<boolean> {
    const serial = `${ip}:${port}`;

    return new Promise((resolve) => {
      const timer = setTimeout(() => resolve(false), timeoutMs);

      this.adbService
        .connectToDevice('temp', ip, port)
        .then(() => {
          clearTimeout(timer);
          resolve(true);
        })
        .catch(() => {
          clearTimeout(timer);
          resolve(false);
        });
    });
  }

  /**
   * 手动注册设备
   *
   * @param ip IP 地址
   * @param port ADB 端口
   * @param deviceGroup 设备分组
   * @returns 设备信息
   */
  async registerDevice(
    ip: string,
    port: number,
    deviceGroup?: string
  ): Promise<PhysicalDeviceInfo> {
    this.logger.log(`Manually registering device: ${ip}:${port}`);

    const serial = `${ip}:${port}`;

    // 连接 ADB
    await this.adbService.connectToDevice('manual', ip, port);

    // 获取设备属性
    const properties = await this.adbService.getDeviceProperties(serial);

    const deviceId = properties['ro.serialno'] || properties['ro.boot.serialno'] || serial;

    const device: PhysicalDeviceInfo = {
      id: deviceId,
      name: `${properties['ro.product.manufacturer']}-${properties['ro.product.model']}`,
      ipAddress: ip,
      adbPort: port,
      deviceGroup,
      properties: {
        manufacturer: properties['ro.product.manufacturer'],
        model: properties['ro.product.model'],
        androidVersion: properties['ro.build.version.release'],
        serialNumber: deviceId,
      },
      discoveryMethod: 'manual',
      discoveredAt: new Date(),
    };

    this.logger.log(`Device registered: ${device.id} (${device.name})`);
    return device;
  }

  /**
   * 验证设备是否可用
   *
   * @param ip IP 地址
   * @param port ADB 端口
   * @returns 是否可用
   */
  async validateDevice(ip: string, port: number): Promise<boolean> {
    const serial = `${ip}:${port}`;

    try {
      // 尝试连接
      await this.adbService.connectToDevice('validate', ip, port);

      // 检查 boot 状态
      const output = await this.adbService.executeShellCommand(
        'validate',
        'getprop sys.boot_completed',
        3000
      );

      return output.trim() === '1';
    } catch (error) {
      this.logger.warn(`Device validation failed for ${serial}: ${error.message}`);
      return false;
    }
  }

  /**
   * 扩展 CIDR 为 IP 地址列表
   *
   * @param cidr CIDR 表示法（如 "192.168.1.0/24"）
   * @returns IP 地址数组
   */
  private expandCidr(cidr: string): string[] {
    const [baseIp, prefixLenStr] = cidr.split('/');
    const prefixLen = parseInt(prefixLenStr, 10);

    if (prefixLen < 0 || prefixLen > 32) {
      throw new Error(`Invalid CIDR prefix length: ${prefixLen}`);
    }

    const ipParts = baseIp.split('.').map((part) => parseInt(part, 10));
    const baseIpNum = (ipParts[0] << 24) | (ipParts[1] << 16) | (ipParts[2] << 8) | ipParts[3];

    const hostBits = 32 - prefixLen;
    const numHosts = Math.pow(2, hostBits);
    const networkAddress = baseIpNum & (~0 << hostBits);

    const ips: string[] = [];

    // 跳过网络地址和广播地址
    const start = networkAddress + 1;
    const end = networkAddress + numHosts - 1;

    for (let i = start; i < end; i++) {
      const a = (i >>> 24) & 0xff;
      const b = (i >>> 16) & 0xff;
      const c = (i >>> 8) & 0xff;
      const d = i & 0xff;
      ips.push(`${a}.${b}.${c}.${d}`);
    }

    return ips;
  }

  /**
   * mDNS 服务发现
   *
   * 使用 mDNS (Multicast DNS) 自动发现局域网内的 Android 设备
   * 需要设备运行 mDNS 服务，通常使用 _adb._tcp.local 服务名
   */
  async discoverViaMdns(): Promise<PhysicalDeviceInfo[]> {
    return new Promise((resolve) => {
      const devices: PhysicalDeviceInfo[] = [];
      const deviceMap = new Map<string, PhysicalDeviceInfo>();

      try {
        const Bonjour = require('bonjour-service');
        const bonjour = new Bonjour();

        this.logger.log('Starting mDNS discovery for ADB services...');

        // 浏览 ADB 服务
        const browser = bonjour.find({ type: 'adb', protocol: 'tcp' }, (service: any) => {
          try {
            // 提取设备信息
            const address = service.addresses?.[0] || service.host;
            const port = service.port || 5555;

            // 从 TXT 记录中获取设备 ID（如果有）
            const deviceId =
              service.txt?.device_id ||
              service.txt?.deviceId ||
              `${service.name || 'unknown'}-${address}`;

            const deviceName =
              service.txt?.name ||
              service.txt?.device_name ||
              service.name ||
              `Android Device (${address})`;

            // 避免重复设备
            const uniqueKey = `${address}:${port}`;
            if (!deviceMap.has(uniqueKey)) {
              const deviceInfo: PhysicalDeviceInfo = {
                id: deviceId,
                ipAddress: address,
                adbPort: port,
                name: deviceName,
                discoveryMethod: 'mdns',
                discoveredAt: new Date(),
                properties: {
                  manufacturer: service.txt?.manufacturer,
                  model: service.txt?.model,
                  androidVersion: service.txt?.android_version,
                },
                lastHeartbeatAt: new Date(),
              };

              deviceMap.set(uniqueKey, deviceInfo);
              devices.push(deviceInfo);

              this.logger.log(
                `Discovered device via mDNS: ${deviceInfo.name} at ${address}:${port}`
              );
            }
          } catch (error) {
            this.logger.warn(`Failed to process mDNS service: ${error.message}`);
          }
        });

        // 设置超时
        setTimeout(() => {
          try {
            browser.stop();
            bonjour.destroy();

            this.logger.log(`mDNS discovery completed. Found ${devices.length} device(s)`);

            resolve(devices);
          } catch (error) {
            this.logger.error('Error stopping mDNS browser', error);
            resolve(devices);
          }
        }, 5000); // 5 秒扫描时间
      } catch (error) {
        this.logger.error('mDNS discovery failed', error);
        resolve([]);
      }
    });
  }
}
