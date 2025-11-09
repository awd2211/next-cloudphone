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
import { ProxyGeoMatchingService } from '../services/proxy-geo-matching.service';
import {
  ConfigureDeviceGeoDto,
  GeoMatchQueryDto,
  GeoRecommendationDto,
  BatchConfigureGeoDto,
  DeviceGeoSettingResponseDto,
  GeoMatchResultDto,
  GeoRecommendationResponseDto,
  IspProviderResponseDto,
  GeoStatisticsResponseDto,
  ApiResponse as ProxyApiResponse,
} from '../dto';

/**
 * 代理地理匹配控制器
 *
 * 提供地理位置配置、智能匹配和ISP模拟功能
 */
@ApiTags('Proxy Geo Matching')
@Controller('proxy/geo')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class ProxyGeoMatchingController {
  constructor(
    private readonly geoMatchingService: ProxyGeoMatchingService,
  ) {}

  /**
   * 配置设备地理位置
   */
  @Post('configure')
  @RequirePermission('proxy.geo.configure')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: '配置设备地理位置',
    description: '为设备配置目标国家、城市和ISP类型',
  })
  @ApiResponse({
    status: 201,
    description: '配置成功',
    type: DeviceGeoSettingResponseDto,
  })
  async configureDeviceGeo(
    @Body() dto: ConfigureDeviceGeoDto,
  ): Promise<ProxyApiResponse<DeviceGeoSettingResponseDto>> {
    const setting = await this.geoMatchingService.configureDeviceGeo(dto);
    return ProxyApiResponse.success(setting as any, 'Geo configuration saved');
  }

  /**
   * 批量配置设备地理位置
   */
  @Post('configure/batch')
  @RequirePermission('proxy.geo.configure')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '批量配置地理位置',
    description: '一次为多个设备配置地理位置',
  })
  @ApiResponse({
    status: 200,
    description: '批量配置完成',
  })
  async batchConfigureGeo(
    @Body() dto: BatchConfigureGeoDto,
  ): Promise<
    ProxyApiResponse<{
      success: number;
      failed: number;
      errors: any[];
    }>
  > {
    const result = await this.geoMatchingService.batchConfigureDeviceGeo(
      dto.configs,
    );
    return ProxyApiResponse.success(result);
  }

  /**
   * 获取设备地理配置
   */
  @Get('device/:deviceId')
  @RequirePermission('proxy.geo.read')
  @ApiOperation({
    summary: '查询设备地理配置',
    description: '获取指定设备的地理位置配置',
  })
  @ApiParam({ name: 'deviceId', description: '设备ID' })
  @ApiResponse({
    status: 200,
    description: '查询成功',
    type: DeviceGeoSettingResponseDto,
  })
  async getDeviceGeoSetting(
    @Param('deviceId') deviceId: string,
  ): Promise<ProxyApiResponse<DeviceGeoSettingResponseDto | null>> {
    const setting = await this.geoMatchingService.getDeviceGeoSetting(deviceId);
    return ProxyApiResponse.success(setting as any);
  }

  /**
   * 地理匹配代理
   */
  @Post('match')
  @RequirePermission('proxy.geo.match')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '地理匹配代理',
    description: '根据地理位置要求匹配代理，返回匹配分数最高的代理列表',
  })
  @ApiResponse({
    status: 200,
    description: '匹配成功',
    type: [GeoMatchResultDto],
  })
  async matchProxiesByGeo(
    @Body() dto: GeoMatchQueryDto,
  ): Promise<ProxyApiResponse<GeoMatchResultDto[]>> {
    const matches = await this.geoMatchingService.matchProxiesByGeo(dto);
    return ProxyApiResponse.success(matches as any);
  }

  /**
   * 智能推荐地理位置
   */
  @Post('recommend')
  @RequirePermission('proxy.geo.recommend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '智能推荐地理位置',
    description: '基于目标URL分析，推荐最佳地理位置配置',
  })
  @ApiResponse({
    status: 200,
    description: '推荐成功',
    type: GeoRecommendationResponseDto,
  })
  async recommendGeoLocation(
    @Body() dto: GeoRecommendationDto,
  ): Promise<ProxyApiResponse<GeoRecommendationResponseDto>> {
    const recommendation = await this.geoMatchingService.recommendGeoLocation(
      dto,
    );
    return ProxyApiResponse.success(recommendation as any);
  }

  /**
   * 查询ISP提供商
   */
  @Get('isp/providers')
  @RequirePermission('proxy.geo.read')
  @ApiOperation({
    summary: '查询ISP提供商',
    description: '获取可用的ISP提供商列表',
  })
  @ApiQuery({
    name: 'country',
    required: false,
    description: '国家代码',
  })
  @ApiQuery({
    name: 'ispType',
    required: false,
    enum: ['residential', 'datacenter', 'mobile'],
    description: 'ISP类型',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: '返回数量',
  })
  @ApiResponse({
    status: 200,
    description: '查询成功',
    type: [IspProviderResponseDto],
  })
  async getIspProviders(
    @Query('country') country?: string,
    @Query('ispType') ispType?: string,
    @Query('limit') limit?: number,
  ): Promise<ProxyApiResponse<IspProviderResponseDto[]>> {
    const providers = await this.geoMatchingService.getIspProviders({
      country,
      ispType,
      limit: limit ? parseInt(limit.toString()) : undefined,
    });
    return ProxyApiResponse.success(providers as any);
  }

  /**
   * 获取地理统计
   */
  @Get('statistics')
  @RequirePermission('proxy.geo.stats')
  @ApiOperation({
    summary: '地理统计',
    description: '获取设备地理位置分布统计',
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    description: '用户ID（可选，用于过滤）',
  })
  @ApiResponse({
    status: 200,
    description: '查询成功',
    type: GeoStatisticsResponseDto,
  })
  async getGeoStatistics(
    @Query('userId') userId?: string,
  ): Promise<ProxyApiResponse<GeoStatisticsResponseDto>> {
    const stats = await this.geoMatchingService.getGeoStatistics(userId);
    return ProxyApiResponse.success(stats as any);
  }
}
