import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
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
  details?: {
    description: string;
    capabilities: string[];
  };
}

@ApiTags('health')
@Controller('health')
export class HealthController {
  private readonly startTime: number = Date.now();

  constructor(@InjectDataSource() private dataSource: DataSource) {}

  @Get()
  @ApiOperation({
    summary: '健康检查',
    description: '检查服务是否正常运行，包括依赖项状态和系统信息',
  })
  @ApiResponse({ status: 200, description: '服务正常' })
  async check(): Promise<HealthCheckResult> {
    const dependencies: HealthCheckResult['dependencies'] = {};

    // Check database connection
    const dbCheck = await this.checkDatabase();
    dependencies.database = dbCheck;

    // Determine overall status
    const overallStatus = dbCheck.status === 'unhealthy' ? 'degraded' : 'ok';

    return {
      status: overallStatus,
      service: 'billing-service',
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

  @Get('detailed')
  @ApiOperation({ summary: '详细健康检查', description: '获取包含服务能力的详细健康信息' })
  @ApiResponse({ status: 200, description: '详细健康信息' })
  async detailed(): Promise<HealthCheckResult> {
    const basicHealth = await this.check();

    return {
      ...basicHealth,
      details: {
        description: 'Billing Service - Payment and Subscription Management',
        capabilities: [
          'User balance management',
          'Payment processing (Alipay, WeChat Pay, PayPal)',
          'Subscription plan management',
          'Usage metering and billing',
          'Invoice generation',
          'Transaction history tracking',
          'Automated recurring billing',
        ],
      },
    };
  }

  @Get('liveness')
  @ApiOperation({ summary: 'Kubernetes 存活探针', description: '检查服务进程是否存活' })
  @ApiResponse({ status: 200, description: '服务存活' })
  async liveness() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
    };
  }

  @Get('readiness')
  @ApiOperation({ summary: 'Kubernetes 就绪探针', description: '检查服务是否准备好接收流量' })
  @ApiResponse({ status: 200, description: '服务就绪' })
  @ApiResponse({ status: 503, description: '服务未就绪' })
  async readiness() {
    const dbCheck = await this.checkDatabase();

    const isReady = dbCheck.status === 'healthy';

    if (!isReady) {
      return {
        status: 'error',
        message: 'Service not ready - critical dependencies unhealthy',
        dependencies: {
          database: dbCheck.status,
        },
      };
    }

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      dependencies: {
        database: dbCheck.status,
      },
    };
  }
}
