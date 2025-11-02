import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  Logger,
  Query,
} from '@nestjs/common';
import { ProxyStatsService } from './proxy-stats.service';
import { ProxyHealthService } from './proxy-health.service';
import { ProxyCleanupService } from './proxy-cleanup.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

/**
 * 代理管理控制器（管理员级别）
 * 提供代理统计、健康检查、孤儿清理等管理功能
 */
@Controller('proxy/admin')
@UseGuards(JwtAuthGuard) // ✅ 需要管理员权限
export class ProxyAdminController {
  private readonly logger = new Logger(ProxyAdminController.name);

  constructor(
    private readonly proxyStats: ProxyStatsService,
    private readonly proxyHealth: ProxyHealthService,
    private readonly proxyCleanup: ProxyCleanupService,
  ) {}

  /**
   * 获取代理使用统计概览
   * GET /proxy/admin/stats
   */
  @Get('stats')
  async getProxyStats(@Query('days') days?: string) {
    const daysNum = days ? parseInt(days, 10) : 7;

    this.logger.log(`Fetching proxy statistics for last ${daysNum} days`);

    const [overview, orphanStats] = await Promise.all([
      this.proxyStats.getProxyUsageOverview(daysNum),
      this.proxyCleanup.getOrphanStatistics(),
    ]);

    return {
      overview,
      orphanStats,
      generatedAt: new Date(),
    };
  }

  /**
   * 获取所有不健康的代理列表
   * GET /proxy/admin/health/unhealthy
   */
  @Get('health/unhealthy')
  async getUnhealthyProxies() {
    this.logger.log('Fetching unhealthy proxies');

    const unhealthyProxies = await this.proxyHealth.getUnhealthyProxies();

    return {
      count: unhealthyProxies.length,
      proxies: unhealthyProxies,
      retrievedAt: new Date(),
    };
  }

  /**
   * 手动触发批量健康检查
   * POST /proxy/admin/health/check
   */
  @Post('health/check')
  @HttpCode(HttpStatus.OK)
  async triggerHealthCheck() {
    this.logger.log('Manual batch health check triggered by admin');

    const result = await this.proxyHealth.triggerBatchHealthCheck();

    return {
      message: 'Batch health check completed',
      result,
      completedAt: new Date(),
    };
  }

  /**
   * 检测孤儿代理（不触发清理）
   * GET /proxy/admin/orphans
   */
  @Get('orphans')
  async detectOrphans() {
    this.logger.log('Detecting orphan proxies');

    const result = await this.proxyCleanup.triggerOrphanDetection();

    return {
      message: 'Orphan detection completed',
      ...result,
      detectedAt: new Date(),
    };
  }

  /**
   * 手动触发孤儿清理
   * POST /proxy/admin/cleanup
   */
  @Post('cleanup')
  @HttpCode(HttpStatus.OK)
  async triggerCleanup() {
    this.logger.log('Manual orphan cleanup triggered by admin');

    const result = await this.proxyCleanup.triggerFullCleanup();

    return {
      message: 'Orphan cleanup completed',
      ...result,
      completedAt: new Date(),
    };
  }

  /**
   * 强制释放特定代理
   * DELETE /proxy/admin/force-release/:proxyId
   */
  @Delete('force-release/:proxyId')
  @HttpCode(HttpStatus.OK)
  async forceReleaseProxy(@Param('proxyId') proxyId: string) {
    this.logger.log(`Force releasing proxy: ${proxyId}`);

    await this.proxyCleanup.forceCleanupProxy(proxyId);

    return {
      message: `Proxy ${proxyId} force released successfully`,
      proxyId,
      releasedAt: new Date(),
    };
  }

  /**
   * 获取代理性能统计（按国家/类型分组）
   * GET /proxy/admin/performance
   */
  @Get('performance')
  async getProxyPerformance() {
    this.logger.log('Fetching proxy performance statistics');

    const performance = await this.proxyStats.getProxyPerformanceStats();

    return {
      performance,
      generatedAt: new Date(),
    };
  }

  /**
   * 获取特定代理的详细信息
   * GET /proxy/admin/:proxyId/details
   */
  @Get(':proxyId/details')
  async getProxyDetails(@Param('proxyId') proxyId: string) {
    this.logger.log(`Fetching details for proxy: ${proxyId}`);

    const details = await this.proxyStats.getProxyUsageDetails(proxyId);

    if (!details) {
      return {
        message: 'Proxy not found or never used',
        proxyId,
      };
    }

    return {
      ...details,
      retrievedAt: new Date(),
    };
  }

  /**
   * 获取特定设备的代理使用历史
   * GET /proxy/admin/device/:deviceId/history
   */
  @Get('device/:deviceId/history')
  async getDeviceProxyHistory(
    @Param('deviceId') deviceId: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 10;

    this.logger.log(`Fetching proxy history for device: ${deviceId}`);

    const history = await this.proxyStats.getDeviceProxyHistory(
      deviceId,
      limitNum,
    );

    return {
      deviceId,
      historyCount: history.length,
      history,
      retrievedAt: new Date(),
    };
  }

  /**
   * 获取用户的代理使用汇总
   * GET /proxy/admin/user/:userId/summary
   */
  @Get('user/:userId/summary')
  async getUserProxySummary(@Param('userId') userId: string) {
    this.logger.log(`Fetching proxy summary for user: ${userId}`);

    const summary = await this.proxyStats.getUserProxySummary(userId);

    return {
      userId,
      ...summary,
      retrievedAt: new Date(),
    };
  }
}
