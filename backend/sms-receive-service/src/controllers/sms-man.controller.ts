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
import { SmsManService } from '../services/sms-man.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import {
  SmsManGetNumberDto,
  SmsManSetStatusDto,
  SmsManPriceQueryDto,
  SmsManBalanceDto,
  SmsManCountryDto,
  SmsManServiceDto,
  SmsManSuccessDto,
  SmsManServiceMappingDto,
} from '../dto/sms-man.dto';

/**
 * SMS-Man Controller
 *
 * 提供 SMS-Man SMS平台的 API 功能：
 * - 余额查询
 * - 获取虚拟号码
 * - 状态查询和设置
 * - 国家和服务列表
 * - 价格查询
 */
@ApiTags('SMS-Man')
@Controller('sms/sms-man')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class SmsManController {
  private readonly logger = new Logger(SmsManController.name);

  constructor(private readonly smsManService: SmsManService) {}

  /**
   * 获取余额
   */
  @Get('balance')
  @RequirePermission('sms.read')
  @ApiOperation({
    summary: '获取SMS-Man账户余额',
    description: '查询SMS-Man账户的当前余额',
  })
  @ApiResponse({
    status: 200,
    description: '成功返回余额信息',
    type: SmsManBalanceDto,
  })
  async getBalance() {
    this.logger.log('Get SMS-Man balance');
    return await this.smsManService.getBalance();
  }

  /**
   * 获取虚拟号码
   */
  @Post('number')
  @RequirePermission('sms.request')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: '获取SMS-Man虚拟号码',
    description: '从SMS-Man获取一个虚拟号码用于接收短信验证码',
  })
  @ApiResponse({
    status: 201,
    description: '成功获取号码',
    schema: {
      type: 'object',
      properties: {
        activationId: { type: 'string', example: '123456789' },
        phoneNumber: { type: 'string', example: '+79001234567' },
        cost: { type: 'number', example: 15.5 },
      },
    },
  })
  async getNumber(@Body() dto: SmsManGetNumberDto) {
    this.logger.log(`Get SMS-Man number: service=${dto.service}, country=${dto.country || 0}`);
    return await this.smsManService.getNumber(dto.service, dto.country);
  }

  /**
   * 获取号码状态
   */
  @Get('status/:activationId')
  @RequirePermission('sms.read')
  @ApiOperation({
    summary: '获取SMS-Man号码状态',
    description: '查询指定激活ID的号码状态和短信验证码',
  })
  @ApiParam({ name: 'activationId', description: '激活ID' })
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
    this.logger.log(`Get SMS-Man status: ${activationId}`);
    return await this.smsManService.getStatus(activationId);
  }

  /**
   * 设置号码状态
   */
  @Post('status')
  @RequirePermission('sms.request')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '设置SMS-Man号码状态',
    description: '设置指定激活ID的状态 (1=准备, 3=重发, 6=完成, 8=取消)',
  })
  @ApiResponse({
    status: 200,
    description: '成功设置状态',
    type: SmsManSuccessDto,
  })
  async setStatus(@Body() dto: SmsManSetStatusDto): Promise<SmsManSuccessDto> {
    this.logger.log(`Set SMS-Man status: ${dto.activationId} -> ${dto.status}`);
    await this.smsManService.setStatus(dto.activationId, dto.status);
    return {
      success: true,
      message: `Status set to ${dto.status} for activation ${dto.activationId}`,
    };
  }

  /**
   * 取消号码
   */
  @Post('cancel/:activationId')
  @RequirePermission('sms.cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '取消SMS-Man号码',
    description: '取消指定激活ID的号码，将退还费用',
  })
  @ApiParam({ name: 'activationId', description: '激活ID' })
  @ApiResponse({
    status: 200,
    description: '成功取消号码',
    type: SmsManSuccessDto,
  })
  async cancel(@Param('activationId') activationId: string): Promise<SmsManSuccessDto> {
    this.logger.log(`Cancel SMS-Man number: ${activationId}`);
    await this.smsManService.cancel(activationId);
    return {
      success: true,
      message: `Activation ${activationId} cancelled successfully`,
    };
  }

  /**
   * 完成激活
   */
  @Post('finish/:activationId')
  @RequirePermission('sms.request')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '完成SMS-Man激活',
    description: '标记指定激活ID为已完成',
  })
  @ApiParam({ name: 'activationId', description: '激活ID' })
  @ApiResponse({
    status: 200,
    description: '成功完成激活',
    type: SmsManSuccessDto,
  })
  async finish(@Param('activationId') activationId: string): Promise<SmsManSuccessDto> {
    this.logger.log(`Finish SMS-Man activation: ${activationId}`);
    await this.smsManService.finish(activationId);
    return {
      success: true,
      message: `Activation ${activationId} finished successfully`,
    };
  }

  /**
   * 获取价格
   */
  @Get('prices')
  @RequirePermission('sms.read')
  @ApiOperation({
    summary: '获取SMS-Man价格信息',
    description: '查询SMS-Man各服务和国家的价格',
  })
  @ApiQuery({ name: 'service', required: false, description: '服务代码' })
  @ApiQuery({ name: 'country', required: false, type: Number, description: '国家代码' })
  @ApiResponse({
    status: 200,
    description: '成功返回价格信息',
  })
  async getPrices(@Query() query: SmsManPriceQueryDto) {
    this.logger.log(`Get SMS-Man prices: service=${query.service || 'all'}, country=${query.country || 'all'}`);
    return await this.smsManService.getPrices(query.service, query.country);
  }

  /**
   * 获取国家列表
   */
  @Get('countries')
  @RequirePermission('sms.read')
  @ApiOperation({
    summary: '获取SMS-Man支持的国家列表',
    description: '查询SMS-Man支持的所有国家',
  })
  @ApiResponse({
    status: 200,
    description: '成功返回国家列表',
    type: [SmsManCountryDto],
  })
  async getCountries(): Promise<SmsManCountryDto[]> {
    this.logger.log('Get SMS-Man countries');
    return await this.smsManService.getCountries();
  }

  /**
   * 获取服务列表
   */
  @Get('services')
  @RequirePermission('sms.read')
  @ApiOperation({
    summary: '获取SMS-Man支持的服务列表',
    description: '查询SMS-Man支持的所有服务/产品',
  })
  @ApiResponse({
    status: 200,
    description: '成功返回服务列表',
    type: [SmsManServiceDto],
  })
  async getServices(): Promise<SmsManServiceDto[]> {
    this.logger.log('Get SMS-Man services');
    return await this.smsManService.getServices();
  }

  /**
   * 获取可用号码数量
   */
  @Get('numbers-status')
  @RequirePermission('sms.read')
  @ApiOperation({
    summary: '获取SMS-Man可用号码数量',
    description: '查询各服务的可用号码数量',
  })
  @ApiQuery({ name: 'country', required: false, type: Number, description: '国家代码' })
  @ApiResponse({
    status: 200,
    description: '成功返回号码数量',
  })
  async getNumbersStatus(@Query('country') country?: number) {
    this.logger.log(`Get SMS-Man numbers status: country=${country || 'all'}`);
    return await this.smsManService.getNumbersStatus(country);
  }

  /**
   * 等待短信
   */
  @Get('wait/:activationId')
  @RequirePermission('sms.messages')
  @ApiOperation({
    summary: '等待SMS-Man短信',
    description: '轮询等待指定激活ID收到短信',
  })
  @ApiParam({ name: 'activationId', description: '激活ID' })
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
    this.logger.log(`Wait for SMS-Man SMS: ${activationId}`);
    return await this.smsManService.waitForSms(
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
    summary: '获取SMS-Man服务代码映射',
    description: '查询内部服务代码到SMS-Man代码的映射关系',
  })
  @ApiResponse({
    status: 200,
    description: '成功返回映射表',
    type: SmsManServiceMappingDto,
  })
  async getServiceMapping(): Promise<SmsManServiceMappingDto> {
    this.logger.log('Get SMS-Man service mapping');
    const mapping = await this.smsManService.getServiceMapping();
    return { mapping };
  }

  /**
   * 健康检查
   */
  @Get('health')
  @RequirePermission('sms.read')
  @ApiOperation({
    summary: 'SMS-Man健康检查',
    description: '检查SMS-Man API连接状态',
  })
  @ApiResponse({
    status: 200,
    description: '返回健康状态',
  })
  async healthCheck() {
    this.logger.log('SMS-Man health check');
    const healthy = await this.smsManService.healthCheck();
    return { healthy, provider: 'sms-man' };
  }

  /**
   * 清除缓存
   */
  @Post('cache/clear')
  @RequirePermission('sms.admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '清除SMS-Man适配器缓存',
    description: '清除SMS-Man适配器的缓存，用于配置更新后强制重新初始化',
  })
  @ApiResponse({
    status: 200,
    description: '缓存已清除',
    type: SmsManSuccessDto,
  })
  async clearCache(): Promise<SmsManSuccessDto> {
    this.logger.log('Clearing SMS-Man adapter cache');
    this.smsManService.clearCache();
    return {
      success: true,
      message: 'SMS-Man adapter cache cleared successfully',
    };
  }
}
