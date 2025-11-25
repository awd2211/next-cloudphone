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
import { FiveSimService } from '../services/5sim.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import {
  FiveSimOrderQueryDto,
  FiveSimOrderDto,
  FiveSimPaymentDto,
  FiveSimSmsDto,
  FiveSimMaxPriceDto,
  RentNumberDto,
  FiveSimCountryDto,
  FiveSimOperatorDto,
  FiveSimSuccessDto,
  FiveSimPriceQueryDto,
  FiveSimNotificationDto,
  FiveSimNotificationQueryDto,
  FiveSimSetMaxPriceDto,
  FiveSimDeleteMaxPriceDto,
} from '../dto/5sim.dto';

/**
 * 5sim 高级功能 Controller
 *
 * 提供 5sim 特有的高级功能：
 * - 订单历史查询
 * - 支付记录查询
 * - 短信收件箱
 * - 价格上限管理
 * - 号码长期租用
 * - 国家和运营商查询
 * - 号码操作（标记、重用）
 */
@ApiTags('5sim Advanced Features')
@Controller('sms/5sim')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class FiveSimController {
  private readonly logger = new Logger(FiveSimController.name);

  constructor(private readonly fiveSimService: FiveSimService) {}

  /**
   * 获取订单列表
   */
  @Get('orders')
  @RequirePermission('sms.read')
  @ApiOperation({
    summary: '获取5sim订单历史',
    description: '查询5sim的订单历史，支持分类、分页和排序',
  })
  @ApiQuery({ name: 'category', required: false, enum: ['activation', 'hosting'] })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'offset', required: false, type: Number, example: 0 })
  @ApiQuery({ name: 'order', required: false, enum: ['id', 'date'] })
  @ApiQuery({ name: 'reverse', required: false, type: Boolean })
  @ApiResponse({
    status: 200,
    description: '成功返回订单列表',
    type: [FiveSimOrderDto],
  })
  async getOrders(@Query() query: FiveSimOrderQueryDto): Promise<FiveSimOrderDto[]> {
    this.logger.log(`Get 5sim orders: ${JSON.stringify(query)}`);
    return await this.fiveSimService.getOrders(query);
  }

  /**
   * 获取支付历史
   */
  @Get('payments')
  @RequirePermission('sms.read')
  @ApiOperation({
    summary: '获取5sim支付历史',
    description: '查询5sim账户的所有支付记录',
  })
  @ApiResponse({
    status: 200,
    description: '成功返回支付记录',
    type: [FiveSimPaymentDto],
  })
  async getPayments(): Promise<FiveSimPaymentDto[]> {
    this.logger.log('Get 5sim payment history');
    return await this.fiveSimService.getPayments();
  }

  /**
   * 获取短信收件箱
   */
  @Get('orders/:orderId/inbox')
  @RequirePermission('sms.messages')
  @ApiOperation({
    summary: '获取订单的短信收件箱',
    description: '查询租用号码收到的所有短信消息',
  })
  @ApiParam({ name: 'orderId', description: '订单ID（5sim订单ID）' })
  @ApiResponse({
    status: 200,
    description: '成功返回短信列表',
    type: [FiveSimSmsDto],
  })
  async getSmsInbox(@Param('orderId') orderId: string): Promise<FiveSimSmsDto[]> {
    this.logger.log(`Get SMS inbox for order: ${orderId}`);
    return await this.fiveSimService.getSmsInbox(orderId);
  }

  /**
   * 获取价格上限
   */
  @Get('max-prices')
  @RequirePermission('sms.read')
  @ApiOperation({
    summary: '获取5sim价格上限设置',
    description: '查询5sim账户设置的各服务价格上限',
  })
  @ApiResponse({
    status: 200,
    description: '成功返回价格上限设置',
    type: [FiveSimMaxPriceDto],
  })
  async getMaxPrices(): Promise<Record<string, any>> {
    this.logger.log('Get 5sim max prices');
    return await this.fiveSimService.getMaxPrices();
  }

  /**
   * 租用号码（长期）
   */
  @Post('rent')
  @RequirePermission('sms.request')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: '租用5sim号码（长期）',
    description: '租用5sim号码用于长期使用（1-8760小时），适用于需要持久接收短信的场景',
  })
  @ApiResponse({
    status: 201,
    description: '成功租用号码',
    schema: {
      type: 'object',
      properties: {
        activationId: { type: 'string', example: '12345' },
        phoneNumber: { type: 'string', example: '+79001234567' },
        country: { type: 'string', example: 'russia' },
        cost: { type: 'number', example: 15.5 },
        expiresAt: { type: 'string', example: '2024-01-16T10:30:00Z' },
      },
    },
  })
  async rentNumber(@Body() dto: RentNumberDto) {
    this.logger.log(
      `Rent 5sim number: service=${dto.service}, country=${dto.country}, hours=${dto.hours || 24}`,
    );
    return await this.fiveSimService.rentNumber(dto.service, dto.country, dto.hours);
  }

  /**
   * 获取国家列表
   */
  @Get('countries')
  @RequirePermission('sms.read')
  @ApiOperation({
    summary: '获取5sim支持的国家列表',
    description: '查询5sim支持的所有国家和地区',
  })
  @ApiResponse({
    status: 200,
    description: '成功返回国家列表',
    type: [FiveSimCountryDto],
  })
  async getCountries(): Promise<FiveSimCountryDto[]> {
    this.logger.log('Get 5sim countries');
    return await this.fiveSimService.getCountries();
  }

  /**
   * 获取产品/服务列表
   */
  @Get('countries/:country/products')
  @RequirePermission('sms.read')
  @ApiOperation({
    summary: '获取指定国家的可用服务列表',
    description: '查询5sim在特定国家支持的所有服务/产品，包含价格和可用数量',
  })
  @ApiParam({ name: 'country', description: '国家代码或名称', example: 'russia' })
  @ApiResponse({
    status: 200,
    description: '成功返回服务列表',
    schema: {
      type: 'object',
      example: {
        telegram: { cost: 15.5, count: 1000 },
        whatsapp: { cost: 20.0, count: 500 },
      },
    },
  })
  async getProducts(@Param('country') country: string) {
    this.logger.log(`Get 5sim products for country: ${country}`);
    return await this.fiveSimService.getProducts(country);
  }

  /**
   * 获取运营商列表
   */
  @Get('countries/:country/operators')
  @RequirePermission('sms.read')
  @ApiOperation({
    summary: '获取指定国家的运营商列表',
    description: '查询5sim在特定国家支持的所有运营商',
  })
  @ApiParam({ name: 'country', description: '国家代码或名称', example: 'russia' })
  @ApiResponse({
    status: 200,
    description: '成功返回运营商列表',
    type: [FiveSimOperatorDto],
  })
  async getOperators(@Param('country') country: string): Promise<FiveSimOperatorDto[]> {
    this.logger.log(`Get 5sim operators for country: ${country}`);
    return await this.fiveSimService.getOperators(country);
  }

  /**
   * 标记号码为不可用
   */
  @Post('orders/:orderId/ban')
  @RequirePermission('sms.cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '标记号码为不可用',
    description: '将号码标记为不可用，避免再次使用该号码',
  })
  @ApiParam({ name: 'orderId', description: '订单ID（5sim订单ID）' })
  @ApiResponse({
    status: 200,
    description: '成功标记号码',
    type: FiveSimSuccessDto,
  })
  async banNumber(@Param('orderId') orderId: string): Promise<FiveSimSuccessDto> {
    this.logger.log(`Ban 5sim number: ${orderId}`);
    const result = await this.fiveSimService.banNumber(orderId);
    return {
      success: true,
      message: `Number ${orderId} has been banned successfully`,
      data: result,
    };
  }

  /**
   * 重用号码
   */
  @Post('reuse')
  @RequirePermission('sms.request')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '重用之前的号码',
    description: '重新使用之前租用过的号码，如果该号码仍然可用',
  })
  @ApiResponse({
    status: 200,
    description: '成功重用号码',
    schema: {
      type: 'object',
      properties: {
        activationId: { type: 'string', example: '12346' },
        phoneNumber: { type: 'string', example: '+79001234567' },
        country: { type: 'string', example: 'russia' },
        cost: { type: 'number', example: 15.5 },
      },
    },
  })
  async reuseNumber(
    @Body() body: { product: string; phoneNumber: string },
  ) {
    this.logger.log(`Reuse 5sim number: ${body.phoneNumber} for product: ${body.product}`);
    return await this.fiveSimService.reuseNumber(body.product, body.phoneNumber);
  }

  /**
   * 清除5sim适配器缓存
   */
  @Post('cache/clear')
  @RequirePermission('sms.admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '清除5sim适配器缓存',
    description: '清除5sim适配器的缓存，用于配置更新后强制重新初始化（管理员功能）',
  })
  @ApiResponse({
    status: 200,
    description: '缓存已清除',
    type: FiveSimSuccessDto,
  })
  async clearCache(): Promise<FiveSimSuccessDto> {
    this.logger.log('Clearing 5sim adapter cache');
    this.fiveSimService.clearCache();
    return {
      success: true,
      message: '5sim adapter cache cleared successfully',
    };
  }

  /**
   * 获取价格信息
   */
  @Get('prices')
  @RequirePermission('sms.read')
  @ApiOperation({
    summary: '获取5sim价格信息',
    description: '查询5sim特定国家和产品的价格信息，包含各运营商价格和可用数量',
  })
  @ApiQuery({ name: 'country', required: false, description: '国家代码或名称', example: 'russia' })
  @ApiQuery({ name: 'product', required: false, description: '产品/服务代码', example: 'telegram' })
  @ApiResponse({
    status: 200,
    description: '成功返回价格信息',
    schema: {
      type: 'object',
      example: {
        russia: {
          telegram: {
            mts: { cost: 15.5, count: 1000, rate: 0.95 },
            beeline: { cost: 14.0, count: 500 },
          },
        },
      },
    },
  })
  async getPrices(@Query() query: FiveSimPriceQueryDto) {
    this.logger.log(`Get 5sim prices: country=${query.country || 'all'}, product=${query.product || 'all'}`);
    return await this.fiveSimService.getPrices(query.country, query.product);
  }

  /**
   * 获取系统通知
   */
  @Get('notifications')
  @RequirePermission('sms.read')
  @ApiOperation({
    summary: '获取5sim系统通知',
    description: '获取5sim平台的系统公告和通知',
  })
  @ApiQuery({ name: 'language', required: false, description: '语言代码', example: 'en', enum: ['en', 'ru', 'cn', 'de', 'fr', 'es'] })
  @ApiResponse({
    status: 200,
    description: '成功返回系统通知列表',
    type: [FiveSimNotificationDto],
  })
  async getNotifications(@Query() query: FiveSimNotificationQueryDto): Promise<FiveSimNotificationDto[]> {
    this.logger.log(`Get 5sim notifications: language=${query.language || 'en'}`);
    return await this.fiveSimService.getNotifications(query.language);
  }

  /**
   * 设置价格上限
   */
  @Post('max-prices')
  @RequirePermission('sms.admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '设置5sim价格上限',
    description: '为特定国家和产品设置购买价格上限，超过此价格的号码将不会被购买',
  })
  @ApiResponse({
    status: 200,
    description: '成功设置价格上限',
    type: FiveSimSuccessDto,
  })
  async setMaxPrice(@Body() dto: FiveSimSetMaxPriceDto): Promise<FiveSimSuccessDto> {
    this.logger.log(`Set max price: ${dto.country}/${dto.product} = ${dto.price}`);
    await this.fiveSimService.setMaxPrice(dto.country, dto.product, dto.price);
    return {
      success: true,
      message: `Max price for ${dto.country}/${dto.product} set to ${dto.price}`,
    };
  }

  /**
   * 删除价格上限
   */
  @Post('max-prices/delete')
  @RequirePermission('sms.admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '删除5sim价格上限',
    description: '删除特定国家和产品的价格上限设置',
  })
  @ApiResponse({
    status: 200,
    description: '成功删除价格上限',
    type: FiveSimSuccessDto,
  })
  async deleteMaxPrice(@Body() dto: FiveSimDeleteMaxPriceDto): Promise<FiveSimSuccessDto> {
    this.logger.log(`Delete max price: ${dto.country}/${dto.product}`);
    await this.fiveSimService.deleteMaxPrice(dto.country, dto.product);
    return {
      success: true,
      message: `Max price for ${dto.country}/${dto.product} deleted`,
    };
  }
}
