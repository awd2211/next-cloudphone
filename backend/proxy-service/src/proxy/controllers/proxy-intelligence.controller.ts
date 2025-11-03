import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { RequirePermission } from '../../auth/decorators/permissions.decorator';
import { ProxyIntelligenceService } from '../services/proxy-intelligence.service';
import { ProxyQualityService } from '../services/proxy-quality.service';
import { ProxyFailoverService } from '../services/proxy-failover.service';
import {
  RecommendProxyDto,
  ProxyRecommendationResponseDto,
  QualityScoreResponseDto,
  FailoverConfigDto,
  ApiResponse as ProxyApiResponse,
} from '../dto';

/**
 * 代理智能化控制器
 *
 * 提供智能推荐、质量评分、故障切换等高级功能
 */
@ApiTags('Proxy Intelligence')
@Controller('proxy')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class ProxyIntelligenceController {
  constructor(
    private readonly intelligenceService: ProxyIntelligenceService,
    private readonly qualityService: ProxyQualityService,
    private readonly failoverService: ProxyFailoverService,
  ) {}

  /**
   * 智能代理推荐
   *
   * 基于目标网站、历史数据、设备特征等因素，智能推荐最佳代理
   */
  @Post('recommend')
  @RequirePermission('proxy:recommend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '智能代理推荐',
    description: '基于ML算法，综合考虑成功率、延迟、成本等因素推荐最佳代理',
  })
  @ApiResponse({
    status: 200,
    description: '推荐成功',
    type: ProxyRecommendationResponseDto,
  })
  async recommendProxy(
    @Body() dto: RecommendProxyDto,
  ): Promise<ProxyApiResponse<ProxyRecommendationResponseDto>> {
    const recommendation = await this.intelligenceService.recommendProxy(dto);
    return ProxyApiResponse.success(recommendation);
  }

  /**
   * 批量推荐代理
   */
  @Post('recommend/batch')
  @RequirePermission('proxy:recommend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '批量推荐代理',
    description: '一次为多个设备推荐代理',
  })
  async recommendBatch(
    @Body() dto: { devices: RecommendProxyDto[] },
  ): Promise<ProxyApiResponse<ProxyRecommendationResponseDto[]>> {
    const recommendations = await this.intelligenceService.recommendBatch(
      dto.devices,
    );
    return ProxyApiResponse.success(recommendations);
  }

  /**
   * 获取代理质量评分
   */
  @Get(':proxyId/quality-score')
  @RequirePermission('proxy:read')
  @ApiOperation({
    summary: '获取代理质量评分',
    description: '查看代理的综合质量分、各项指标、健康状态和趋势',
  })
  @ApiResponse({
    status: 200,
    description: '查询成功',
    type: QualityScoreResponseDto,
  })
  async getQualityScore(
    @Param('proxyId') proxyId: string,
  ): Promise<ProxyApiResponse<QualityScoreResponseDto>> {
    const score = await this.qualityService.getQualityScore(proxyId);
    return ProxyApiResponse.success(score);
  }

  /**
   * 批量查询质量评分
   */
  @Post('quality/batch')
  @RequirePermission('proxy:read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '批量查询质量评分' })
  async getQualityScoreBatch(
    @Body() dto: { proxyIds: string[] },
  ): Promise<ProxyApiResponse<QualityScoreResponseDto[]>> {
    const scores = await this.qualityService.getQualityScoreBatch(
      dto.proxyIds,
    );
    return ProxyApiResponse.success(scores);
  }

  /**
   * 获取质量分布统计
   */
  @Get('quality/distribution')
  @RequirePermission('proxy:stats')
  @ApiOperation({
    summary: '质量分布统计',
    description: '查看代理池的质量分布情况（S/A/B/C/D各等级数量）',
  })
  async getQualityDistribution(): Promise<
    ProxyApiResponse<{
      distribution: Record<string, number>;
      avgScore: number;
      healthy: number;
      degraded: number;
      unhealthy: number;
    }>
  > {
    const distribution = await this.qualityService.getQualityDistribution();
    return ProxyApiResponse.success(distribution);
  }

  /**
   * 触发质量评分计算
   */
  @Post('quality/calculate')
  @RequirePermission('proxy:admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '触发质量评分计算',
    description: '立即计算所有代理的质量评分（管理员操作）',
  })
  async triggerQualityCalculation(): Promise<
    ProxyApiResponse<{ calculated: number; duration: number }>
  > {
    const startTime = Date.now();
    const count = await this.qualityService.calculateAllQualityScores();
    const duration = Date.now() - startTime;

    return ProxyApiResponse.success({
      calculated: count,
      duration,
    });
  }

  /**
   * 配置故障切换策略
   */
  @Post('failover/config')
  @RequirePermission('proxy:config')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '配置故障切换策略',
    description: '设置自动故障切换的策略和参数',
  })
  async configureFailover(
    @Body() dto: FailoverConfigDto,
  ): Promise<ProxyApiResponse<{ configured: boolean }>> {
    await this.failoverService.configureFailover(dto);
    return ProxyApiResponse.success({ configured: true });
  }

  /**
   * 获取故障切换配置
   */
  @Get('failover/config')
  @RequirePermission('proxy:config')
  @ApiOperation({ summary: '查看故障切换配置' })
  async getFailoverConfig(
    @Query('userId') userId?: string,
    @Query('deviceId') deviceId?: string,
  ): Promise<ProxyApiResponse<FailoverConfigDto>> {
    const config = await this.failoverService.getFailoverConfig(
      userId,
      deviceId,
    );
    return ProxyApiResponse.success(config);
  }

  /**
   * 手动触发故障切换
   */
  @Post('sessions/:sessionId/failover')
  @RequirePermission('proxy:failover')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '手动触发故障切换',
    description: '强制切换当前会话的代理',
  })
  async triggerFailover(
    @Param('sessionId') sessionId: string,
    @Body() dto?: { reason?: string },
  ): Promise<
    ProxyApiResponse<{
      switched: boolean;
      oldProxyId: string;
      newProxyId: string;
      duration: number;
    }>
  > {
    const result = await this.failoverService.executeFailover(
      sessionId,
      dto?.reason,
    );
    return ProxyApiResponse.success(result);
  }

  /**
   * 故障切换历史
   */
  @Get('failover/history')
  @RequirePermission('proxy:read')
  @ApiOperation({ summary: '查看故障切换历史' })
  async getFailoverHistory(
    @Query('sessionId') sessionId?: string,
    @Query('deviceId') deviceId?: string,
    @Query('limit') limit: number = 50,
  ): Promise<ProxyApiResponse<any[]>> {
    const history = await this.failoverService.getFailoverHistory({
      sessionId,
      deviceId,
      limit,
    });
    return ProxyApiResponse.success(history);
  }

  /**
   * 获取目标网站的最佳代理映射
   */
  @Get('website-mapping/:domain')
  @RequirePermission('proxy:read')
  @ApiOperation({
    summary: '查询网站代理映射',
    description: '查看特定网站的最佳代理推荐',
  })
  async getWebsiteMapping(
    @Param('domain') domain: string,
  ): Promise<
    ProxyApiResponse<{
      domain: string;
      bestProxies: any[];
      successRate: number;
      avgLatency: number;
    }>
  > {
    const mapping = await this.intelligenceService.getWebsiteMapping(domain);
    return ProxyApiResponse.success(mapping);
  }

  /**
   * 设备代理亲和性查询
   */
  @Get('affinity/:deviceId')
  @RequirePermission('proxy:read')
  @ApiOperation({
    summary: '查询设备代理亲和性',
    description: '查看设备最常用、表现最好的代理',
  })
  async getDeviceAffinity(
    @Param('deviceId') deviceId: string,
  ): Promise<
    ProxyApiResponse<{
      deviceId: string;
      preferredProxies: any[];
      totalUsage: number;
      avgSuccessRate: number;
    }>
  > {
    const affinity = await this.intelligenceService.getDeviceAffinity(
      deviceId,
    );
    return ProxyApiResponse.success(affinity);
  }
}
