import { Controller, Get, Delete, HttpCode, HttpStatus } from '@nestjs/common';
import { permissionL1Cache } from '../auth/permission-l1-cache';

/**
 * API Gateway 缓存管理控制器
 *
 * 提供 L1 缓存统计和管理
 */
@Controller('cache')
export class CacheController {
  /**
   * 获取 L1 缓存统计信息
   *
   * GET /cache/stats
   */
  @Get('stats')
  getStats() {
    return {
      data: {
        l1: permissionL1Cache.getStats(),
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 重置 L1 缓存统计
   *
   * DELETE /cache/stats
   */
  @Delete('stats')
  @HttpCode(HttpStatus.NO_CONTENT)
  resetStats() {
    permissionL1Cache.resetStats();
  }

  /**
   * 清空 L1 缓存
   *
   * DELETE /cache/flush
   */
  @Delete('flush')
  @HttpCode(HttpStatus.NO_CONTENT)
  flush() {
    permissionL1Cache.clear();
  }
}
