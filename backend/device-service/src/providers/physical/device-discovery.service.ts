import { Injectable, Logger } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import { AdbService } from '../../adb/adb.service';
import {
  PhysicalDeviceInfo,
  NetworkScanConfig,
  ScanProgress,
  ScanStatistics,
} from './physical.types';

const execAsync = promisify(exec);

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
   * 扫描进度回调接口
   */
  public onProgressCallback?: (progress: ScanProgress) => void;

  /**
   * 扫描网络发现设备
   *
   * @param config 扫描配置
   * @returns 发现的设备列表
   */
  async scanNetwork(config: NetworkScanConfig): Promise<PhysicalDeviceInfo[]> {
    return this.scanNetworkWithProgress(config);
  }

  /**
   * 扫描网络发现设备（带进度回调）
   *
   * 两阶段扫描策略：
   * 1. 阶段1：快速探测主机是否存活（尝试常见端口）
   * 2. 阶段2：只对存活主机检测 ADB 端口
   *
   * @param config 扫描配置
   * @param onProgress 进度回调函数
   * @returns 发现的设备列表
   */
  async scanNetworkWithProgress(
    config: NetworkScanConfig,
    onProgress?: (progress: ScanProgress) => void
  ): Promise<PhysicalDeviceInfo[]> {
    const ipAddresses = this.expandCidr(config.networkCidr);
    const portRange = config.portRange || { start: 5555, end: 5555 };
    // 优化：增加并发数以加快扫描
    const concurrency = config.concurrency || 50;
    // 优化：增加默认超时时间，适应高延迟网络
    const timeoutMs = config.timeoutMs || 5000;

    // 统计信息
    const stats: ScanStatistics = {
      totalIps: ipAddresses.length,
      scannedIps: 0,
      portsOpen: 0,
      adbConnected: 0,
      devicesFound: 0,
      errors: 0,
      startTime: Date.now(),
      hostsAlive: 0,
    };

    this.logger.log(
      `[SCAN START] Network: ${config.networkCidr}, ` +
      `IPs: ${ipAddresses.length}, ADB Ports: ${portRange.start}-${portRange.end}, ` +
      `Concurrency: ${concurrency}, Timeout: ${timeoutMs}ms`
    );

    const devices: PhysicalDeviceInfo[] = [];
    const totalIps = ipAddresses.length;

    // ========== 阶段1：探测存活主机 ==========
    this.logger.log(`[PHASE 1] Detecting alive hosts...`);
    const aliveHosts: string[] = [];

    // 使用快速超时进行存活检测（1秒）
    const aliveCheckTimeout = Math.min(timeoutMs, 1500);

    for (let i = 0; i < ipAddresses.length; i += concurrency) {
      const batch = ipAddresses.slice(i, i + concurrency);

      // 发送进度更新
      const progress: ScanProgress = {
        scannedIps: i,
        totalIps,
        foundDevices: devices.length,
        currentIp: `${batch[0]} - ${batch[batch.length - 1]}`,
        status: 'scanning',
        phase: 'alive_check',
        statistics: { ...stats },
      };
      onProgress?.(progress);
      this.onProgressCallback?.(progress);

      // 并发检测主机存活
      const aliveResults = await Promise.allSettled(
        batch.map((ip) => this.isHostAlive(ip, aliveCheckTimeout))
      );

      for (let j = 0; j < aliveResults.length; j++) {
        const result = aliveResults[j];
        if (result.status === 'fulfilled' && result.value) {
          aliveHosts.push(batch[j]);
          stats.hostsAlive = aliveHosts.length;
          this.logger.debug(`[ALIVE] ${batch[j]}`);
        }
      }

      stats.scannedIps = Math.min(i + concurrency, ipAddresses.length);
    }

    this.logger.log(`[PHASE 1 COMPLETE] Found ${aliveHosts.length} alive hosts out of ${totalIps} IPs`);

    // ========== 阶段2：检测 ADB 端口 ==========
    if (aliveHosts.length === 0) {
      this.logger.warn(`[SCAN COMPLETE] No alive hosts found. Check network connectivity.`);
      const completeProgress: ScanProgress = {
        scannedIps: totalIps,
        totalIps,
        foundDevices: 0,
        status: 'completed',
        statistics: { ...stats },
      };
      onProgress?.(completeProgress);
      this.onProgressCallback?.(completeProgress);
      return [];
    }

    this.logger.log(`[PHASE 2] Checking ADB ports on ${aliveHosts.length} alive hosts...`);

    // 对存活主机检测 ADB 端口
    for (let i = 0; i < aliveHosts.length; i += concurrency) {
      const batch = aliveHosts.slice(i, i + concurrency);
      const batchStart = Date.now();

      // 发送进度更新
      const progress: ScanProgress = {
        scannedIps: totalIps, // 阶段1已完成
        totalIps,
        foundDevices: devices.length,
        currentIp: `${batch[0]} - ${batch[batch.length - 1]}`,
        status: 'scanning',
        phase: 'adb_check',
        aliveHosts: aliveHosts.length,
        checkedHosts: i,
        statistics: { ...stats },
      };
      onProgress?.(progress);
      this.onProgressCallback?.(progress);

      const results = await Promise.allSettled(
        batch.map((ip) => this.scanIpWithStats(ip, portRange.start, portRange.end, timeoutMs, stats))
      );

      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          devices.push(result.value);
          stats.devicesFound++;
          // 发现新设备时立即通知
          const deviceFoundProgress: ScanProgress = {
            scannedIps: totalIps,
            totalIps,
            foundDevices: devices.length,
            currentIp: result.value.ipAddress,
            status: 'scanning',
            phase: 'adb_check',
            newDevice: result.value,
            statistics: { ...stats },
          };
          onProgress?.(deviceFoundProgress);
          this.onProgressCallback?.(deviceFoundProgress);
          this.logger.log(`[DEVICE FOUND] ${result.value.name} at ${result.value.ipAddress}:${result.value.adbPort}`);
        }
      }

      const batchTime = Date.now() - batchStart;
      this.logger.debug(
        `[BATCH] Checked ${Math.min(i + concurrency, aliveHosts.length)}/${aliveHosts.length} alive hosts, ` +
        `Ports open: ${stats.portsOpen}, Devices: ${stats.devicesFound}, Time: ${batchTime}ms`
      );
    }

    // 扫描完成
    const totalTime = Date.now() - stats.startTime;
    const completeProgress: ScanProgress = {
      scannedIps: totalIps,
      totalIps,
      foundDevices: devices.length,
      status: 'completed',
      statistics: { ...stats },
    };
    onProgress?.(completeProgress);
    this.onProgressCallback?.(completeProgress);

    this.logger.log(
      `[SCAN COMPLETE] Found ${devices.length} devices in ${totalTime}ms. ` +
      `Stats: IPs=${stats.scannedIps}, Alive=${stats.hostsAlive}, ` +
      `ADB ports=${stats.portsOpen}, Devices=${stats.devicesFound}, Errors=${stats.errors}`
    );

    return devices;
  }

  /**
   * 快速检测主机是否存活
   * 使用 ICMP ping 命令检测主机是否在线（比 TCP 端口探测更高效）
   *
   * @param ip IP 地址
   * @param timeoutMs 超时时间（毫秒）
   * @returns 主机是否存活
   */
  private async isHostAlive(ip: string, timeoutMs: number): Promise<boolean> {
    // 将毫秒转换为秒（ping 命令使用秒作为超时单位）
    const timeoutSec = Math.max(1, Math.ceil(timeoutMs / 1000));

    try {
      // 使用系统 ping 命令进行 ICMP 探测
      // -c 1: 只发送一个包
      // -W 1: 超时时间（秒）
      // -n: 不解析域名
      await execAsync(`ping -c 1 -W ${timeoutSec} -n ${ip}`, {
        timeout: timeoutMs + 500, // 给 ping 命令额外的缓冲时间
      });
      return true;
    } catch {
      // ping 失败表示主机不存活（或超时）
      return false;
    }
  }

  /**
   * 扫描单个 IP（带统计）
   */
  private async scanIpWithStats(
    ip: string,
    startPort: number,
    endPort: number,
    timeoutMs: number,
    stats: ScanStatistics
  ): Promise<PhysicalDeviceInfo | null> {
    for (let port = startPort; port <= endPort; port++) {
      const device = await this.tryConnectAdbWithStats(ip, port, timeoutMs, stats);
      if (device) {
        return device;
      }
    }
    return null;
  }

  /**
   * 尝试连接 ADB（带统计和详细日志）
   */
  private async tryConnectAdbWithStats(
    ip: string,
    port: number,
    timeoutMs: number,
    stats: ScanStatistics
  ): Promise<PhysicalDeviceInfo | null> {
    const serial = `${ip}:${port}`;

    try {
      // 第一步：测试端口是否开放
      const portOpen = await this.adbService.testPortOpen(ip, port, timeoutMs);
      if (!portOpen) {
        return null;
      }
      stats.portsOpen++;
      this.logger.debug(`[PORT OPEN] ${serial}`);

      // 第二步：尝试 ADB 连接
      const connected = await this.connectWithTimeout(ip, port, timeoutMs);
      if (!connected) {
        this.logger.debug(`[ADB FAILED] ${serial} - Connection failed`);
        return null;
      }
      stats.adbConnected++;
      this.logger.debug(`[ADB CONNECTED] ${serial}`);

      // 第三步：获取设备属性
      const properties = await this.adbService.getDeviceProperties(serial);

      const deviceId = properties['ro.serialno'] || properties['ro.boot.serialno'] || serial;

      const device: PhysicalDeviceInfo = {
        id: deviceId,
        name: `${properties['ro.product.manufacturer'] || 'Unknown'}-${properties['ro.product.model'] || 'Device'}`,
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

      return device;
    } catch (error) {
      stats.errors++;
      stats.lastErrorIp = serial;
      stats.lastErrorMessage = error.message || 'Unknown error';
      this.logger.debug(`[ERROR] ${serial} - ${stats.lastErrorMessage}`);
      return null;
    }
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
   * 带超时的 ADB 连接（安全版本）
   * 使用 AdbService.safeConnect 方法，先测试端口再连接，避免 ECONNRESET 导致进程崩溃
   */
  private async connectWithTimeout(ip: string, port: number, timeoutMs: number): Promise<boolean> {
    try {
      // 使用安全连接方法，先测试端口是否开放
      const connected = await this.adbService.safeConnect(ip, port, timeoutMs);
      if (!connected) {
        return false;
      }

      // 如果端口测试成功，再尝试完整的 ADB 连接
      const serial = `${ip}:${port}`;
      await this.adbService.connectToDevice(serial, ip, port);
      return true;
    } catch (error) {
      // 连接失败是预期的（大部分 IP 不会有 ADB 服务）
      return false;
    }
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
