import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UseGuards,
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
  ListProxiesDto,
  AssignProxyDto,
} from '../dto';
import { LoadBalancingStrategy } from '../../common/interfaces';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { RequirePermission } from '../../auth/decorators/permissions.decorator';
import { Public } from '../../auth/decorators/public.decorator';
import { trace, SpanStatusCode } from '@opentelemetry/api';

/**
 * 代理控制器
 *
 * 提供代理管理的 REST API 端点
 *
 * 使用双层守卫：
 * 1. JwtAuthGuard - 验证 JWT token，设置 request.user
 * 2. PermissionsGuard - 检查用户权限
 */
@ApiTags('proxy')
@Controller('proxy')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@UseInterceptors(ClassSerializerInterceptor)
@ApiBearerAuth() // Swagger 文档显示需要 Bearer Token
export class ProxyController {
  private readonly tracer = trace.getTracer('proxy-service');

  constructor(private readonly proxyService: ProxyService) {}

  /**
   * 获取代理
   */
  @Post('acquire')
  @RequirePermission('proxy.acquire')
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
    return await this.tracer.startActiveSpan(
      'proxy.acquire',
      {
        attributes: {
          'proxy.country': dto.country || 'any',
          'proxy.protocol': dto.protocol || 'any',
          'proxy.provider': dto.provider || 'any',
          'user.id': dto.userId || 'unknown',
          'device.id': dto.deviceId || 'unknown',
        },
      },
      async (span) => {
        try {
          const result = await this.proxyService.acquireProxy(dto);

          span.setAttributes({
            'proxy.acquired': result.success,
            'proxy.provider': result.data?.provider || 'none',
            'proxy.host': result.data?.host || 'none',
            'proxy.quality': result.data?.quality || 0,
          });
          span.setStatus({ code: SpanStatusCode.OK });

          return result;
        } catch (error) {
          span.recordException(error);
          span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
          throw error;
        } finally {
          span.end();
        }
      }
    );
  }

  /**
   * 列出所有代理（Phase 3.1）
   */
  @RequirePermission('proxy.list')
  @Get('list')
  @ApiOperation({
    summary: '列出所有代理',
    description: '获取代理池中的所有代理列表（支持筛选和分页）',
  })
  @SwaggerApiResponse({
    status: 200,
    description: '成功获取代理列表',
    type: [ProxyResponseDto],
  })
  async listProxies(
    @Query() dto: ListProxiesDto,
  ): Promise<ApiResponse<ProxyResponseDto[]>> {
    const criteria = dto.country || dto.city || dto.state || dto.protocol || dto.minQuality || dto.maxLatency || dto.maxCostPerGB || dto.provider
      ? {
          country: dto.country,
          city: dto.city,
          state: dto.state,
          protocol: dto.protocol,
          minQuality: dto.minQuality,
          maxLatency: dto.maxLatency,
          maxCostPerGB: dto.maxCostPerGB,
          provider: dto.provider,
        }
      : undefined;

    return this.proxyService.listProxies(
      criteria,
      dto.availableOnly ?? false,
      dto.limit,
      dto.offset ?? 0,
    );
  }

  /**
   * 分配指定代理（Phase 3.1）
   */
  @RequirePermission('proxy.assign')
  @Post('assign')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '分配指定代理',
    description: '根据代理ID分配特定的代理（用于智能代理选择）',
  })
  @SwaggerApiResponse({
    status: 200,
    description: '成功分配代理',
    type: ProxyResponseDto,
  })
  @SwaggerApiResponse({
    status: 404,
    description: '代理不存在',
  })
  @SwaggerApiResponse({
    status: 400,
    description: '代理不可用',
  })
  async assignProxy(
    @Body() dto: AssignProxyDto,
  ): Promise<ApiResponse<ProxyResponseDto>> {
    return this.proxyService.assignSpecificProxy(
      dto.proxyId,
      dto.validate ?? true,
    );
  }

  /**
   * 释放代理
   */
  @RequirePermission('proxy.release')
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
    return await this.tracer.startActiveSpan(
      'proxy.release',
      {
        attributes: {
          'proxy.id': proxyId,
        },
      },
      async (span) => {
        try {
          const result = await this.proxyService.releaseProxy(proxyId);

          span.setAttributes({
            'proxy.released': result.data?.released || false,
          });
          span.setStatus({ code: SpanStatusCode.OK });

          return result;
        } catch (error) {
          span.recordException(error);
          span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
          throw error;
        } finally {
          span.end();
        }
      }
    );
  }

  /**
   * 报告代理使用成功
   */
  @RequirePermission('proxy.report')
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
    return await this.tracer.startActiveSpan(
      'proxy.report_success',
      {
        attributes: {
          'proxy.id': proxyId,
          'report.response_time_ms': dto.responseTime || 0,
          'report.bandwidth_mb': dto.bandwidthMB,
        },
      },
      async (span) => {
        try {
          const result = await this.proxyService.reportSuccess(proxyId, dto);

          span.setAttributes({
            'report.recorded': result.data?.recorded || false,
          });
          span.setStatus({ code: SpanStatusCode.OK });

          return result;
        } catch (error) {
          span.recordException(error);
          span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
          throw error;
        } finally {
          span.end();
        }
      }
    );
  }

  /**
   * 报告代理使用失败
   */
  @RequirePermission('proxy.report')
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
  @RequirePermission('proxy.stats')
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
  @Public()
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
  @RequirePermission('proxy.strategy')
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
  @RequirePermission('proxy.refresh')
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
  @RequirePermission('proxy.stats')
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
  @RequirePermission('proxy.read')
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
