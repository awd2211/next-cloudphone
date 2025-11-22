import { Controller, Get, Post, Put, Body, Param, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { StateRecoveryService, StateRecoveryConfig } from './state-recovery.service';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '@cloudphone/shared';

@ApiTags('state-recovery')
@ApiBearerAuth()
@Controller('state-recovery')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class StateRecoveryController {
  constructor(private readonly stateRecoveryService: StateRecoveryService) {}

  /**
   * 获取状态恢复记录列表
   * 根路径必须放在最前面
   */
  @Get()
  @RequirePermission('device.read')
  @ApiOperation({
    summary: '获取状态恢复记录列表',
    description: '分页获取状态恢复操作记录',
  })
  @ApiQuery({ name: 'status', required: false, description: '状态过滤' })
  @ApiQuery({ name: 'deviceId', required: false, description: '设备ID过滤' })
  @ApiQuery({ name: 'page', required: false, description: '页码', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: '每页数量', example: 10 })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async getRecoveryRecords(
    @Query('status') status?: string,
    @Query('deviceId') deviceId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.stateRecoveryService.getRecoveryRecords({
      status,
      deviceId,
      page: page || 1,
      limit: limit || 10,
    });
  }

  /**
   * 获取设备状态概览
   * 必须放在其他 GET 路由之前，避免被参数路由匹配
   */
  @Get('device-states')
  @RequirePermission('device.read')
  @ApiOperation({
    summary: '获取设备状态概览',
    description: '获取设备状态的统计概览（总数、一致、不一致、恢复中）',
  })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async getDeviceStates() {
    return this.stateRecoveryService.getDeviceStates();
  }

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
    return this.stateRecoveryService.getConfig();
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
      ...config,
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
    return this.stateRecoveryService.getStatistics();
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
    return this.stateRecoveryService.getInconsistencyHistory();
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
    return this.stateRecoveryService.getOperationHistory(entityId);
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
      message: '状态一致性检查已执行',
    };
  }

  /**
   * 触发设备状态恢复
   */
  @Post('recover')
  @RequirePermission('device.manage')
  @ApiOperation({
    summary: '触发设备状态恢复',
    description: '将指定设备恢复到目标状态（管理员权限）',
  })
  @ApiResponse({ status: 200, description: '状态恢复已触发' })
  @ApiResponse({ status: 400, description: '参数错误' })
  @ApiResponse({ status: 403, description: '权限不足' })
  @ApiResponse({ status: 404, description: '设备不存在' })
  async recoverDevice(@Body() body: { deviceId: string; targetState: string }) {
    const result = await this.stateRecoveryService.recoverDeviceState(body.deviceId, body.targetState);
    return {
      ...result,
      message: result.success ? `设备 ${body.deviceId} 状态恢复已触发` : `状态恢复失败: ${result.error}`,
    };
  }

  /**
   * 批量修复不一致
   */
  @Post('fix-inconsistencies')
  @RequirePermission('device.manage')
  @ApiOperation({
    summary: '批量修复不一致',
    description: '自动修复所有检测到的状态不一致（管理员权限）',
  })
  @ApiResponse({ status: 200, description: '修复已触发' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async fixInconsistencies() {
    const result = await this.stateRecoveryService.fixAllInconsistencies();
    return {
      ...result,
      message: `已修复 ${result.fixed} 个不一致，${result.failed} 个失败`,
    };
  }

  /**
   * 验证所有设备一致性
   */
  @Post('validate-all')
  @RequirePermission('device.manage')
  @ApiOperation({
    summary: '验证所有设备一致性',
    description: '检查所有设备的状态一致性并返回不一致列表',
  })
  @ApiResponse({ status: 200, description: '验证完成' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async validateAll() {
    return await this.stateRecoveryService.validateAllDevices();
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
      ...result,
      message: result.success ? `操作 ${operationId} 已成功回滚` : `回滚失败: ${result.error}`,
    };
  }
}
