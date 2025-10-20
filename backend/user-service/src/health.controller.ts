import { Controller, Get } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import * as os from 'os';

interface HealthCheckResult {
  status: 'ok' | 'degraded';
  service: string;
  version: string;
  timestamp: string;
  uptime: number;
  environment: string;
  dependencies: {
    database?: {
      status: 'healthy' | 'unhealthy';
      responseTime?: number;
      message?: string;
    };
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

@Controller('health')
export class HealthController {
  private readonly startTime: number = Date.now();

  constructor(@InjectDataSource() private dataSource: DataSource) {}

  @Get()
  async check(): Promise<HealthCheckResult> {
    const dependencies: HealthCheckResult['dependencies'] = {};

    // Check database connection
    const dbCheck = await this.checkDatabase();
    dependencies.database = dbCheck;

    // Determine overall status
    const overallStatus = dbCheck.status === 'unhealthy' ? 'degraded' : 'ok';

    return {
      status: overallStatus,
      service: 'user-service',
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
}
