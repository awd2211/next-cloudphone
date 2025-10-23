import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Public } from './auth/decorators/public.decorator';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DockerService } from './docker/docker.service';
import { AdbService } from './adb/adb.service';
import * as os from 'os';
import { InjectConnection } from '@nestjs/typeorm';
import { Connection } from 'typeorm';

interface DependencyStatus {
  status: 'healthy' | 'unhealthy';
  responseTime?: number;
  message?: string;
  version?: string;
}

interface HealthCheckResult {
  status: 'ok' | 'degraded';
  service: string;
  version: string;
  timestamp: string;
  uptime: number;
  environment: string;
  dependencies: {
    database?: DependencyStatus;
    docker?: DependencyStatus;
    adb?: DependencyStatus;
    redis?: DependencyStatus;
    rabbitmq?: DependencyStatus;
  };
  system: {
    hostname: string;
    platform: string;
    memory: {
      total: number;
      free: number;
      used: number;
      usagePercent: number;
    };
    cpu: {
      cores: number;
      model: string;
    };
  };
}

@ApiTags('health')
@Controller('health')
export class HealthController {
  private readonly startTime: number = Date.now();

  constructor(
    @InjectDataSource() private dataSource: DataSource,
    private dockerService: DockerService,
    private adbService: AdbService,
  ) {}

  @Get()
  @Public()
  @ApiOperation({ summary: '健康检查', description: '检查服务是否正常运行，包括依赖项状态和系统信息' })
  @ApiResponse({ status: 200, description: '服务正常' })
  async check(): Promise<HealthCheckResult> {
    const dependencies: HealthCheckResult['dependencies'] = {};

    // Check all critical dependencies in parallel
    const [dbCheck, dockerCheck, adbCheck] = await Promise.all([
      this.checkDatabase(),
      this.checkDocker(),
      this.checkAdb(),
    ]);

    dependencies.database = dbCheck;
    dependencies.docker = dockerCheck;
    dependencies.adb = adbCheck;

    // Determine overall status
    const hasUnhealthyDependency =
      dbCheck.status === 'unhealthy' ||
      dockerCheck.status === 'unhealthy' ||
      adbCheck.status === 'unhealthy';

    const overallStatus = hasUnhealthyDependency ? 'degraded' : 'ok';

    return {
      status: overallStatus,
      service: 'device-service',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      environment: process.env.NODE_ENV || 'development',
      dependencies,
      system: this.getSystemInfo(),
    };
  }

  private async checkDatabase(): Promise<{
    status: 'healthy' | 'unhealthy';
    responseTime?: number;
    message?: string;
  }> {
    try {
      const start = Date.now();
      await this.dataSource.query('SELECT 1');
      const responseTime = Date.now() - start;

      return {
        status: 'healthy',
        responseTime,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error.message,
      };
    }
  }

  private getSystemInfo(): HealthCheckResult['system'] {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;

    return {
      hostname: os.hostname(),
      platform: os.platform(),
      memory: {
        total: Math.floor(totalMemory / 1024 / 1024), // MB
        free: Math.floor(freeMemory / 1024 / 1024), // MB
        used: Math.floor(usedMemory / 1024 / 1024), // MB
        usagePercent: Math.floor((usedMemory / totalMemory) * 100),
      },
      cpu: {
        cores: os.cpus().length,
        model: os.cpus()[0]?.model || 'unknown',
      },
    };
  }

  /**
   * Check Docker daemon connectivity
   */
  private async checkDocker(): Promise<DependencyStatus> {
    try {
      const start = Date.now();
      const docker = (this.dockerService as any).docker;

      if (!docker) {
        return {
          status: 'unhealthy',
          message: 'Docker client not initialized',
        };
      }

      // Ping Docker daemon
      await docker.ping();
      const responseTime = Date.now() - start;

      // Get Docker version
      const info = await docker.version();
      const version = info.Version || 'unknown';

      return {
        status: 'healthy',
        responseTime,
        version,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error.message || 'Docker connection failed',
      };
    }
  }

  /**
   * Check ADB server connectivity
   */
  private async checkAdb(): Promise<DependencyStatus> {
    try {
      const start = Date.now();
      const adbClient = (this.adbService as any).client;

      if (!adbClient) {
        return {
          status: 'unhealthy',
          message: 'ADB client not initialized',
        };
      }

      // Get ADB server version
      const version = await adbClient.version();
      const responseTime = Date.now() - start;

      return {
        status: 'healthy',
        responseTime,
        version: version.toString(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error.message || 'ADB connection failed',
      };
    }
  }

  /**
   * Detailed health check with all dependencies
   */
  @Get('detailed')
  @Public()
  @ApiOperation({ summary: '详细健康检查' })
  async detailedCheck() {
    const basicCheck = await this.check();

    return {
      ...basicCheck,
      details: {
        description: 'Device Service - Cloud Android Device Management',
        capabilities: [
          'Docker container lifecycle management',
          'ADB integration for Android control',
          'Device monitoring and metrics',
          'Snapshot backup and restore',
          'Quota enforcement',
          'Lifecycle automation',
        ],
      },
    };
  }

  /**
   * Kubernetes liveness probe
   * Indicates if the service is alive and should not be restarted
   */
  @Get('liveness')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Kubernetes 存活探针' })
  async liveness() {
    // Basic liveness check - service is running
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
    };
  }

  /**
   * Kubernetes readiness probe
   * Indicates if the service is ready to accept traffic
   */
  @Get('readiness')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Kubernetes 就绪探针' })
  async readiness() {
    try {
      // Check critical dependencies for readiness
      const [dbCheck, dockerCheck, adbCheck] = await Promise.all([
        this.checkDatabase(),
        this.checkDocker(),
        this.checkAdb(),
      ]);

      // Service is ready only if all critical dependencies are healthy
      const isReady =
        dbCheck.status === 'healthy' &&
        dockerCheck.status === 'healthy' &&
        adbCheck.status === 'healthy';

      if (!isReady) {
        return {
          status: 'error',
          message: 'Service not ready - critical dependencies unhealthy',
          dependencies: {
            database: dbCheck.status,
            docker: dockerCheck.status,
            adb: adbCheck.status,
          },
        };
      }

      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        dependencies: {
          database: 'healthy',
          docker: 'healthy',
          adb: 'healthy',
        },
      };
    } catch (error) {
      return {
        status: 'error',
        message: error.message,
      };
    }
  }
}
