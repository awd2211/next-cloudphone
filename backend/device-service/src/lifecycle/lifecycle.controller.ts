import { Controller, Get, Post, Put, Body, UseGuards, Param } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { LifecycleService } from './lifecycle.service';
import { AutoScalingService, AutoScalingConfig } from './autoscaling.service';
import {
  BackupExpirationService,
  BackupScheduleConfig,
} from './backup-expiration.service';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { User } from '../auth/decorators/user.decorator';

@ApiTags('lifecycle')
@ApiBearerAuth()
@Controller('lifecycle')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class LifecycleController {
  constructor(
    private readonly lifecycleService: LifecycleService,
    private readonly autoScalingService: AutoScalingService,
    private readonly backupExpirationService: BackupExpirationService,
  ) {}

  /**
   * 手动触发清理任务
   */
  @Post('cleanup')
  @RequirePermission('device.manage')
  @ApiOperation({
    summary: '手动触发清理任务',
    description: '立即执行设备清理任务（管理员权限）',
  })
  @ApiResponse({ status: 200, description: '清理任务已执行' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async triggerCleanup() {
    const result = await this.lifecycleService.triggerManualCleanup();
    return {
      success: true,
      data: result,
      message: `清理完成: 共清理 ${result.totalCleaned} 项`,
    };
  }

  /**
   * 获取清理统计
   */
  @Get('cleanup/statistics')
  @RequirePermission('device.read')
  @ApiOperation({
    summary: '获取清理统计',
    description: '获取待清理设备的统计信息',
  })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async getCleanupStatistics() {
    const stats = await this.lifecycleService.getCleanupStatistics();
    return {
      success: true,
      data: stats,
    };
  }

  /**
   * 获取自动扩缩容状态
   */
  @Get('autoscaling/status')
  @RequirePermission('device.read')
  @ApiOperation({
    summary: '获取自动扩缩容状态',
    description: '获取当前自动扩缩容的状态和配置',
  })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async getAutoscalingStatus() {
    const status = await this.autoScalingService.getStatus();
    const config = this.autoScalingService.getConfig();
    return {
      success: true,
      data: {
        status,
        config,
      },
    };
  }

  /**
   * 获取扩缩容历史
   */
  @Get('autoscaling/history')
  @RequirePermission('device.read')
  @ApiOperation({
    summary: '获取扩缩容历史',
    description: '获取最近的扩缩容决策历史',
  })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async getAutoscalingHistory() {
    const history = this.autoScalingService.getScalingHistory();
    return {
      success: true,
      data: history,
    };
  }

  /**
   * 手动触发扩缩容检查
   */
  @Post('autoscaling/trigger')
  @RequirePermission('device.manage')
  @ApiOperation({
    summary: '手动触发扩缩容检查',
    description: '立即执行扩缩容检查和决策（管理员权限）',
  })
  @ApiResponse({ status: 200, description: '扩缩容检查已执行' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async triggerAutoscaling() {
    const result = await this.autoScalingService.triggerManualScaling();
    return {
      success: result.success,
      data: result,
      message: `扩缩容${result.action === 'no_action' ? '无需调整' : '已执行'}`,
    };
  }

  /**
   * 更新自动扩缩容配置
   */
  @Put('autoscaling/config')
  @RequirePermission('device.manage')
  @ApiOperation({
    summary: '更新自动扩缩容配置',
    description: '动态更新自动扩缩容的配置参数（管理员权限）',
  })
  @ApiResponse({ status: 200, description: '配置更新成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async updateAutoscalingConfig(@Body() updates: Partial<AutoScalingConfig>) {
    this.autoScalingService.updateConfig(updates);
    const config = this.autoScalingService.getConfig();
    return {
      success: true,
      data: config,
      message: '自动扩缩容配置已更新',
    };
  }

  /**
   * 获取自动备份配置
   */
  @Get('backup/config')
  @RequirePermission('device.read')
  @ApiOperation({
    summary: '获取自动备份配置',
    description: '获取当前自动备份的配置',
  })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async getBackupConfig() {
    const config = this.backupExpirationService.getConfig();
    return {
      success: true,
      data: config,
    };
  }

  /**
   * 更新自动备份配置
   */
  @Put('backup/config')
  @RequirePermission('device.manage')
  @ApiOperation({
    summary: '更新自动备份配置',
    description: '动态更新自动备份的配置参数（管理员权限）',
  })
  @ApiResponse({ status: 200, description: '配置更新成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async updateBackupConfig(@Body() updates: Partial<BackupScheduleConfig>) {
    this.backupExpirationService.updateConfig(updates);
    const config = this.backupExpirationService.getConfig();
    return {
      success: true,
      data: config,
      message: '自动备份配置已更新',
    };
  }

  /**
   * 获取备份统计
   */
  @Get('backup/statistics')
  @RequirePermission('device.read')
  @ApiOperation({
    summary: '获取备份统计',
    description: '获取自动备份的统计信息',
  })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async getBackupStatistics() {
    const stats = await this.backupExpirationService.getBackupStatistics();
    return {
      success: true,
      data: stats,
    };
  }

  /**
   * 手动触发备份任务
   */
  @Post('backup/trigger')
  @RequirePermission('device.manage')
  @ApiOperation({
    summary: '手动触发备份任务',
    description: '立即执行所有需要备份的设备（管理员权限）',
  })
  @ApiResponse({ status: 200, description: '备份任务已执行' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async triggerBackup() {
    const results = await this.backupExpirationService.performScheduledBackups();
    return {
      success: true,
      data: results,
      message: `备份任务已执行: 成功 ${results.filter((r) => r.success).length}/${results.length}`,
    };
  }

  /**
   * 手动触发单个设备备份
   */
  @Post('backup/device/:deviceId')
  @RequirePermission('device.manage')
  @ApiOperation({
    summary: '手动备份指定设备',
    description: '立即为指定设备创建备份（管理员权限）',
  })
  @ApiResponse({ status: 200, description: '备份已创建' })
  @ApiResponse({ status: 403, description: '权限不足' })
  @ApiResponse({ status: 404, description: '设备不存在' })
  async backupDevice(@Param('deviceId') deviceId: string, @User() user: any) {
    const snapshot = await this.backupExpirationService.triggerManualBackup(
      deviceId,
      user.id,
    );
    return {
      success: true,
      data: snapshot,
      message: '设备备份已创建',
    };
  }

  /**
   * 手动触发到期检查
   */
  @Post('expiration/check')
  @RequirePermission('device.manage')
  @ApiOperation({
    summary: '手动触发到期检查',
    description: '立即执行设备和快照的到期检查（管理员权限）',
  })
  @ApiResponse({ status: 200, description: '到期检查已执行' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async checkExpiration() {
    const result = await this.backupExpirationService.triggerManualExpirationCheck();
    return {
      success: true,
      data: result,
      message: `到期检查完成: ${result.devicesExpiring.length} 设备即将到期, ${result.snapshotsExpiring.length} 快照即将到期`,
    };
  }

  /**
   * 手动触发过期备份清理
   */
  @Post('backup/cleanup')
  @RequirePermission('device.manage')
  @ApiOperation({
    summary: '手动触发过期备份清理',
    description: '立即执行过期备份的清理任务（管理员权限）',
  })
  @ApiResponse({ status: 200, description: '清理任务已执行' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async cleanupBackups() {
    const count = await this.backupExpirationService.cleanupOldBackups();
    return {
      success: true,
      data: { cleanedCount: count },
      message: `备份清理完成: 已删除 ${count} 个过期备份`,
    };
  }
}
