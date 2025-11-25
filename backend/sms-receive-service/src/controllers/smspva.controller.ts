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
import { SmspvaService } from '../services/smspva.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import {
  SmspvaGetNumberDto,
  SmspvaGetSmsDto,
  SmspvaSetStatusDto,
  SmspvaUserInfoDto,
  SmspvaBalanceDto,
  SmspvaCountInfoDto,
  SmspvaSmsResultDto,
  SmspvaSuccessDto,
} from '../dto/smspva.dto';

/**
 * SMSPVA Controller
 *
 * 提供 SMSPVA SMS平台的 API 功能：
 * - 用户信息和余额查询
 * - 获取虚拟号码
 * - 短信查询
 * - 号码状态管理（拒绝、关闭、禁用）
 */
@ApiTags('SMSPVA')
@Controller('sms/smspva')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class SmspvaController {
  private readonly logger = new Logger(SmspvaController.name);

  constructor(private readonly smspvaService: SmspvaService) {}

  /**
   * 获取用户信息
   */
  @Get('user')
  @RequirePermission('sms.read')
  @ApiOperation({
    summary: '获取SMSPVA用户信息',
    description: '查询SMSPVA账户的用户信息，包括余额、Karma等',
  })
  @ApiResponse({
    status: 200,
    description: '成功返回用户信息',
    type: SmspvaUserInfoDto,
  })
  async getUserInfo(): Promise<SmspvaUserInfoDto> {
    this.logger.log('Get SMSPVA user info');
    return await this.smspvaService.getUserInfo();
  }

  /**
   * 获取余额
   */
  @Get('balance')
  @RequirePermission('sms.read')
  @ApiOperation({
    summary: '获取SMSPVA账户余额',
    description: '查询SMSPVA账户的当前余额',
  })
  @ApiResponse({
    status: 200,
    description: '成功返回余额信息',
    type: SmspvaBalanceDto,
  })
  async getBalance() {
    this.logger.log('Get SMSPVA balance');
    return await this.smspvaService.getBalance();
  }

  /**
   * 获取可用号码数量
   */
  @Get('count')
  @RequirePermission('sms.read')
  @ApiOperation({
    summary: '获取SMSPVA可用号码数量',
    description: '查询特定服务和国家的可用号码数量',
  })
  @ApiQuery({ name: 'serviceId', required: true, type: Number, description: '服务ID' })
  @ApiQuery({ name: 'countryId', required: true, type: Number, description: '国家ID' })
  @ApiResponse({
    status: 200,
    description: '成功返回数量信息',
    type: SmspvaCountInfoDto,
  })
  async getCount(
    @Query('serviceId') serviceId: number,
    @Query('countryId') countryId: number,
  ): Promise<SmspvaCountInfoDto> {
    this.logger.log(`Get SMSPVA count: serviceId=${serviceId}, countryId=${countryId}`);
    return await this.smspvaService.getCount(serviceId, countryId);
  }

  /**
   * 获取虚拟号码
   */
  @Post('number')
  @RequirePermission('sms.request')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: '获取SMSPVA虚拟号码',
    description: '从SMSPVA获取一个虚拟号码用于接收短信验证码',
  })
  @ApiResponse({
    status: 201,
    description: '成功获取号码',
    schema: {
      type: 'object',
      properties: {
        activationId: { type: 'string', example: '12345' },
        phoneNumber: { type: 'string', example: '+79001234567' },
        country: { type: 'string', example: '1' },
        cost: { type: 'number', example: 0.20 },
      },
    },
  })
  async getNumber(@Body() dto: SmspvaGetNumberDto) {
    this.logger.log(`Get SMSPVA number: serviceId=${dto.serviceId}, countryId=${dto.countryId || 1}`);
    return await this.smspvaService.getNumber(dto.serviceId, dto.countryId);
  }

  /**
   * 获取短信
   */
  @Get('sms/:numberId')
  @RequirePermission('sms.messages')
  @ApiOperation({
    summary: '获取SMSPVA短信',
    description: '查询指定订单ID收到的短信',
  })
  @ApiParam({ name: 'numberId', description: '订单ID' })
  @ApiQuery({ name: 'notClose', required: false, type: Boolean, description: '是否保持订单打开' })
  @ApiResponse({
    status: 200,
    description: '成功返回短信',
    type: SmspvaSmsResultDto,
  })
  async getSms(
    @Param('numberId') numberId: string,
    @Query('notClose') notClose?: boolean,
  ): Promise<SmspvaSmsResultDto> {
    this.logger.log(`Get SMSPVA SMS: numberId=${numberId}, notClose=${notClose}`);
    return await this.smspvaService.getSms(numberId, notClose);
  }

  /**
   * 获取号码状态
   */
  @Get('status/:activationId')
  @RequirePermission('sms.read')
  @ApiOperation({
    summary: '获取SMSPVA号码状态',
    description: '查询指定激活ID的号码状态',
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
    this.logger.log(`Get SMSPVA status: ${activationId}`);
    return await this.smspvaService.getStatus(activationId);
  }

  /**
   * 设置号码状态
   */
  @Post('status')
  @RequirePermission('sms.request')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '设置SMSPVA号码状态',
    description: '对号码执行操作：deny（拒绝）、close（关闭）、ban（禁用）',
  })
  @ApiResponse({
    status: 200,
    description: '成功设置状态',
    type: SmspvaSuccessDto,
  })
  async setStatus(@Body() dto: SmspvaSetStatusDto): Promise<SmspvaSuccessDto> {
    this.logger.log(`Set SMSPVA status: ${dto.numberId} -> ${dto.action}`);

    switch (dto.action) {
      case 'deny':
        await this.smspvaService.denyNumber(dto.numberId);
        break;
      case 'close':
        await this.smspvaService.closeNumber(dto.numberId);
        break;
      case 'ban':
        await this.smspvaService.banNumber(dto.numberId);
        break;
    }

    return {
      success: true,
      message: `Action '${dto.action}' executed for number ${dto.numberId}`,
    };
  }

  /**
   * 拒绝/取消号码
   */
  @Post('deny/:numberId')
  @RequirePermission('sms.cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '拒绝SMSPVA号码',
    description: '拒绝指定订单ID的号码',
  })
  @ApiParam({ name: 'numberId', description: '订单ID' })
  @ApiResponse({
    status: 200,
    description: '成功拒绝号码',
    type: SmspvaSuccessDto,
  })
  async denyNumber(@Param('numberId') numberId: string): Promise<SmspvaSuccessDto> {
    this.logger.log(`Deny SMSPVA number: ${numberId}`);
    await this.smspvaService.denyNumber(numberId);
    return {
      success: true,
      message: `Number ${numberId} denied successfully`,
    };
  }

  /**
   * 关闭订单
   */
  @Post('close/:numberId')
  @RequirePermission('sms.request')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '关闭SMSPVA订单',
    description: '关闭指定订单ID，标记为完成',
  })
  @ApiParam({ name: 'numberId', description: '订单ID' })
  @ApiResponse({
    status: 200,
    description: '成功关闭订单',
    type: SmspvaSuccessDto,
  })
  async closeNumber(@Param('numberId') numberId: string): Promise<SmspvaSuccessDto> {
    this.logger.log(`Close SMSPVA number: ${numberId}`);
    await this.smspvaService.closeNumber(numberId);
    return {
      success: true,
      message: `Number ${numberId} closed successfully`,
    };
  }

  /**
   * 禁用号码
   */
  @Post('ban/:numberId')
  @RequirePermission('sms.cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '禁用SMSPVA号码',
    description: '将指定订单ID的号码标记为禁用',
  })
  @ApiParam({ name: 'numberId', description: '订单ID' })
  @ApiResponse({
    status: 200,
    description: '成功禁用号码',
    type: SmspvaSuccessDto,
  })
  async banNumber(@Param('numberId') numberId: string): Promise<SmspvaSuccessDto> {
    this.logger.log(`Ban SMSPVA number: ${numberId}`);
    await this.smspvaService.banNumber(numberId);
    return {
      success: true,
      message: `Number ${numberId} banned successfully`,
    };
  }

  /**
   * 请求下一条短信
   */
  @Post('next-sms/:numberId')
  @RequirePermission('sms.request')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '请求SMSPVA下一条短信',
    description: '请求接收下一条短信',
  })
  @ApiParam({ name: 'numberId', description: '订单ID' })
  @ApiResponse({
    status: 200,
    description: '成功请求',
    type: SmspvaSmsResultDto,
  })
  async searchNextSms(@Param('numberId') numberId: string): Promise<SmspvaSmsResultDto> {
    this.logger.log(`Search next SMS for SMSPVA number: ${numberId}`);
    return await this.smspvaService.searchNextSms(numberId);
  }

  /**
   * 等待短信
   */
  @Get('wait/:activationId')
  @RequirePermission('sms.messages')
  @ApiOperation({
    summary: '等待SMSPVA短信',
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
    this.logger.log(`Wait for SMSPVA SMS: ${activationId}`);
    return await this.smspvaService.waitForSms(
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
    summary: '获取SMSPVA服务代码映射',
    description: '查询内部服务代码到SMSPVA服务ID的映射关系',
  })
  @ApiResponse({
    status: 200,
    description: '成功返回映射表',
  })
  async getServiceMapping() {
    this.logger.log('Get SMSPVA service mapping');
    const mapping = await this.smspvaService.getServiceMapping();
    return { mapping };
  }

  /**
   * 健康检查
   */
  @Get('health')
  @RequirePermission('sms.read')
  @ApiOperation({
    summary: 'SMSPVA健康检查',
    description: '检查SMSPVA API连接状态',
  })
  @ApiResponse({
    status: 200,
    description: '返回健康状态',
  })
  async healthCheck() {
    this.logger.log('SMSPVA health check');
    const healthy = await this.smspvaService.healthCheck();
    return { healthy, provider: 'smspva' };
  }

  /**
   * 清除缓存
   */
  @Post('cache/clear')
  @RequirePermission('sms.admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '清除SMSPVA适配器缓存',
    description: '清除SMSPVA适配器的缓存，用于配置更新后强制重新初始化',
  })
  @ApiResponse({
    status: 200,
    description: '缓存已清除',
    type: SmspvaSuccessDto,
  })
  async clearCache(): Promise<SmspvaSuccessDto> {
    this.logger.log('Clearing SMSPVA adapter cache');
    this.smspvaService.clearCache();
    return {
      success: true,
      message: 'SMSPVA adapter cache cleared successfully',
    };
  }
}
