import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Logger,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { NumberManagementService } from '../services/number-management.service';
import { MessagePollingService } from '../services/message-polling.service';
import { PlatformSelectorService } from '../services/platform-selector.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VirtualNumber, SmsMessage } from '../entities';
import {
  RequestNumberDto,
  BatchRequestDto,
} from '../dto/request-number.dto';
import {
  NumberResponseDto,
  SmsMessageResponseDto,
  BatchResponseDto,
  StatsResponseDto,
  ProviderStatsResponseDto,
} from '../dto/number-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { Public } from '../auth/decorators/public.decorator';

/**
 * 虚拟号码管理 REST API
 *
 * 使用双层守卫：
 * 1. JwtAuthGuard - 验证 JWT token，设置 request.user
 * 2. PermissionsGuard - 检查用户权限
 */
@ApiTags('Virtual Numbers')
@Controller('numbers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class NumbersController {
  private readonly logger = new Logger(NumbersController.name);

  constructor(
    private readonly numberManagement: NumberManagementService,
    private readonly messagePolling: MessagePollingService,
    private readonly platformSelector: PlatformSelectorService,
    @InjectRepository(VirtualNumber)
    private readonly numberRepo: Repository<VirtualNumber>,
    @InjectRepository(SmsMessage)
    private readonly messageRepo: Repository<SmsMessage>,
  ) {}

  /**
   * 请求虚拟号码
   */
  @Post()
  @RequirePermission('sms.request')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: '请求虚拟号码',
    description: '为指定设备请求一个虚拟手机号码用于接收短信验证码',
  })
  @ApiResponse({
    status: 201,
    description: '成功请求到虚拟号码',
    type: NumberResponseDto,
  })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 500, description: '服务器内部错误' })
  async requestNumber(@Body() dto: RequestNumberDto): Promise<NumberResponseDto> {
    this.logger.log(`Request number: service=${dto.service}, deviceId=${dto.deviceId}`);

    const number = await this.numberManagement.requestNumber(dto);

    return this.mapToResponseDto(number);
  }

  /**
   * 查询号码状态
   */
  @Get(':id')
  @RequirePermission('sms.read')
  @ApiOperation({
    summary: '查询号码状态',
    description: '根据号码ID查询虚拟号码的状态和短信接收情况',
  })
  @ApiParam({ name: 'id', description: '虚拟号码ID' })
  @ApiResponse({
    status: 200,
    description: '查询成功',
    type: NumberResponseDto,
  })
  @ApiResponse({ status: 404, description: '号码不存在' })
  async getNumber(@Param('id') id: string): Promise<NumberResponseDto> {
    const number = await this.numberManagement.getNumberStatus(id);
    return this.mapToResponseDto(number);
  }

  /**
   * 取消号码（退款）
   */
  @Delete(':id')
  @RequirePermission('sms.cancel')
  @ApiOperation({
    summary: '取消号码',
    description: '取消虚拟号码并申请退款（仅限active和waiting_sms状态）',
  })
  @ApiParam({ name: 'id', description: '虚拟号码ID' })
  @ApiResponse({
    status: 200,
    description: '取消成功',
    schema: {
      type: 'object',
      properties: {
        refunded: { type: 'boolean' },
        amount: { type: 'number' },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 404, description: '号码不存在' })
  @ApiResponse({ status: 400, description: '号码状态不允许取消' })
  async cancelNumber(@Param('id') id: string) {
    this.logger.log(`Cancel number: ${id}`);

    const result = await this.numberManagement.cancelNumber(id);

    return {
      refunded: result.refunded,
      amount: result.amount,
      message: `Number cancelled and refunded $${result.amount}`,
    };
  }

  /**
   * 批量请求号码
   */
  @Post('batch')
  @RequirePermission('sms.batch')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: '批量请求号码',
    description: '为多个设备批量请求虚拟号码（最多100个）',
  })
  @ApiResponse({
    status: 201,
    description: '批量请求完成',
    type: BatchResponseDto,
  })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  async batchRequest(@Body() dto: BatchRequestDto): Promise<BatchResponseDto> {
    this.logger.log(`Batch request: service=${dto.service}, count=${dto.deviceIds.length}`);

    const result = await this.numberManagement.batchRequest(
      dto.service,
      dto.country,
      dto.deviceIds,
      dto.provider,
    );

    return result;
  }

  /**
   * 获取号码的短信消息
   */
  @Get(':id/messages')
  @RequirePermission('sms.messages')
  @ApiOperation({
    summary: '获取号码的短信消息',
    description: '查询指定虚拟号码接收到的所有短信消息',
  })
  @ApiParam({ name: 'id', description: '虚拟号码ID' })
  @ApiResponse({
    status: 200,
    description: '查询成功',
    type: [SmsMessageResponseDto],
  })
  @ApiResponse({ status: 404, description: '号码不存在' })
  async getMessages(@Param('id') id: string): Promise<SmsMessageResponseDto[]> {
    const number = await this.numberRepo.findOne({ where: { id } });
    if (!number) {
      throw new NotFoundException(`Virtual number ${id} not found`);
    }

    const messages = await this.messageRepo.find({
      where: { virtualNumberId: id },
      order: { receivedAt: 'DESC' },
    });

    return messages.map((msg) => ({
      id: msg.id,
      virtualNumberId: msg.virtualNumberId,
      verificationCode: msg.verificationCode,
      messageText: msg.messageText,
      sender: msg.sender,
      receivedAt: msg.receivedAt,
      deliveredToDevice: msg.deliveredToDevice,
    }));
  }

  /**
   * 获取轮询统计
   */
  @Get('stats/polling')
  @RequirePermission('sms.stats')
  @ApiOperation({
    summary: '获取轮询统计',
    description: '查询短信轮询服务的统计信息',
  })
  @ApiResponse({
    status: 200,
    description: '查询成功',
    type: StatsResponseDto,
  })
  async getPollingStats(): Promise<StatsResponseDto> {
    return await this.messagePolling.getPollingStats();
  }

  /**
   * 获取平台统计
   */
  @Get('stats/providers')
  @RequirePermission('sms.provider-stats')
  @ApiOperation({
    summary: '获取平台统计',
    description: '查询各SMS平台的性能统计信息',
  })
  @ApiResponse({
    status: 200,
    description: '查询成功',
    type: [ProviderStatsResponseDto],
  })
  async getProviderStats(): Promise<ProviderStatsResponseDto[]> {
    const stats = this.platformSelector.getProviderStats();

    return stats.map((stat) => ({
      providerName: stat.providerName,
      totalRequests: stat.totalRequests,
      successCount: stat.successCount,
      failureCount: stat.failureCount,
      averageResponseTime: stat.averageResponseTime,
      averageCost: stat.averageCost,
      successRate: stat.successRate,
      isHealthy: stat.isHealthy,
      consecutiveFailures: stat.consecutiveFailures,
    }));
  }

  /**
   * 手动触发轮询（管理员功能）
   */
  @Post('poll/trigger')
  @RequirePermission('sms.trigger-poll')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '手动触发轮询',
    description: '立即触发一次短信轮询任务（管理员功能）',
  })
  @ApiResponse({
    status: 200,
    description: '轮询已触发',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        triggeredAt: { type: 'string' },
      },
    },
  })
  async triggerPoll() {
    this.logger.log('Manual poll triggered by API');

    await this.messagePolling.triggerPoll();

    return {
      message: 'Polling triggered successfully',
      triggeredAt: new Date().toISOString(),
    };
  }

  /**
   * 映射实体到响应 DTO
   */
  private mapToResponseDto(number: VirtualNumber): NumberResponseDto {
    return {
      id: number.id,
      provider: number.provider,
      phoneNumber: number.phoneNumber,
      countryCode: number.countryCode,
      countryName: number.countryName,
      serviceCode: number.serviceCode,
      serviceName: number.serviceName,
      status: number.status,
      cost: Number(number.cost),
      deviceId: number.deviceId,
      userId: number.userId,
      activatedAt: number.activatedAt,
      expiresAt: number.expiresAt,
      smsReceivedAt: number.smsReceivedAt,
      completedAt: number.completedAt,
      fromPool: number.fromPool,
      selectedByAlgorithm: number.selectedByAlgorithm,
      metadata: number.metadata,
    };
  }
}
