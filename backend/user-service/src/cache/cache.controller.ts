import { Controller, Get, Delete, Post, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { CacheService } from './cache.service';
import { CacheWarmupService } from './cache-warmup.service';

/**
 * 缓存管理控制器
 *
 * 提供缓存统计、管理、预热等接口
 */
@Controller('cache')
export class CacheController {
  constructor(
    private readonly cacheService: CacheService,
    private readonly cacheWarmupService: CacheWarmupService, // ✅ 注入预热服务
  ) {}

  /**
   * 获取缓存统计信息
   *
   * GET /cache/stats
   */
  @Get('stats')
  getStats() {
    return {
      success: true,
      data: this.cacheService.getStats(),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 重置缓存统计
   *
   * DELETE /cache/stats
   */
  @Delete('stats')
  @HttpCode(HttpStatus.NO_CONTENT)
  resetStats() {
    this.cacheService.resetStats();
  }

  /**
   * 清空所有缓存
   *
   * DELETE /cache/flush
   */
  @Delete('flush')
  @HttpCode(HttpStatus.NO_CONTENT)
  async flush() {
    await this.cacheService.flush();
  }

  /**
   * 删除指定键的缓存
   *
   * DELETE /cache?key=user:123
   */
  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCache(@Query('key') key: string) {
    if (!key) {
      throw new Error('Key parameter is required');
    }
    await this.cacheService.del(key);
  }

  /**
   * 批量删除缓存 (支持通配符)
   *
   * DELETE /cache/pattern?pattern=user:*
   */
  @Delete('pattern')
  async deletePattern(@Query('pattern') pattern: string) {
    if (!pattern) {
      throw new Error('Pattern parameter is required');
    }

    const deletedCount = await this.cacheService.delPattern(pattern);

    return {
      success: true,
      data: {
        pattern,
        deletedCount,
      },
    };
  }

  /**
   * 检查键是否存在
   *
   * GET /cache/exists?key=user:123
   */
  @Get('exists')
  async exists(@Query('key') key: string) {
    if (!key) {
      throw new Error('Key parameter is required');
    }

    const exists = await this.cacheService.exists(key);

    return {
      success: true,
      data: {
        key,
        exists,
      },
    };
  }

  /**
   * 手动触发缓存预热
   *
   * POST /cache/warmup
   *
   * 适用场景：
   * - 系统重启后手动预热
   * - 数据更新后重新缓存
   * - 定时任务触发预热
   */
  @Post('warmup')
  async warmup() {
    await this.cacheWarmupService.manualWarmup();

    return {
      success: true,
      message: 'Cache warmup completed successfully',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 清空缓存并重新预热
   *
   * POST /cache/clear-and-warmup
   *
   * 适用场景：
   * - 权限配置重大变更
   * - 缓存数据损坏需要重建
   */
  @Post('clear-and-warmup')
  async clearAndWarmup() {
    await this.cacheWarmupService.clearAndWarmup();

    return {
      success: true,
      message: 'Cache cleared and warmed up successfully',
      timestamp: new Date().toISOString(),
    };
  }
}
