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
  @ApiOperation({ summary: '获取配额告警列表' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getQuotaAlerts(@Query('threshold') threshold: number = 80) {
    // 该功能需要扫描所有配额，仅管理员可访问
    // 返回使用率超过阈值的配额列表
    return {
      message: '配额告警功能待实现',
      threshold,
    };
  }
}
