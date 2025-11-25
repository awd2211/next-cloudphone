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
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SmsActivateService } from '../services/sms-activate.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import {
  SmsActivateGetNumberDto,
  SmsActivateMultiServiceDto,
  SmsActivateAdditionalServiceDto,
  SmsActivateSetStatusDto,
  SmsActivateRentNumberDto,
  SmsActivateSetRentStatusDto,
  SmsActivatePriceQueryDto,
  SmsActivateTopCountriesQueryDto,
  SmsActivateNumbersStatusQueryDto,
  SmsActivateRentServicesQueryDto,
  SmsActivateCountryDto,
  SmsActivateTopCountryDto,
  SmsActivateCurrentActivationDto,
  SmsActivateRentStatusDto,
  SmsActivateRentItemDto,
  SmsActivateBalanceAndCashBackDto,
  SmsActivateFullSmsDto,
  SmsActivateSuccessDto,
  SmsActivateServiceMappingDto,
} from '../dto/sms-activate.dto';

/**
 * SMS-Activate 高级功能 Controller
 *
 * 提供 SMS-Activate 特有的高级功能：
 * - 国家和运营商查询
 * - 价格和可用号码查询
 * - 当前激活管理
 * - 租赁号码管理
 * - 多服务号码
 */
@ApiTags('SMS-Activate Advanced Features')
@Controller('sms/sms-activate')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class SmsActivateController {
  private readonly logger = new Logger(SmsActivateController.name);

  constructor(private readonly smsActivateService: SmsActivateService) {}

  // ============================================
  // 账户相关
  // ============================================

  /**
   * 获取余额
   */
  @Get('balance')
  @RequirePermission('sms.read')
  @ApiOperation({
    summary: '获取SMS-Activate余额',
    description: '查询SMS-Activate账户当前余额',
  })
  @ApiResponse({ status: 200, description: '成功返回余额信息' })
  async getBalance() {
    this.logger.log('Get SMS-Activate balance');
    return await this.smsActivateService.getBalance();
  }

  /**
   * 获取余额和返现
   */
  @Get('balance-cashback')
  @RequirePermission('sms.read')
  @ApiOperation({
    summary: '获取SMS-Activate余额和返现',
    description: '查询SMS-Activate账户余额及返现信息',
  })
  @ApiResponse({ status: 200, description: '成功返回余额和返现', type: SmsActivateBalanceAndCashBackDto })
  async getBalanceAndCashBack(): Promise<SmsActivateBalanceAndCashBackDto> {
    this.logger.log('Get SMS-Activate balance and cashback');
    return await this.smsActivateService.getBalanceAndCashBack();
  }

  // ============================================
  // 国家和运营商
  // ============================================

  /**
   * 获取国家列表
   */
  @Get('countries')
  @RequirePermission('sms.read')
  @ApiOperation({
    summary: '获取SMS-Activate支持的国家列表',
    description: '查询SMS-Activate支持的所有国家和地区',
  })
  @ApiResponse({ status: 200, description: '成功返回国家列表', type: [SmsActivateCountryDto] })
  async getCountries(): Promise<SmsActivateCountryDto[]> {
    this.logger.log('Get SMS-Activate countries');
    return await this.smsActivateService.getCountries();
  }

  /**
   * 获取可用号码数量
   */
  @Get('numbers-status')
  @RequirePermission('sms.read')
  @ApiOperation({
    summary: '获取可用号码数量',
    description: '查询指定国家/运营商的各服务可用号码数量',
  })
  @ApiResponse({ status: 200, description: '成功返回可用号码数量' })
  async getNumbersStatus(@Query() query: SmsActivateNumbersStatusQueryDto) {
    this.logger.log(`Get numbers status: country=${query.country}, operator=${query.operator}`);
    return await this.smsActivateService.getNumbersStatus(query.country, query.operator);
  }

  /**
   * 获取热门国家（按服务）
   */
  @Get('top-countries')
  @RequirePermission('sms.read')
  @ApiOperation({
    summary: '获取热门国家',
    description: '按服务获取价格最优的热门国家列表',
  })
  @ApiResponse({ status: 200, description: '成功返回热门国家', type: [SmsActivateTopCountryDto] })
  async getTopCountriesByService(
    @Query() query: SmsActivateTopCountriesQueryDto,
  ): Promise<SmsActivateTopCountryDto[]> {
    this.logger.log(`Get top countries for service: ${query.service}`);
    return await this.smsActivateService.getTopCountriesByService(query.service, query.freePrice);
  }

  // ============================================
  // 号码获取
  // ============================================

  /**
   * 获取虚拟号码
   */
  @Post('number')
  @RequirePermission('sms.request')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: '获取SMS-Activate虚拟号码',
    description: '从SMS-Activate购买虚拟号码用于短信验证',
  })
  @ApiResponse({ status: 201, description: '成功获取号码' })
  async getNumber(@Body() dto: SmsActivateGetNumberDto) {
    this.logger.log(`Get number: service=${dto.service}, country=${dto.country || 0}`);
    return await this.smsActivateService.getNumber(dto.service, dto.country || 0, {
      operator: dto.operator,
      forward: dto.forward,
      phoneException: dto.phoneException,
    });
  }

  /**
   * 获取多服务号码
   */
  @Post('multi-service-number')
  @RequirePermission('sms.request')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: '获取多服务号码',
    description: '获取一个号码用于多个服务的验证',
  })
  @ApiResponse({ status: 201, description: '成功获取多服务号码' })
  async getMultiServiceNumber(@Body() dto: SmsActivateMultiServiceDto) {
    this.logger.log(`Get multi-service number: services=${dto.services.join(',')}`);
    return await this.smsActivateService.getMultiServiceNumber(dto.services, dto.country || 0, {
      operator: dto.operator,
      forward: dto.forward,
      phoneException: dto.phoneException,
    });
  }

  /**
   * 获取额外服务
   */
  @Post('additional-service')
  @RequirePermission('sms.request')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: '获取额外服务',
    description: '为已有的激活获取额外服务（用于转发号码）',
  })
  @ApiResponse({ status: 201, description: '成功获取额外服务' })
  async getAdditionalService(@Body() dto: SmsActivateAdditionalServiceDto) {
    this.logger.log(`Get additional service: ${dto.service} for ${dto.parentActivationId}`);
    return await this.smsActivateService.getAdditionalService(dto.service, dto.parentActivationId);
  }

  // ============================================
  // 激活状态管理
  // ============================================

  /**
   * 获取激活状态
   */
  @Get('activations/:activationId/status')
  @RequirePermission('sms.read')
  @ApiOperation({
    summary: '获取激活状态',
    description: '查询指定激活的当前状态和验证码',
  })
  @ApiParam({ name: 'activationId', description: '激活ID' })
  @ApiResponse({ status: 200, description: '成功返回激活状态' })
  async getStatus(@Param('activationId') activationId: string) {
    this.logger.log(`Get status for activation: ${activationId}`);
    return await this.smsActivateService.getStatus(activationId);
  }

  /**
   * 获取完整短信
   */
  @Get('activations/:activationId/full-sms')
  @RequirePermission('sms.messages')
  @ApiOperation({
    summary: '获取完整短信内容',
    description: '获取激活收到的完整短信内容',
  })
  @ApiParam({ name: 'activationId', description: '激活ID' })
  @ApiResponse({ status: 200, description: '成功返回完整短信', type: SmsActivateFullSmsDto })
  async getFullSms(@Param('activationId') activationId: string): Promise<SmsActivateFullSmsDto> {
    this.logger.log(`Get full SMS for activation: ${activationId}`);
    return await this.smsActivateService.getFullSms(activationId);
  }

  /**
   * 设置激活状态
   */
  @Post('activations/set-status')
  @RequirePermission('sms.finish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '设置激活状态',
    description: '设置激活状态（1=准备，3=重发，6=完成，8=取消）',
  })
  @ApiResponse({ status: 200, description: '成功设置状态', type: SmsActivateSuccessDto })
  async setStatus(@Body() dto: SmsActivateSetStatusDto): Promise<SmsActivateSuccessDto> {
    this.logger.log(`Set status for ${dto.activationId}: ${dto.status}`);
    await this.smsActivateService.setStatus(dto.activationId, dto.status);
    return {
      success: true,
      message: `Status ${dto.status} set for activation ${dto.activationId}`,
    };
  }

  /**
   * 完成激活
   */
  @Post('activations/:activationId/finish')
  @RequirePermission('sms.finish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '完成激活',
    description: '标记激活为成功完成',
  })
  @ApiParam({ name: 'activationId', description: '激活ID' })
  @ApiResponse({ status: 200, description: '成功完成激活', type: SmsActivateSuccessDto })
  async finish(@Param('activationId') activationId: string): Promise<SmsActivateSuccessDto> {
    this.logger.log(`Finish activation: ${activationId}`);
    await this.smsActivateService.finish(activationId);
    return {
      success: true,
      message: `Activation ${activationId} finished successfully`,
    };
  }

  /**
   * 取消激活
   */
  @Post('activations/:activationId/cancel')
  @RequirePermission('sms.cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '取消激活',
    description: '取消激活并申请退款',
  })
  @ApiParam({ name: 'activationId', description: '激活ID' })
  @ApiResponse({ status: 200, description: '成功取消激活', type: SmsActivateSuccessDto })
  async cancel(@Param('activationId') activationId: string): Promise<SmsActivateSuccessDto> {
    this.logger.log(`Cancel activation: ${activationId}`);
    await this.smsActivateService.cancel(activationId);
    return {
      success: true,
      message: `Activation ${activationId} cancelled successfully`,
    };
  }

  /**
   * 请求重发短信
   */
  @Post('activations/:activationId/resend')
  @RequirePermission('sms.request')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '请求重发短信',
    description: '请求重新发送验证码短信',
  })
  @ApiParam({ name: 'activationId', description: '激活ID' })
  @ApiResponse({ status: 200, description: '成功请求重发', type: SmsActivateSuccessDto })
  async requestResend(@Param('activationId') activationId: string): Promise<SmsActivateSuccessDto> {
    this.logger.log(`Request resend for activation: ${activationId}`);
    await this.smsActivateService.requestResend(activationId);
    return {
      success: true,
      message: `Resend requested for activation ${activationId}`,
    };
  }

  /**
   * 获取当前激活列表
   */
  @Get('activations/current')
  @RequirePermission('sms.read')
  @ApiOperation({
    summary: '获取当前激活列表',
    description: '获取所有正在进行的激活',
  })
  @ApiResponse({ status: 200, description: '成功返回当前激活列表', type: [SmsActivateCurrentActivationDto] })
  async getCurrentActivations(): Promise<SmsActivateCurrentActivationDto[]> {
    this.logger.log('Get current activations');
    return await this.smsActivateService.getCurrentActivations();
  }

  // ============================================
  // 定价
  // ============================================

  /**
   * 获取价格
   */
  @Get('prices')
  @RequirePermission('sms.read')
  @ApiOperation({
    summary: '获取价格信息',
    description: '查询服务/国家的价格和可用数量',
  })
  @ApiResponse({ status: 200, description: '成功返回价格信息' })
  async getPrices(@Query() query: SmsActivatePriceQueryDto) {
    this.logger.log(`Get prices: service=${query.service}, country=${query.country}`);
    return await this.smsActivateService.getPrices(query.service, query.country);
  }

  /**
   * 获取服务和成本
   */
  @Get('services-cost')
  @RequirePermission('sms.read')
  @ApiOperation({
    summary: '获取服务和成本',
    description: '获取所有服务的价格和可用数量',
  })
  @ApiResponse({ status: 200, description: '成功返回服务和成本' })
  async getServicesAndCost(@Query('country') country?: number) {
    this.logger.log(`Get services and cost: country=${country}`);
    return await this.smsActivateService.getServicesAndCost(country);
  }

  // ============================================
  // 租赁管理
  // ============================================

  /**
   * 获取租赁支持的服务和国家
   */
  @Get('rent/services-countries')
  @RequirePermission('sms.read')
  @ApiOperation({
    summary: '获取租赁支持的服务和国家',
    description: '查询支持租赁的服务和国家列表',
  })
  @ApiResponse({ status: 200, description: '成功返回租赁服务和国家' })
  async getRentServicesAndCountries(@Query() query: SmsActivateRentServicesQueryDto) {
    this.logger.log(`Get rent services and countries: time=${query.time}`);
    return await this.smsActivateService.getRentServicesAndCountries(
      query.time,
      query.operator,
      query.country,
    );
  }

  /**
   * 租赁号码
   */
  @Post('rent')
  @RequirePermission('sms.request')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: '租赁号码',
    description: '租赁号码用于长期接收短信',
  })
  @ApiResponse({ status: 201, description: '成功租赁号码' })
  async rentNumber(@Body() dto: SmsActivateRentNumberDto) {
    this.logger.log(
      `Rent number: service=${dto.service}, country=${dto.country || 0}, hours=${dto.hours || 4}`,
    );
    return await this.smsActivateService.rentNumber(dto.service, dto.country || 0, dto.hours || 4, {
      operator: dto.operator,
      webhookUrl: dto.webhookUrl,
    });
  }

  /**
   * 获取租赁状态
   */
  @Get('rent/:rentId/status')
  @RequirePermission('sms.read')
  @ApiOperation({
    summary: '获取租赁状态',
    description: '查询租赁号码的状态和收到的短信',
  })
  @ApiParam({ name: 'rentId', description: '租赁ID' })
  @ApiResponse({ status: 200, description: '成功返回租赁状态', type: SmsActivateRentStatusDto })
  async getRentStatus(@Param('rentId') rentId: string): Promise<SmsActivateRentStatusDto> {
    this.logger.log(`Get rent status: ${rentId}`);
    return await this.smsActivateService.getRentStatus(rentId);
  }

  /**
   * 设置租赁状态
   */
  @Post('rent/set-status')
  @RequirePermission('sms.finish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '设置租赁状态',
    description: '设置租赁状态（1=完成，2=取消）',
  })
  @ApiResponse({ status: 200, description: '成功设置租赁状态', type: SmsActivateSuccessDto })
  async setRentStatus(@Body() dto: SmsActivateSetRentStatusDto): Promise<SmsActivateSuccessDto> {
    this.logger.log(`Set rent status for ${dto.rentId}: ${dto.status}`);
    const result = await this.smsActivateService.setRentStatus(dto.rentId, dto.status);
    return {
      success: true,
      message: `Rent status ${dto.status} set for ${dto.rentId}`,
      data: { status: result },
    };
  }

  /**
   * 完成租赁
   */
  @Post('rent/:rentId/finish')
  @RequirePermission('sms.finish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '完成租赁',
    description: '标记租赁为成功完成',
  })
  @ApiParam({ name: 'rentId', description: '租赁ID' })
  @ApiResponse({ status: 200, description: '成功完成租赁', type: SmsActivateSuccessDto })
  async finishRent(@Param('rentId') rentId: string): Promise<SmsActivateSuccessDto> {
    this.logger.log(`Finish rent: ${rentId}`);
    await this.smsActivateService.finishRent(rentId);
    return {
      success: true,
      message: `Rent ${rentId} finished successfully`,
    };
  }

  /**
   * 取消租赁
   */
  @Post('rent/:rentId/cancel')
  @RequirePermission('sms.cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '取消租赁',
    description: '取消租赁',
  })
  @ApiParam({ name: 'rentId', description: '租赁ID' })
  @ApiResponse({ status: 200, description: '成功取消租赁', type: SmsActivateSuccessDto })
  async cancelRent(@Param('rentId') rentId: string): Promise<SmsActivateSuccessDto> {
    this.logger.log(`Cancel rent: ${rentId}`);
    await this.smsActivateService.cancelRent(rentId);
    return {
      success: true,
      message: `Rent ${rentId} cancelled successfully`,
    };
  }

  /**
   * 获取租赁列表
   */
  @Get('rent/list')
  @RequirePermission('sms.read')
  @ApiOperation({
    summary: '获取租赁列表',
    description: '获取所有租赁号码列表',
  })
  @ApiResponse({ status: 200, description: '成功返回租赁列表', type: [SmsActivateRentItemDto] })
  async getRentList(): Promise<SmsActivateRentItemDto[]> {
    this.logger.log('Get rent list');
    return await this.smsActivateService.getRentList();
  }

  // ============================================
  // 其他
  // ============================================

  /**
   * 获取 QIWI 充值信息
   */
  @Get('qiwi-requisites')
  @RequirePermission('sms.read')
  @ApiOperation({
    summary: '获取QIWI充值信息',
    description: '获取用于账户充值的QIWI钱包信息',
  })
  @ApiResponse({ status: 200, description: '成功返回QIWI信息' })
  async getQiwiRequisites() {
    this.logger.log('Get QIWI requisites');
    return await this.smsActivateService.getQiwiRequisites();
  }

  /**
   * 获取服务代码映射
   */
  @Get('service-mapping')
  @RequirePermission('sms.read')
  @ApiOperation({
    summary: '获取服务代码映射',
    description: '获取友好服务名称到SMS-Activate服务代码的映射',
  })
  @ApiResponse({ status: 200, description: '成功返回服务映射', type: SmsActivateServiceMappingDto })
  async getServiceMapping(): Promise<SmsActivateServiceMappingDto> {
    this.logger.log('Get service mapping');
    return {
      mapping: this.smsActivateService.getServiceMapping(),
    };
  }

  /**
   * 清除缓存
   */
  @Post('cache/clear')
  @RequirePermission('sms.admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '清除SMS-Activate适配器缓存',
    description: '清除缓存，用于配置更新后强制重新初始化（管理员功能）',
  })
  @ApiResponse({ status: 200, description: '缓存已清除', type: SmsActivateSuccessDto })
  async clearCache(): Promise<SmsActivateSuccessDto> {
    this.logger.log('Clearing SMS-Activate adapter cache');
    this.smsActivateService.clearCache();
    return {
      success: true,
      message: 'SMS-Activate adapter cache cleared successfully',
    };
  }

  /**
   * 健康检查
   */
  @Get('health')
  @RequirePermission('sms.read')
  @ApiOperation({
    summary: 'SMS-Activate健康检查',
    description: '检查SMS-Activate连接是否正常',
  })
  @ApiResponse({ status: 200, description: '返回健康状态' })
  async healthCheck() {
    this.logger.log('SMS-Activate health check');
    const healthy = await this.smsActivateService.healthCheck();
    return {
      healthy,
      provider: 'sms-activate',
      timestamp: new Date().toISOString(),
    };
  }
}
