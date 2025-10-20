import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface GpuInfo {
  available: boolean;
  driver: string;
  devices: string[];
  renderNodes: string[];
  capabilities: string[];
}

export interface GpuConfig {
  enabled: boolean;
  mode: 'host' | 'guest';
  driver: 'virgl' | 'angle' | 'swiftshader';
  devices: string[];
  performance: 'high' | 'balanced' | 'low';
}

@Injectable()
export class GpuManagerService {
  private readonly logger = new Logger(GpuManagerService.name);
  private gpuInfo: GpuInfo | null = null;

  constructor(private configService: ConfigService) {
    this.detectGpu();
  }

  /**
   * 检测 GPU 可用性
   */
  async detectGpu(): Promise<GpuInfo> {
    if (this.gpuInfo) {
      return this.gpuInfo;
    }

    this.logger.log('Detecting GPU...');

    const info: GpuInfo = {
      available: false,
      driver: 'none',
      devices: [],
      renderNodes: [],
      capabilities: [],
    };

    try {
      // 检查 /dev/dri 目录
      if (fs.existsSync('/dev/dri')) {
        const files = fs.readdirSync('/dev/dri');

        // 查找渲染节点
        info.renderNodes = files
          .filter(f => f.startsWith('renderD'))
          .map(f => `/dev/dri/${f}`);

        // 查找卡设备
        info.devices = files
          .filter(f => f.startsWith('card'))
          .map(f => `/dev/dri/${f}`);

        if (info.renderNodes.length > 0 || info.devices.length > 0) {
          info.available = true;
        }
      }

      // 检测 GPU 驱动
      try {
        const { stdout } = await execAsync('glxinfo 2>/dev/null | grep "OpenGL renderer"');
        if (stdout) {
          info.driver = this.parseDriverFromGlxinfo(stdout);
          info.capabilities.push('OpenGL');
        }
      } catch (error) {
        this.logger.debug('glxinfo not available or no OpenGL support');
      }

      // 检测 Vulkan 支持
      try {
        const { stdout } = await execAsync('vulkaninfo --summary 2>/dev/null');
        if (stdout && stdout.includes('Vulkan Instance')) {
          info.capabilities.push('Vulkan');
        }
      } catch (error) {
        this.logger.debug('Vulkan not available');
      }

      this.gpuInfo = info;

      if (info.available) {
        this.logger.log(
          `GPU detected: ${info.driver}, Devices: ${info.devices.length}, Render nodes: ${info.renderNodes.length}, Capabilities: ${info.capabilities.join(', ')}`
        );
      } else {
        this.logger.warn('No GPU detected, will use software rendering');
      }

      return info;
    } catch (error) {
      this.logger.error('Failed to detect GPU', error.stack);
      return info;
    }
  }

  /**
   * 从 glxinfo 输出解析驱动名称
   */
  private parseDriverFromGlxinfo(output: string): string {
    if (output.includes('llvmpipe')) return 'llvmpipe (software)';
    if (output.includes('virgl')) return 'virgl';
    if (output.includes('NVIDIA')) return 'nvidia';
    if (output.includes('AMD')) return 'amd';
    if (output.includes('Intel')) return 'intel';
    return 'unknown';
  }

  /**
   * 获取推荐的 GPU 配置
   */
  getRecommendedConfig(performance: 'high' | 'balanced' | 'low' = 'balanced'): GpuConfig {
    const gpuInfo = this.gpuInfo;

    if (!gpuInfo || !gpuInfo.available) {
      return {
        enabled: false,
        mode: 'guest',
        driver: 'swiftshader',
        devices: [],
        performance: 'low',
      };
    }

    // 根据性能要求选择配置
    const configs = {
      high: {
        enabled: true,
        mode: 'guest' as const,
        driver: 'virgl' as const,
        devices: gpuInfo.renderNodes.length > 0 ? gpuInfo.renderNodes : gpuInfo.devices,
        performance: 'high' as const,
      },
      balanced: {
        enabled: true,
        mode: 'guest' as const,
        driver: 'virgl' as const,
        devices: gpuInfo.renderNodes.slice(0, 1), // 使用第一个渲染节点
        performance: 'balanced' as const,
      },
      low: {
        enabled: false,
        mode: 'guest' as const,
        driver: 'swiftshader' as const,
        devices: [],
        performance: 'low' as const,
      },
    };

    return configs[performance];
  }

  /**
   * 验证 GPU 配置
   */
  async validateConfig(config: GpuConfig): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    if (!config.enabled) {
      return { valid: true, errors: [] };
    }

    // 检查设备是否存在
    for (const device of config.devices) {
      if (!fs.existsSync(device)) {
        errors.push(`GPU device ${device} does not exist`);
      } else {
        try {
          // 检查设备权限
          fs.accessSync(device, fs.constants.R_OK | fs.constants.W_OK);
        } catch (error) {
          errors.push(`No permission to access GPU device ${device}`);
        }
      }
    }

    // 检查驱动支持
    if (config.driver === 'virgl' && !this.gpuInfo?.capabilities.includes('OpenGL')) {
      errors.push('virgl driver requires OpenGL support');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 生成 Docker GPU 设备配置
   */
  getDockerDeviceConfig(config: GpuConfig): any[] {
    if (!config.enabled || config.devices.length === 0) {
      return [];
    }

    return config.devices.map(device => ({
      PathOnHost: device,
      PathInContainer: device,
      CgroupPermissions: 'rwm',
    }));
  }

  /**
   * 生成 GPU 环境变量
   */
  getGpuEnvironment(config: GpuConfig): string[] {
    const env: string[] = [];

    if (!config.enabled) {
      return env;
    }

    // 基础 GPU 配置
    env.push(`REDROID_GPU_MODE=${config.mode}`);

    // 驱动配置
    switch (config.driver) {
      case 'virgl':
        env.push('REDROID_GPU_GUEST_DRIVER=virgl');
        env.push('GALLIUM_DRIVER=virpipe');
        break;
      case 'angle':
        env.push('REDROID_GPU_GUEST_DRIVER=angle');
        break;
      case 'swiftshader':
        env.push('REDROID_GPU_GUEST_DRIVER=swiftshader');
        break;
    }

    // 性能优化
    if (config.performance === 'high') {
      env.push('MESA_GL_VERSION_OVERRIDE=3.3');
      env.push('MESA_GLSL_VERSION_OVERRIDE=330');
    }

    return env;
  }

  /**
   * 测试 GPU 性能
   */
  async benchmarkGpu(deviceId: string): Promise<{
    fps: number;
    renderTime: number;
    driver: string;
  }> {
    this.logger.log(`Benchmarking GPU for device ${deviceId}...`);

    // 这里可以集成实际的性能测试
    // 例如运行 glmark2 或其他基准测试工具

    // 模拟性能数据
    const mockResult = {
      fps: this.gpuInfo?.available ? 60 : 30,
      renderTime: this.gpuInfo?.available ? 16.7 : 33.3,
      driver: this.gpuInfo?.driver || 'software',
    };

    this.logger.log(
      `GPU benchmark: ${mockResult.fps} FPS, ${mockResult.renderTime}ms render time`
    );

    return mockResult;
  }

  /**
   * 获取 GPU 使用统计
   */
  async getGpuStats(): Promise<{
    totalDevices: number;
    availableDevices: number;
    inUseDevices: number;
    gpuUtilization: number;
  }> {
    // 这里可以集成实际的 GPU 监控工具
    // 例如 nvidia-smi 或 radeontop

    return {
      totalDevices: this.gpuInfo?.devices.length || 0,
      availableDevices: this.gpuInfo?.renderNodes.length || 0,
      inUseDevices: 0, // 需要实际统计
      gpuUtilization: 0, // 需要实际监控
    };
  }

  /**
   * 获取 GPU 信息
   */
  getGpuInfo(): GpuInfo | null {
    return this.gpuInfo;
  }

  /**
   * 生成 GPU 诊断报告
   */
  async getDiagnostics(): Promise<{
    gpuAvailable: boolean;
    driver: string;
    devices: string[];
    capabilities: string[];
    recommendations: string[];
    warnings: string[];
  }> {
    const info = await this.detectGpu();
    const recommendations: string[] = [];
    const warnings: string[] = [];

    if (!info.available) {
      warnings.push('No GPU detected. Gaming performance will be limited.');
      recommendations.push('Install GPU drivers and ensure /dev/dri is accessible');
    } else {
      if (info.driver.includes('software')) {
        warnings.push('Using software rendering (llvmpipe). Performance will be poor.');
        recommendations.push('Install proper GPU drivers (Mesa, NVIDIA, AMD)');
      }

      if (info.renderNodes.length === 0 && info.devices.length > 0) {
        warnings.push('No render nodes found. Using card devices may require additional permissions.');
        recommendations.push('Ensure user has access to /dev/dri/renderD* devices');
      }

      if (!info.capabilities.includes('OpenGL')) {
        warnings.push('OpenGL not available. virgl driver will not work.');
        recommendations.push('Install mesa-utils and verify OpenGL support');
      }

      if (info.capabilities.includes('Vulkan')) {
        recommendations.push('Vulkan support detected. Consider using ANGLE driver for better performance.');
      }
    }

    return {
      gpuAvailable: info.available,
      driver: info.driver,
      devices: info.devices,
      capabilities: info.capabilities,
      recommendations,
      warnings,
    };
  }
}
