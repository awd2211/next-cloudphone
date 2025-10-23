import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Public } from './auth/decorators/public.decorator';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { MinioService } from './minio/minio.service';
import * as os from 'os';

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
    minio?: DependencyStatus;
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
    private minioService: MinioService,
  ) {}

  @Get()
  @Public()
  @ApiOperation({ summary: '健康检查', description: '检查服务是否正常运行，包括依赖项状态和系统信息' })
  @ApiResponse({ status: 200, description: '服务正常' })
  async check(): Promise<HealthCheckResult> {
    const dependencies: HealthCheckResult['dependencies'] = {};

    // Check all critical dependencies in parallel
    const [dbCheck, minioCheck] = await Promise.all([
      this.checkDatabase(),
      this.checkMinio(),
    ]);

    dependencies.database = dbCheck;
    dependencies.minio = minioCheck;

    // Determine overall status
    const hasUnhealthyDependency =
      dbCheck.status === 'unhealthy' ||
      minioCheck.status === 'unhealthy';

    const overallStatus = hasUnhealthyDependency ? 'degraded' : 'ok';

    return {
      status: overallStatus,
      service: 'app-service',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      environment: process.env.NODE_ENV || 'development',
      dependencies,
      system: this.getSystemInfo(),
    };
  }

  private async checkDatabase(): Promise<DependencyStatus> {
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

  /**
   * Check MinIO connectivity
   */
  private async checkMinio(): Promise<DependencyStatus> {
    try {
      const start = Date.now();
      const minioClient = (this.minioService as any).minioClient;
      const bucketName = (this.minioService as any).bucketName;

      if (!minioClient) {
        return {
          status: 'unhealthy',
          message: 'MinIO client not initialized',
        };
      }

      // Check if bucket exists (verifies MinIO connection and permissions)
      const exists = await minioClient.bucketExists(bucketName);
      const responseTime = Date.now() - start;

      if (!exists) {
        return {
          status: 'unhealthy',
          message: `Bucket '${bucketName}' does not exist`,
        };
      }

      return {
        status: 'healthy',
        responseTime,
        message: `Bucket '${bucketName}' accessible`,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error.message || 'MinIO connection failed',
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
        description: 'App Service - APK Management and Distribution',
        capabilities: [
          'APK upload/download to MinIO',
          'App installation/uninstallation via ADB',
          'App marketplace management',
          'Version management',
          'Multi-tenant app isolation',
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
      const [dbCheck, minioCheck] = await Promise.all([
        this.checkDatabase(),
        this.checkMinio(),
      ]);

      // Service is ready only if all critical dependencies are healthy
      const isReady =
        dbCheck.status === 'healthy' &&
        minioCheck.status === 'healthy';

      if (!isReady) {
        return {
          status: 'error',
          message: 'Service not ready - critical dependencies unhealthy',
          dependencies: {
            database: dbCheck.status,
            minio: minioCheck.status,
          },
        };
      }

      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        dependencies: {
          database: 'healthy',
          minio: 'healthy',
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
