import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { QuotasService, CreateQuotaDto, UpdateQuotaDto, CheckQuotaRequest, DeductQuotaRequest, RestoreQuotaRequest } from './quotas.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { QuotaType } from '../entities/quota.entity';

@ApiTags('quotas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('quotas')
export class QuotasController {
  private readonly logger = new Logger(QuotasController.name);

  constructor(private readonly quotasService: QuotasService) {}

  /**
   * 创建用户配额
   */
  @Post()
  @Roles('admin')
  @ApiOperation({ summary: '创建用户配额' })
  @ApiResponse({ status: 201, description: '配额创建成功' })
  @ApiResponse({ status: 400, description: '用户已有活跃配额' })
  async createQuota(@Body() dto: CreateQuotaDto) {
    this.logger.log(`创建配额 - 用户: ${dto.userId}`);
    return await this.quotasService.createQuota(dto);
  }

  /**
   * 获取用户配额
   */
  @Get('user/:userId')
  @ApiOperation({ summary: '获取用户配额' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 404, description: '未找到配额' })
  async getUserQuota(@Param('userId') userId: string) {
    return await this.quotasService.getUserQuota(userId);
  }

  /**
   * 检查配额是否充足
   */
  @Post('check')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '检查配额是否充足' })
  @ApiResponse({ status: 200, description: '检查完成' })
  async checkQuota(@Body() request: CheckQuotaRequest) {
    this.logger.debug(
      `检查配额 - 用户: ${request.userId}, 类型: ${request.quotaType}, 数量: ${request.requestedAmount}`,
    );
    return await this.quotasService.checkQuota(request);
  }

  /**
   * 扣减配额
   */
  @Post('deduct')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '扣减配额' })
  @ApiResponse({ status: 200, description: '扣减成功' })
  @ApiResponse({ status: 404, description: '未找到配额' })
  async deductQuota(@Body() request: DeductQuotaRequest) {
    this.logger.log(`扣减配额 - 用户: ${request.userId}`);
    return await this.quotasService.deductQuota(request);
  }

  /**
   * 恢复配额
   */
  @Post('restore')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '恢复配额' })
  @ApiResponse({ status: 200, description: '恢复成功' })
  async restoreQuota(@Body() request: RestoreQuotaRequest) {
    this.logger.log(`恢复配额 - 用户: ${request.userId}`);
    return await this.quotasService.restoreQuota(request);
  }

  /**
   * 更新配额
   */
  @Put(':id')
  @Roles('admin')
  @ApiOperation({ summary: '更新配额' })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 404, description: '未找到配额' })
  async updateQuota(
    @Param('id') id: string,
    @Body() dto: UpdateQuotaDto,
  ) {
    this.logger.log(`更新配额 - ID: ${id}`);
    return await this.quotasService.updateQuota(id, dto);
  }

  /**
   * 上报设备用量（由 device-service 调用）
   */
  @Post('user/:userId/usage')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '上报设备用量',
    description: '由 device-service 调用，用于增加或减少用户配额使用量',
  })
  @ApiResponse({ status: 200, description: '用量已更新' })
  @ApiResponse({ status: 404, description: '未找到配额' })
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
      `上报用量 - 用户: ${userId}, 操作: ${usageReport.operation}, 设备: ${usageReport.deviceId}`,
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
   * 获取用户使用统计
   */
  @Get('usage-stats/:userId')
  @ApiOperation({ summary: '获取用户使用统计' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getUsageStats(@Param('userId') userId: string) {
    return await this.quotasService.getUsageStats(userId);
  }

  /**
   * 批量检查配额
   */
  @Post('check/batch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '批量检查配额' })
  @ApiResponse({ status: 200, description: '检查完成' })
  async batchCheckQuota(@Body() requests: CheckQuotaRequest[]) {
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
   * 获取配额告警列表
   */
  @Get('alerts')
  @Roles('admin')
  @ApiOperation({ summary: '获取配额告警列表（管理员）' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getQuotaAlerts(@Query('threshold') threshold: number = 80) {
    this.logger.log(`获取配额告警 - 阈值: ${threshold}%`);
    return await this.quotasService.getQuotaAlerts(threshold);
  }
}
