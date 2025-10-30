import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { ServiceAuthGuard } from '@cloudphone/shared';
import { QuotasService, CheckQuotaRequest, DeductQuotaRequest, RestoreQuotaRequest } from './quotas.service';

/**
 * 内部配额 API
 *
 * 仅供其他微服务调用，使用 Service Token 认证
 *
 * @route /internal/quotas
 * @auth ServiceAuthGuard (X-Service-Token header)
 */
@ApiTags('internal/quotas')
@ApiHeader({
  name: 'X-Service-Token',
  description: '服务间认证 Token',
  required: true,
})
@Controller('internal/quotas')
@UseGuards(ServiceAuthGuard) // ✅ 只验证服务 Token
export class QuotasInternalController {
  private readonly logger = new Logger(QuotasInternalController.name);

  constructor(private readonly quotasService: QuotasService) {}

  /**
   * 获取用户配额（内部调用）
   *
   * @description 供 device-service 在创建设备前检查配额使用
   */
  @Get('user/:userId')
  @ApiOperation({
    summary: '获取用户配额（内部）',
    description: '供其他服务调用，查询用户当前配额信息'
  })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 404, description: '未找到配额' })
  @ApiResponse({ status: 401, description: '服务 Token 无效' })
  async getUserQuota(@Param('userId') userId: string) {
    this.logger.debug(`[Internal] 获取用户配额 - userId: ${userId}`);
    return await this.quotasService.getUserQuota(userId);
  }

  /**
   * 检查配额是否充足（内部调用）
   *
   * @description 供 device-service 在创建设备前检查配额
   */
  @Post('check')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '检查配额是否充足（内部）',
    description: '供其他服务调用，检查用户配额是否足够'
  })
  @ApiResponse({ status: 200, description: '检查完成' })
  @ApiResponse({ status: 401, description: '服务 Token 无效' })
  async checkQuota(@Body() request: CheckQuotaRequest) {
    this.logger.debug(
      `[Internal] 检查配额 - userId: ${request.userId}, 类型: ${request.quotaType}, 数量: ${request.requestedAmount}`,
    );
    return await this.quotasService.checkQuota(request);
  }

  /**
   * 扣减配额（内部调用）
   *
   * @description 供 device-service 在设备创建后扣减配额
   */
  @Post('deduct')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '扣减配额（内部）',
    description: '供其他服务调用，扣减用户配额'
  })
  @ApiResponse({ status: 200, description: '扣减成功' })
  @ApiResponse({ status: 404, description: '未找到配额' })
  @ApiResponse({ status: 401, description: '服务 Token 无效' })
  async deductQuota(@Body() request: DeductQuotaRequest) {
    this.logger.log(`[Internal] 扣减配额 - userId: ${request.userId}`);
    return await this.quotasService.deductQuota(request);
  }

  /**
   * 恢复配额（内部调用）
   *
   * @description 供 device-service 在设备删除后恢复配额
   */
  @Post('restore')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '恢复配额（内部）',
    description: '供其他服务调用，恢复用户配额'
  })
  @ApiResponse({ status: 200, description: '恢复成功' })
  @ApiResponse({ status: 401, description: '服务 Token 无效' })
  async restoreQuota(@Body() request: RestoreQuotaRequest) {
    this.logger.log(`[Internal] 恢复配额 - userId: ${request.userId}`);
    return await this.quotasService.restoreQuota(request);
  }

  /**
   * 上报设备用量（内部调用）
   *
   * @description 供 device-service 调用，用于增加或减少用户配额使用量
   */
  @Post('user/:userId/usage')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '上报设备用量（内部）',
    description: '供 device-service 调用，上报设备创建/删除时的资源使用变化',
  })
  @ApiResponse({ status: 200, description: '用量已更新' })
  @ApiResponse({ status: 404, description: '未找到配额' })
  @ApiResponse({ status: 401, description: '服务 Token 无效' })
  async reportDeviceUsage(
    @Param('userId') userId: string,
    @Body()
    usageReport: {
      deviceId: string;
      cpuCores: number;
      memoryGB: number;
      storageGB: number;
      operation: 'increment' | 'decrement';
    },
  ) {
    this.logger.log(
      `[Internal] 上报用量 - userId: ${userId}, 操作: ${usageReport.operation}, 设备: ${usageReport.deviceId}`,
    );

    if (usageReport.operation === 'increment') {
      // 设备创建，扣减配额
      return await this.quotasService.deductQuota({
        userId,
        deviceCount: 1,
        cpuCores: usageReport.cpuCores,
        memoryGB: usageReport.memoryGB,
        storageGB: usageReport.storageGB,
      });
    } else {
      // 设备删除，恢复配额
      return await this.quotasService.restoreQuota({
        userId,
        deviceCount: 1,
        cpuCores: usageReport.cpuCores,
        memoryGB: usageReport.memoryGB,
        storageGB: usageReport.storageGB,
      });
    }
  }

  /**
   * 批量检查配额（内部调用）
   *
   * @description 供其他服务批量检查多个用户的配额
   */
  @Post('check/batch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '批量检查配额（内部）',
    description: '供其他服务调用，批量检查多个用户的配额'
  })
  @ApiResponse({ status: 200, description: '检查完成' })
  @ApiResponse({ status: 401, description: '服务 Token 无效' })
  async batchCheckQuota(@Body() requests: CheckQuotaRequest[]) {
    this.logger.debug(`[Internal] 批量检查配额 - 数量: ${requests.length}`);

    const results = await Promise.all(
      requests.map((req) => this.quotasService.checkQuota(req)),
    );

    return {
      total: results.length,
      allowed: results.filter((r) => r.allowed).length,
      denied: results.filter((r) => !r.allowed).length,
      results,
    };
  }

  /**
   * 获取用户使用统计（内部调用）
   *
   * @description 供其他服务查询用户资源使用情况
   */
  @Get('usage-stats/:userId')
  @ApiOperation({
    summary: '获取用户使用统计（内部）',
    description: '供其他服务调用，查询用户资源使用统计'
  })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 401, description: '服务 Token 无效' })
  async getUsageStats(@Param('userId') userId: string) {
    this.logger.debug(`[Internal] 获取使用统计 - userId: ${userId}`);
    return await this.quotasService.getUsageStats(userId);
  }
}
