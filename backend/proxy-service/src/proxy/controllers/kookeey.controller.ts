import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { KookeeyService } from '../services/kookeey.service';
import {
  KookeeyBalanceDto,
  KookeeyStockDto,
  KookeeyProxyListDto,
  KookeeyExtractProxyDto,
  KookeeyOrderListDto,
  KookeeyUsageStatsDto,
} from '../dto/kookeey.dto';

/**
 * Kookeey 代理服务控制器
 *
 * 提供 Kookeey 代理供应商的管理接口
 */
@ApiTags('Proxy - Kookeey')
@Controller('proxy/kookeey')
// @UseGuards(JwtAuthGuard) // 如果需要认证，取消注释
@ApiBearerAuth()
export class KookeeyController {
  private readonly logger = new Logger(KookeeyController.name);

  constructor(private readonly kookeeyService: KookeeyService) {}

  /**
   * 获取账户余额
   */
  @Get(':providerId/balance')
  @ApiOperation({
    summary: '获取账户余额',
    description: '查询 Kookeey 账户余额和剩余流量',
  })
  @ApiResponse({ status: 200, description: '成功', type: KookeeyBalanceDto })
  @ApiResponse({ status: 404, description: '提供商不存在' })
  async getBalance(@Param('providerId') providerId: string): Promise<KookeeyBalanceDto> {
    this.logger.log(`Getting balance for provider ${providerId}`);
    return this.kookeeyService.getBalance(providerId);
  }

  /**
   * 获取库存信息
   */
  @Get(':providerId/stock/:groupId')
  @ApiOperation({
    summary: '获取库存信息',
    description: '查询指定分组的代理库存',
  })
  @ApiResponse({ status: 200, description: '成功', type: KookeeyStockDto })
  @ApiResponse({ status: 404, description: '提供商不存在' })
  async getStock(
    @Param('providerId') providerId: string,
    @Param('groupId') groupId: number,
  ): Promise<KookeeyStockDto> {
    this.logger.log(`Getting stock for provider ${providerId}, group ${groupId}`);
    return this.kookeeyService.getStock(providerId, groupId);
  }

  /**
   * 提取代理
   */
  @Post(':providerId/extract')
  @ApiOperation({
    summary: '提取代理',
    description: '从 Kookeey 提取指定数量和地区的代理 IP',
  })
  @ApiResponse({ status: 200, description: '成功', type: KookeeyProxyListDto })
  @ApiResponse({ status: 400, description: '参数错误' })
  @ApiResponse({ status: 404, description: '提供商不存在' })
  async extractProxies(
    @Param('providerId') providerId: string,
    @Body() dto: KookeeyExtractProxyDto,
  ): Promise<KookeeyProxyListDto> {
    this.logger.log(
      `Extracting ${dto.num || 1} proxies for provider ${providerId}, group ${dto.groupId}`,
    );
    return this.kookeeyService.extractProxies(
      providerId,
      dto.groupId,
      dto.num,
      dto.country,
      dto.state,
      dto.city,
      dto.duration,
    );
  }

  /**
   * 获取订单列表
   */
  @Get(':providerId/orders')
  @ApiOperation({
    summary: '获取订单列表',
    description: '查询 Kookeey 订单列表',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: '页码', example: 1 })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: '每页数量',
    example: 10,
  })
  @ApiResponse({ status: 200, description: '成功', type: KookeeyOrderListDto })
  @ApiResponse({ status: 404, description: '提供商不存在' })
  async getOrders(
    @Param('providerId') providerId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ): Promise<KookeeyOrderListDto> {
    this.logger.log(`Getting orders for provider ${providerId}, page ${page}, limit ${limit}`);
    return this.kookeeyService.getOrders(providerId, page, limit);
  }

  /**
   * 获取使用统计
   */
  @Get(':providerId/usage')
  @ApiOperation({
    summary: '获取使用统计',
    description: '查询指定时间段的代理使用统计',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: '开始日期 (ISO 8601)',
    example: '2025-01-01T00:00:00Z',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: '结束日期 (ISO 8601)',
    example: '2025-01-31T23:59:59Z',
  })
  @ApiResponse({ status: 200, description: '成功', type: KookeeyUsageStatsDto })
  @ApiResponse({ status: 404, description: '提供商不存在' })
  async getUsageStats(
    @Param('providerId') providerId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<KookeeyUsageStatsDto> {
    this.logger.log(`Getting usage stats for provider ${providerId}`);

    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    return this.kookeeyService.getUsageStats(providerId, start, end);
  }

  /**
   * 获取可用地区列表
   */
  @Get(':providerId/regions')
  @ApiOperation({
    summary: '获取可用地区列表',
    description: '查询 Kookeey 支持的所有国家和地区',
  })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiResponse({ status: 404, description: '提供商不存在' })
  async getAvailableRegions(@Param('providerId') providerId: string): Promise<any[]> {
    this.logger.log(`Getting available regions for provider ${providerId}`);
    return this.kookeeyService.getAvailableRegions(providerId);
  }
}
