import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { StateRecoveryService, StateRecoveryConfig } from './state-recovery.service';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/permissions.decorator';

@ApiTags('state-recovery')
@ApiBearerAuth()
@Controller('state-recovery')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class StateRecoveryController {
  constructor(private readonly stateRecoveryService: StateRecoveryService) {}

  /**
   * 获取状态恢复配置
   */
  @Get('config')
  @RequirePermission('device.read')
  @ApiOperation({
    summary: '获取状态恢复配置',
    description: '获取当前状态恢复和回滚的配置',
  })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async getConfig() {
    const config = this.stateRecoveryService.getConfig();
    return {
      success: true,
      data: config,
    };
  }

  /**
   * 更新状态恢复配置
   */
  @Put('config')
  @RequirePermission('device.manage')
  @ApiOperation({
    summary: '更新状态恢复配置',
    description: '动态更新状态恢复的配置参数（管理员权限）',
  })
  @ApiResponse({ status: 200, description: '配置更新成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async updateConfig(@Body() updates: Partial<StateRecoveryConfig>) {
    this.stateRecoveryService.updateConfig(updates);
    const config = this.stateRecoveryService.getConfig();
    return {
      success: true,
      data: config,
      message: '状态恢复配置已更新',
    };
  }

  /**
   * 获取状态恢复统计
   */
  @Get('statistics')
  @RequirePermission('device.read')
  @ApiOperation({
    summary: '获取状态恢复统计',
    description: '获取状态一致性检查和回滚的统计信息',
  })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async getStatistics() {
    const stats = this.stateRecoveryService.getStatistics();
    return {
      success: true,
      data: stats,
    };
  }

  /**
   * 获取不一致历史
   */
  @Get('inconsistencies/history')
  @RequirePermission('device.read')
  @ApiOperation({
    summary: '获取不一致历史',
    description: '获取检测到的状态不一致历史记录',
  })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async getInconsistencyHistory() {
    const history = this.stateRecoveryService.getInconsistencyHistory();
    return {
      success: true,
      data: history,
    };
  }

  /**
   * 获取操作历史
   */
  @Get('operations/history')
  @RequirePermission('device.read')
  @ApiOperation({
    summary: '获取操作历史',
    description: '获取可回滚的操作历史记录',
  })
  @ApiQuery({
    name: 'entityId',
    required: false,
    description: '实体ID（可选）',
  })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async getOperationHistory(@Query('entityId') entityId?: string) {
    const history = this.stateRecoveryService.getOperationHistory(entityId);
    return {
      success: true,
      data: history,
    };
  }

  /**
   * 手动触发一致性检查
   */
  @Post('check')
  @RequirePermission('device.manage')
  @ApiOperation({
    summary: '手动触发一致性检查',
    description: '立即执行状态一致性检查（管理员权限）',
  })
  @ApiResponse({ status: 200, description: '一致性检查已执行' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async triggerConsistencyCheck() {
    await this.stateRecoveryService.performConsistencyCheck();
    return {
      success: true,
      message: '状态一致性检查已执行',
    };
  }

  /**
   * 回滚操作
   */
  @Post('rollback/:operationId')
  @RequirePermission('device.manage')
  @ApiOperation({
    summary: '回滚操作',
    description: '回滚指定的操作到之前的状态（管理员权限）',
  })
  @ApiResponse({ status: 200, description: '回滚成功' })
  @ApiResponse({ status: 400, description: '操作不可回滚' })
  @ApiResponse({ status: 403, description: '权限不足' })
  @ApiResponse({ status: 404, description: '操作不存在' })
  async rollbackOperation(@Param('operationId') operationId: string) {
    const result = await this.stateRecoveryService.rollbackOperation(operationId);
    return {
      success: result.success,
      data: result,
      message: result.success
        ? `操作 ${operationId} 已成功回滚`
        : `回滚失败: ${result.error}`,
    };
  }
}
