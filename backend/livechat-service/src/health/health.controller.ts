import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    @InjectDataSource() private dataSource: DataSource,
    @InjectRedis() private redis: Redis,
  ) {}

  @Get()
  @Public()
  @ApiOperation({ summary: '健康检查' })
  @ApiResponse({ status: 200, description: '服务健康' })
  async check() {
    const checks = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'livechat-service',
      version: process.env.APP_VERSION || '1.0.0',
      uptime: process.uptime(),
      checks: {} as Record<string, any>,
    };

    // 检查数据库
    try {
      await this.dataSource.query('SELECT 1');
      checks.checks.database = { status: 'ok' };
    } catch (error) {
      checks.checks.database = { status: 'error', message: error.message };
      checks.status = 'degraded';
    }

    // 检查 Redis
    try {
      await this.redis.ping();
      checks.checks.redis = { status: 'ok' };
    } catch (error) {
      checks.checks.redis = { status: 'error', message: error.message };
      checks.status = 'degraded';
    }

    return checks;
  }

  @Get('live')
  @Public()
  @ApiOperation({ summary: '存活检查' })
  @ApiResponse({ status: 200, description: '服务存活' })
  async live() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Get('ready')
  @Public()
  @ApiOperation({ summary: '就绪检查' })
  @ApiResponse({ status: 200, description: '服务就绪' })
  async ready() {
    // 检查关键依赖
    try {
      await this.dataSource.query('SELECT 1');
      await this.redis.ping();
      return { status: 'ok', timestamp: new Date().toISOString() };
    } catch (error) {
      return { status: 'error', message: error.message };
    }
  }
}
