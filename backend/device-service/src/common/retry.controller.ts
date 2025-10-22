import { Controller, Get, Post, Param, UseGuards, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RetryService } from './retry.service';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/permissions.decorator';

@ApiTags('retry')
@ApiBearerAuth()
@Controller('retry')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class RetryController {
  constructor(private readonly retryService: RetryService) {}

  /**
   * 获取重试统计摘要
   */
  @Get('statistics/summary')
  @RequirePermission('device.read')
  @ApiOperation({
    summary: '获取重试统计摘要',
    description: '获取所有操作的重试统计摘要',
  })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async getStatisticsSummary() {
    const summary = this.retryService.getStatisticsSummary();
    return {
      success: true,
      data: summary,
    };
  }

  /**
   * 获取特定操作的重试统计
   */
  @Get('statistics')
  @RequirePermission('device.read')
  @ApiOperation({
    summary: '获取重试统计',
    description: '获取特定操作或所有操作的重试统计',
  })
  @ApiQuery({
    name: 'operation',
    required: false,
    description: '操作名称（可选）',
  })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async getStatistics(@Query('operation') operation?: string) {
    const stats = this.retryService.getStatistics(operation);

    if (operation) {
      return {
        success: true,
        data: {
          operation,
          statistics: stats,
        },
      };
    }

    // 将 Map 转换为对象以便 JSON 序列化
    const statsObject: Record<string, any> = {};
    (stats as Map<string, any>).forEach((value, key) => {
      statsObject[key] = value;
    });

    return {
      success: true,
      data: {
        operations: Object.keys(statsObject).length,
        statistics: statsObject,
      },
    };
  }

  /**
   * 重置重试统计
   */
  @Post('statistics/reset')
  @RequirePermission('device.manage')
  @ApiOperation({
    summary: '重置重试统计',
    description: '重置特定操作或所有操作的重试统计（管理员权限）',
  })
  @ApiQuery({
    name: 'operation',
    required: false,
    description: '操作名称（可选，不提供则重置所有）',
  })
  @ApiResponse({ status: 200, description: '重置成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async resetStatistics(@Query('operation') operation?: string) {
    this.retryService.resetStatistics(operation);
    return {
      success: true,
      message: operation
        ? `已重置操作 "${operation}" 的重试统计`
        : '已重置所有操作的重试统计',
    };
  }
}
