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
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { RequirePermission } from '@cloudphone/shared';
import { ProxyProviderRankingService } from '../services/proxy-provider-ranking.service';
import {
  CompareProvidersDto,
  ProviderScoreResponseDto,
  ProviderRankingResponseDto,
  ProviderDetailsResponseDto,
  ProviderComparisonResponseDto,
  ProviderStatisticsResponseDto,
  ApiResponse as ProxyApiResponse,
} from '../dto';

/**
 * 代理提供商排名控制器
 *
 * 提供提供商性能评分、排名和对比功能
 */
@ApiTags('Proxy Provider Ranking')
@Controller('proxy/providers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class ProxyProviderRankingController {
  constructor(
    private readonly providerRankingService: ProxyProviderRankingService,
  ) {}

  /**
   * 获取提供商排名
   * 注意：必须放在 :provider 参数路由之前
   */
  @Get('ranking')
  @RequirePermission('proxy.provider.read')
  @ApiOperation({
    summary: '提供商排名',
    description: '获取所有提供商的排名列表，按总分降序排列',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: '返回数量限制',
  })
  @ApiResponse({
    status: 200,
    description: '查询成功',
    type: [ProviderRankingResponseDto],
  })
  async getProviderRankings(
    @Query('limit') limit?: number,
  ): Promise<ProxyApiResponse<any>> {
    const scores = await this.providerRankingService.getProviderRankings(
      limit ? parseInt(limit.toString()) : undefined,
    );

    // 如果数据库没有评分数据，先触发计算
    if (scores.length === 0) {
      await this.providerRankingService.updateAllProviderScores();
      const updatedScores = await this.providerRankingService.getProviderRankings();
      return ProxyApiResponse.success(this.formatRankingResponse(updatedScores));
    }

    return ProxyApiResponse.success(this.formatRankingResponse(scores));
  }

  /**
   * 格式化排名响应以匹配前端期望的格式
   * 注意：PostgreSQL decimal 类型返回字符串，需要转换为数字以支持前端 .toFixed() 调用
   */
  private formatRankingResponse(scores: any[]): any[] {
    return scores.map((score, index) => ({
      provider: score.provider,
      score: Number(score.totalScore) || 0,
      rank: index + 1,
      qualityScore: Number(score.stabilityScore) || 0,  // 使用稳定性评分作为质量评分
      latencyScore: Number(score.latencyScore) || 0,
      costScore: Number(score.costScore) || 0,
      availabilityScore: Number(score.availabilityScore) || 0,
      totalProxies: Number(score.totalProxies) || 0,
      availableProxies: Number(score.activeProxies) || 0,
      avgQuality: Number(score.avgSuccessRate) || 0,  // 使用成功率作为平均质量
      avgLatency: Number(score.avgLatency) || 0,
      avgCostPerGB: Number(score.avgCostPerGB) || 0,
      successRate: Number(score.avgSuccessRate) || 0,
    }));
  }

  /**
   * 获取提供商统计
   * 注意：必须放在 :provider 参数路由之前
   */
  @Get('statistics')
  @RequirePermission('proxy.provider.stats')
  @ApiOperation({
    summary: '提供商统计',
    description: '获取所有提供商的统计信息',
  })
  @ApiResponse({
    status: 200,
    description: '查询成功',
    type: ProviderStatisticsResponseDto,
  })
  async getProviderStatistics(): Promise<
    ProxyApiResponse<ProviderStatisticsResponseDto>
  > {
    const scores = await this.providerRankingService.getProviderRankings();

    const totalProviders = scores.length;
    const avgTotalScore =
      scores.reduce((sum, s) => sum + s.totalScore, 0) / totalProviders;
    const highestScore = Math.max(...scores.map((s) => s.totalScore));
    const lowestScore = Math.min(...scores.map((s) => s.totalScore));

    // 评分分布
    const scoreDistribution = {
      excellent: scores.filter((s) => s.totalScore >= 90).length,
      good: scores.filter((s) => s.totalScore >= 80 && s.totalScore < 90)
        .length,
      fair: scores.filter((s) => s.totalScore >= 70 && s.totalScore < 80)
        .length,
      poor: scores.filter((s) => s.totalScore < 70).length,
    };

    // 市场份额（按代理数量）
    const totalProxies = scores.reduce((sum, s) => sum + s.totalProxies, 0);
    const marketShare = scores.reduce((acc, s) => {
      acc[s.provider] = (s.totalProxies / totalProxies) * 100;
      return acc;
    }, {} as Record<string, number>);

    return ProxyApiResponse.success({
      totalProviders,
      avgTotalScore,
      highestScore,
      lowestScore,
      scoreDistribution,
      marketShare,
    });
  }

  /**
   * 获取提供商详情
   * 注意：参数路由必须放在所有静态路由之后
   */
  @Get(':provider/details')
  @RequirePermission('proxy.provider.read')
  @ApiOperation({
    summary: '提供商详情',
    description: '获取指定提供商的详细评分、历史记录和趋势分析',
  })
  @ApiParam({ name: 'provider', description: '提供商名称' })
  @ApiResponse({
    status: 200,
    description: '查询成功',
    type: ProviderDetailsResponseDto,
  })
  async getProviderDetails(
    @Param('provider') provider: string,
  ): Promise<ProxyApiResponse<ProviderDetailsResponseDto>> {
    const details = await this.providerRankingService.getProviderDetails(
      provider,
    );
    return ProxyApiResponse.success(details as any);
  }

  /**
   * 对比提供商
   */
  @Post('compare')
  @RequirePermission('proxy.provider.compare')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '对比提供商',
    description: '对比多个提供商的性能指标，找出各项最优',
  })
  @ApiResponse({
    status: 200,
    description: '对比成功',
    type: ProviderComparisonResponseDto,
  })
  async compareProviders(
    @Body() dto: CompareProvidersDto,
  ): Promise<ProxyApiResponse<ProviderComparisonResponseDto>> {
    const comparison = await this.providerRankingService.compareProviders(
      dto.providers,
    );
    return ProxyApiResponse.success(comparison as any);
  }

  /**
   * 触发提供商评分计算
   */
  @Post(':provider/calculate')
  @RequirePermission('proxy.provider.admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '计算提供商评分',
    description: '立即计算指定提供商的评分（管理员操作）',
  })
  @ApiParam({ name: 'provider', description: '提供商名称' })
  @ApiResponse({
    status: 200,
    description: '计算成功',
    type: ProviderScoreResponseDto,
  })
  async calculateProviderScore(
    @Param('provider') provider: string,
  ): Promise<ProxyApiResponse<ProviderScoreResponseDto>> {
    const score = await this.providerRankingService.calculateProviderScore(
      provider,
    );
    return ProxyApiResponse.success(score as any, 'Score calculated');
  }

  /**
   * 触发所有提供商评分更新
   */
  @Post('calculate-all')
  @RequirePermission('proxy.provider.admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '更新所有提供商评分',
    description: '立即更新所有提供商的评分（管理员操作）',
  })
  @ApiResponse({
    status: 200,
    description: '更新完成',
  })
  async updateAllProviderScores(): Promise<
    ProxyApiResponse<{ updated: number; duration: number }>
  > {
    const startTime = Date.now();
    await this.providerRankingService.updateAllProviderScores();
    const duration = Date.now() - startTime;

    return ProxyApiResponse.success({
      updated: 1,
      duration,
    });
  }

}
