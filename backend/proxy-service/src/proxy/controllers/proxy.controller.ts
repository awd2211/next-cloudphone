import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse as SwaggerApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { ProxyService } from '../services/proxy.service';
import {
  AcquireProxyDto,
  ReportSuccessDto,
  ReportFailureDto,
  ProxyResponseDto,
  PoolStatsResponseDto,
  HealthResponseDto,
  ApiResponse,
} from '../dto';
import { LoadBalancingStrategy } from '../../common/interfaces';

/**
 * 代理控制器
 *
 * 提供代理管理的 REST API 端点
 */
@ApiTags('proxy')
@Controller('proxy')
@UseInterceptors(ClassSerializerInterceptor)
export class ProxyController {
  constructor(private readonly proxyService: ProxyService) {}

  /**
   * 获取代理
   */
  @Post('acquire')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '获取代理',
    description: '根据筛选条件获取一个可用的代理',
  })
  @SwaggerApiResponse({
    status: 200,
    description: '成功获取代理',
    type: ProxyResponseDto,
  })
  @SwaggerApiResponse({
    status: 500,
    description: '获取代理失败',
  })
  async acquireProxy(
    @Body() dto: AcquireProxyDto,
  ): Promise<ApiResponse<ProxyResponseDto>> {
    return this.proxyService.acquireProxy(dto);
  }

  /**
   * 释放代理
   */
  @Post('release/:proxyId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '释放代理',
    description: '释放一个正在使用的代理，使其可以被其他请求使用',
  })
  @ApiParam({
    name: 'proxyId',
    description: '代理ID',
    example: 'brightdata-1234567890-abc',
  })
  @SwaggerApiResponse({
    status: 200,
    description: '成功释放代理',
  })
  @SwaggerApiResponse({
    status: 404,
    description: '代理不存在',
  })
  async releaseProxy(
    @Param('proxyId') proxyId: string,
  ): Promise<ApiResponse<{ released: boolean }>> {
    return this.proxyService.releaseProxy(proxyId);
  }

  /**
   * 报告代理使用成功
   */
  @Post('report-success/:proxyId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '报告代理使用成功',
    description: '报告代理成功完成请求，记录使用统计',
  })
  @ApiParam({
    name: 'proxyId',
    description: '代理ID',
    example: 'brightdata-1234567890-abc',
  })
  @SwaggerApiResponse({
    status: 200,
    description: '成功记录',
  })
  async reportSuccess(
    @Param('proxyId') proxyId: string,
    @Body() dto: ReportSuccessDto,
  ): Promise<ApiResponse<{ recorded: boolean }>> {
    return this.proxyService.reportSuccess(proxyId, dto);
  }

  /**
   * 报告代理使用失败
   */
  @Post('report-failure/:proxyId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '报告代理使用失败',
    description: '报告代理请求失败，记录失败统计并降低代理质量分数',
  })
  @ApiParam({
    name: 'proxyId',
    description: '代理ID',
    example: 'brightdata-1234567890-abc',
  })
  @SwaggerApiResponse({
    status: 200,
    description: '成功记录',
  })
  async reportFailure(
    @Param('proxyId') proxyId: string,
    @Body() dto: ReportFailureDto,
  ): Promise<ApiResponse<{ recorded: boolean }>> {
    return this.proxyService.reportFailure(proxyId, dto);
  }

  /**
   * 获取池统计信息
   */
  @Get('stats/pool')
  @ApiOperation({
    summary: '获取代理池统计',
    description: '获取代理池的详细统计信息',
  })
  @SwaggerApiResponse({
    status: 200,
    description: '成功获取统计信息',
    type: PoolStatsResponseDto,
  })
  async getPoolStats(): Promise<ApiResponse<PoolStatsResponseDto>> {
    return this.proxyService.getPoolStats();
  }

  /**
   * 健康检查
   */
  @Get('health')
  @ApiOperation({
    summary: '健康检查',
    description: '检查代理服务的健康状态',
  })
  @SwaggerApiResponse({
    status: 200,
    description: '服务健康',
    type: HealthResponseDto,
  })
  async healthCheck(): Promise<HealthResponseDto> {
    return this.proxyService.healthCheck();
  }

  /**
   * 设置负载均衡策略
   */
  @Post('strategy/:strategy')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '设置负载均衡策略',
    description: '更改代理池的负载均衡策略',
  })
  @ApiParam({
    name: 'strategy',
    description: '负载均衡策略',
    enum: LoadBalancingStrategy,
    example: 'quality_based',
  })
  @SwaggerApiResponse({
    status: 200,
    description: '成功设置策略',
  })
  async setStrategy(
    @Param('strategy') strategy: LoadBalancingStrategy,
  ): Promise<ApiResponse<{ strategy: string }>> {
    return this.proxyService.setLoadBalancingStrategy(strategy);
  }

  /**
   * 强制刷新代理池
   */
  @Post('admin/refresh-pool')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '强制刷新代理池',
    description: '立即刷新代理池，从供应商获取新代理（管理员操作）',
  })
  @SwaggerApiResponse({
    status: 200,
    description: '成功刷新',
  })
  async forceRefresh(): Promise<ApiResponse<{ added: number }>> {
    return this.proxyService.forceRefreshPool();
  }

  /**
   * 获取活跃代理数量
   */
  @Get('stats/active')
  @ApiOperation({
    summary: '获取活跃代理数量',
    description: '获取当前正在使用的代理数量',
  })
  @SwaggerApiResponse({
    status: 200,
    description: '成功获取',
  })
  async getActiveCount(): Promise<ApiResponse<{ count: number }>> {
    const count = this.proxyService.getActiveProxiesCount();
    return ApiResponse.success({ count });
  }

  /**
   * 获取代理详情
   * ⚠️ 注意：此路由必须放在最后，因为它是参数化路由，会匹配任何字符串
   */
  @Get(':proxyId')
  @ApiOperation({
    summary: '获取代理详情',
    description: '根据代理ID获取详细信息',
  })
  @ApiParam({
    name: 'proxyId',
    description: '代理ID',
    example: 'brightdata-1234567890-abc',
  })
  @SwaggerApiResponse({
    status: 200,
    description: '成功获取代理详情',
    type: ProxyResponseDto,
  })
  @SwaggerApiResponse({
    status: 404,
    description: '代理不存在',
  })
  async getProxyById(
    @Param('proxyId') proxyId: string,
  ): Promise<ApiResponse<ProxyResponseDto>> {
    return this.proxyService.getProxyById(proxyId);
  }
}
