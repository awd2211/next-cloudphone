import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { OnlineSimService } from '../services/onlinesim.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import {
  OnlineSimGetNumberDto,
  OnlineSimSetStatusDto,
  OnlineSimBalanceDto,
  OnlineSimStateDto,
  OnlineSimCountryDto,
  OnlineSimNumbersStatsDto,
  OnlineSimSuccessDto,
  OnlineSimServiceMappingDto,
} from '../dto/onlinesim.dto';

/**
 * OnlineSim Controller
 *
 * 提供 OnlineSim SMS平台的 API 功能：
 * - 余额查询
 * - 获取虚拟号码
 * - 操作状态查询（使用 tzid 系统）
 * - 国家和号码统计
 */
@ApiTags('OnlineSim')
@Controller('sms/onlinesim')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class OnlineSimController {
  private readonly logger = new Logger(OnlineSimController.name);

  constructor(private readonly onlineSimService: OnlineSimService) {}

  /**
   * 获取余额
   */
  @Get('balance')
  @RequirePermission('sms.read')
  @ApiOperation({
    summary: '获取OnlineSim账户余额',
    description: '查询OnlineSim账户的当前余额',
  })
  @ApiResponse({
    status: 200,
    description: '成功返回余额信息',
  })
  async getBalance() {
    this.logger.log('Get OnlineSim balance');
    return await this.onlineSimService.getBalance();
  }

  /**
   * 获取详细余额信息
   */
  @Get('balance/detailed')
  @RequirePermission('sms.read')
  @ApiOperation({
    summary: '获取OnlineSim详细余额信息',
    description: '查询OnlineSim账户的详细余额，包括冻结金额',
  })
  @ApiResponse({
    status: 200,
    description: '成功返回详细余额信息',
    type: OnlineSimBalanceDto,
  })
  async getDetailedBalance(): Promise<OnlineSimBalanceDto> {
    this.logger.log('Get OnlineSim detailed balance');
    return await this.onlineSimService.getDetailedBalance();
  }

  /**
   * 获取虚拟号码
   */
  @Post('number')
  @RequirePermission('sms.request')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: '获取OnlineSim虚拟号码',
    description: '从OnlineSim获取一个虚拟号码用于接收短信验证码',
  })
  @ApiResponse({
    status: 201,
    description: '成功获取号码',
    schema: {
      type: 'object',
      properties: {
        activationId: { type: 'string', description: '操作ID (tzid)', example: '12345678' },
        phoneNumber: { type: 'string', example: '+79001234567' },
        country: { type: 'string', example: '7' },
        cost: { type: 'number', example: 15.5 },
      },
    },
  })
  async getNumber(@Body() dto: OnlineSimGetNumberDto) {
    this.logger.log(`Get OnlineSim number: service=${dto.service}, country=${dto.country || 7}`);
    return await this.onlineSimService.getNumber(dto.service, dto.country);
  }

  /**
   * 获取操作状态列表
   */
  @Get('state')
  @RequirePermission('sms.read')
  @ApiOperation({
    summary: '获取OnlineSim操作状态列表',
    description: '查询所有或指定操作ID的状态',
  })
  @ApiQuery({ name: 'tzid', required: false, type: Number, description: '操作ID' })
  @ApiResponse({
    status: 200,
    description: '成功返回操作状态列表',
    type: [OnlineSimStateDto],
  })
  async getState(@Query('tzid') tzid?: number): Promise<OnlineSimStateDto[]> {
    this.logger.log(`Get OnlineSim state: tzid=${tzid || 'all'}`);
    return await this.onlineSimService.getState(tzid);
  }

  /**
   * 获取号码状态
   */
  @Get('status/:activationId')
  @RequirePermission('sms.read')
  @ApiOperation({
    summary: '获取OnlineSim号码状态',
    description: '查询指定操作ID (tzid) 的号码状态和短信验证码',
  })
  @ApiParam({ name: 'activationId', description: '操作ID (tzid)' })
  @ApiResponse({
    status: 200,
    description: '成功返回状态信息',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['waiting', 'received', 'cancelled', 'expired', 'unknown'] },
        code: { type: 'string', nullable: true, example: '123456' },
        message: { type: 'string', nullable: true },
      },
    },
  })
  async getStatus(@Param('activationId') activationId: string) {
    this.logger.log(`Get OnlineSim status: tzid=${activationId}`);
    return await this.onlineSimService.getStatus(activationId);
  }

  /**
   * 设置操作状态
   */
  @Post('status')
  @RequirePermission('sms.request')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '设置OnlineSim操作状态',
    description: '对操作执行动作：ok（完成）或 revise（请求下一条短信）',
  })
  @ApiResponse({
    status: 200,
    description: '成功设置状态',
    type: OnlineSimSuccessDto,
  })
  async setStatus(@Body() dto: OnlineSimSetStatusDto): Promise<OnlineSimSuccessDto> {
    this.logger.log(`Set OnlineSim status: tzid=${dto.tzid} -> ${dto.action}`);

    if (dto.action === 'ok') {
      await this.onlineSimService.setOperationOk(dto.tzid);
    } else if (dto.action === 'revise') {
      await this.onlineSimService.setOperationRevise(dto.tzid);
    }

    return {
      success: true,
      message: `Action '${dto.action}' executed for tzid ${dto.tzid}`,
    };
  }

  /**
   * 完成操作
   */
  @Post('finish/:tzid')
  @RequirePermission('sms.request')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '完成OnlineSim操作',
    description: '将指定操作标记为已完成',
  })
  @ApiParam({ name: 'tzid', description: '操作ID' })
  @ApiResponse({
    status: 200,
    description: '成功完成操作',
    type: OnlineSimSuccessDto,
  })
  async finishOperation(@Param('tzid') tzid: string): Promise<OnlineSimSuccessDto> {
    this.logger.log(`Finish OnlineSim operation: tzid=${tzid}`);
    await this.onlineSimService.setOperationOk(parseInt(tzid, 10));
    return {
      success: true,
      message: `Operation ${tzid} finished successfully`,
    };
  }

  /**
   * 请求下一条短信
   */
  @Post('revise/:tzid')
  @RequirePermission('sms.request')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '请求OnlineSim下一条短信',
    description: '请求接收下一条短信（重发请求）',
  })
  @ApiParam({ name: 'tzid', description: '操作ID' })
  @ApiResponse({
    status: 200,
    description: '成功请求',
    type: OnlineSimSuccessDto,
  })
  async reviseOperation(@Param('tzid') tzid: string): Promise<OnlineSimSuccessDto> {
    this.logger.log(`Revise OnlineSim operation: tzid=${tzid}`);
    await this.onlineSimService.setOperationRevise(parseInt(tzid, 10));
    return {
      success: true,
      message: `Requested next SMS for operation ${tzid}`,
    };
  }

  /**
   * 取消操作
   */
  @Post('cancel/:activationId')
  @RequirePermission('sms.cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '取消OnlineSim操作',
    description: '取消指定操作ID（注：OnlineSim不支持显式取消，操作会在超时后自动取消）',
  })
  @ApiParam({ name: 'activationId', description: '操作ID (tzid)' })
  @ApiResponse({
    status: 200,
    description: '取消请求已提交',
    type: OnlineSimSuccessDto,
  })
  async cancel(@Param('activationId') activationId: string): Promise<OnlineSimSuccessDto> {
    this.logger.log(`Cancel OnlineSim operation: tzid=${activationId}`);
    await this.onlineSimService.cancel(activationId);
    return {
      success: true,
      message: `Operation ${activationId} will be cancelled automatically on timeout`,
    };
  }

  /**
   * 获取可用号码统计
   */
  @Get('numbers-stats')
  @RequirePermission('sms.read')
  @ApiOperation({
    summary: '获取OnlineSim可用号码统计',
    description: '查询各服务的可用号码数量和热门程度',
  })
  @ApiQuery({ name: 'country', required: false, type: Number, description: '国家代码 (E.164格式)' })
  @ApiResponse({
    status: 200,
    description: '成功返回号码统计',
    type: [OnlineSimNumbersStatsDto],
  })
  async getNumbersStats(@Query('country') country?: number): Promise<OnlineSimNumbersStatsDto[]> {
    this.logger.log(`Get OnlineSim numbers stats: country=${country || 'all'}`);
    return await this.onlineSimService.getNumbersStats(country);
  }

  /**
   * 获取国家列表
   */
  @Get('countries')
  @RequirePermission('sms.read')
  @ApiOperation({
    summary: '获取OnlineSim支持的国家列表',
    description: '查询OnlineSim支持的所有国家',
  })
  @ApiResponse({
    status: 200,
    description: '成功返回国家列表',
    type: [OnlineSimCountryDto],
  })
  async getCountries(): Promise<OnlineSimCountryDto[]> {
    this.logger.log('Get OnlineSim countries');
    return await this.onlineSimService.getCountries();
  }

  /**
   * 等待短信
   */
  @Get('wait/:activationId')
  @RequirePermission('sms.messages')
  @ApiOperation({
    summary: '等待OnlineSim短信',
    description: '轮询等待指定操作ID收到短信',
  })
  @ApiParam({ name: 'activationId', description: '操作ID (tzid)' })
  @ApiQuery({ name: 'maxWait', required: false, type: Number, description: '最大等待秒数', example: 120 })
  @ApiQuery({ name: 'interval', required: false, type: Number, description: '轮询间隔毫秒', example: 5000 })
  @ApiResponse({
    status: 200,
    description: '返回短信状态',
  })
  async waitForSms(
    @Param('activationId') activationId: string,
    @Query('maxWait') maxWait?: number,
    @Query('interval') interval?: number,
  ) {
    this.logger.log(`Wait for OnlineSim SMS: tzid=${activationId}`);
    return await this.onlineSimService.waitForSms(
      activationId,
      maxWait || 120,
      interval || 5000,
    );
  }

  /**
   * 获取服务代码映射
   */
  @Get('service-mapping')
  @RequirePermission('sms.read')
  @ApiOperation({
    summary: '获取OnlineSim服务代码映射',
    description: '查询内部服务代码到OnlineSim服务名称的映射关系',
  })
  @ApiResponse({
    status: 200,
    description: '成功返回映射表',
    type: OnlineSimServiceMappingDto,
  })
  async getServiceMapping(): Promise<OnlineSimServiceMappingDto> {
    this.logger.log('Get OnlineSim service mapping');
    const mapping = await this.onlineSimService.getServiceMapping();
    return { mapping };
  }

  /**
   * 健康检查
   */
  @Get('health')
  @RequirePermission('sms.read')
  @ApiOperation({
    summary: 'OnlineSim健康检查',
    description: '检查OnlineSim API连接状态',
  })
  @ApiResponse({
    status: 200,
    description: '返回健康状态',
  })
  async healthCheck() {
    this.logger.log('OnlineSim health check');
    const healthy = await this.onlineSimService.healthCheck();
    return { healthy, provider: 'onlinesim' };
  }

  /**
   * 清除缓存
   */
  @Post('cache/clear')
  @RequirePermission('sms.admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '清除OnlineSim适配器缓存',
    description: '清除OnlineSim适配器的缓存，用于配置更新后强制重新初始化',
  })
  @ApiResponse({
    status: 200,
    description: '缓存已清除',
    type: OnlineSimSuccessDto,
  })
  async clearCache(): Promise<OnlineSimSuccessDto> {
    this.logger.log('Clearing OnlineSim adapter cache');
    this.onlineSimService.clearCache();
    return {
      success: true,
      message: 'OnlineSim adapter cache cleared successfully',
    };
  }
}
