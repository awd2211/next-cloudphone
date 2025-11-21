import { Controller, Get, Post, Put, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { FailoverService, FailoverConfig } from './failover.service';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '@cloudphone/shared';

@ApiTags('failover')
@ApiBearerAuth()
@Controller('failover')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class FailoverController {
  constructor(private readonly failoverService: FailoverService) {}

  /**
   * 获取故障转移配置
   */
  @Get('config')
  @RequirePermission('device.read')
  @ApiOperation({
    summary: '获取故障转移配置',
    description: '获取当前故障转移的配置',
  })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async getConfig() {
    return this.failoverService.getConfig();
  }

  /**
   * 更新故障转移配置
   */
  @Put('config')
  @RequirePermission('device.manage')
  @ApiOperation({
    summary: '更新故障转移配置',
    description: '动态更新故障转移的配置参数（管理员权限）',
  })
  @ApiResponse({ status: 200, description: '配置更新成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async updateConfig(@Body() updates: Partial<FailoverConfig>) {
    this.failoverService.updateConfig(updates);
    const config = this.failoverService.getConfig();
    return {
      ...config,
      message: '故障转移配置已更新',
    };
  }

  /**
   * 获取故障统计
   */
  @Get('statistics')
  @RequirePermission('device.read')
  @ApiOperation({
    summary: '获取故障统计',
    description: '获取故障检测和迁移的统计信息',
  })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async getStatistics() {
    return this.failoverService.getStatistics();
  }

  /**
   * 获取故障历史
   */
  @Get('failures/history')
  @RequirePermission('device.read')
  @ApiOperation({
    summary: '获取故障历史',
    description: '获取所有设备的故障历史记录',
  })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async getFailureHistory() {
    const history = this.failoverService.getFailureHistory();

    // 将 Map 转换为对象
    const historyObject: Record<string, any> = {};
    history.forEach((failures, deviceId) => {
      historyObject[deviceId] = failures;
    });

    return historyObject;
  }

  /**
   * 获取设备的故障历史
   */
  @Get('failures/device/:deviceId')
  @RequirePermission('device.read')
  @ApiOperation({
    summary: '获取设备的故障历史',
    description: '获取指定设备的故障历史记录',
  })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  @ApiResponse({ status: 404, description: '设备不存在' })
  async getDeviceFailureHistory(@Param('deviceId') deviceId: string) {
    const history = this.failoverService.getFailureHistory(deviceId);

    const failures = history.get(deviceId) || [];

    return {
      deviceId,
      failures,
    };
  }

  /**
   * 获取迁移历史
   */
  @Get('migrations/history')
  @RequirePermission('device.read')
  @ApiOperation({
    summary: '获取迁移历史',
    description: '获取最近的设备迁移历史记录',
  })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async getMigrationHistory() {
    return this.failoverService.getMigrationHistory();
  }

  /**
   * 手动触发故障检测
   */
  @Post('detect')
  @RequirePermission('device.manage')
  @ApiOperation({
    summary: '手动触发故障检测',
    description: '立即执行故障检测和恢复（管理员权限）',
  })
  @ApiResponse({ status: 200, description: '故障检测已执行' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async triggerDetection() {
    await this.failoverService.detectAndRecoverFailures();
    return {
      message: '故障检测和恢复任务已执行',
    };
  }

  /**
   * 手动触发设备恢复
   */
  @Post('recover/:deviceId')
  @RequirePermission('device.manage')
  @ApiOperation({
    summary: '手动触发设备恢复',
    description: '立即尝试恢复指定设备（管理员权限）',
  })
  @ApiResponse({ status: 200, description: '恢复任务已执行' })
  @ApiResponse({ status: 403, description: '权限不足' })
  @ApiResponse({ status: 404, description: '设备不存在' })
  async triggerRecovery(@Param('deviceId') deviceId: string) {
    const result = await this.failoverService.triggerManualRecovery(deviceId);
    return {
      ...result,
      message: result.success
        ? `设备 ${deviceId} 恢复成功`
        : `设备 ${deviceId} 恢复失败: ${result.error}`,
    };
  }
}
