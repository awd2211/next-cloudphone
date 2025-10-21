import { Controller, Get, Delete, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { CacheService } from './cache.service';

/**
 * 缓存管理控制器
 *
 * 提供缓存统计、管理等接口
 */
@Controller('cache')
export class CacheController {
  constructor(private readonly cacheService: CacheService) {}

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
}
