import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { PaymentsService } from './payments.service';
import {
  CreatePaymentDto,
  RefundPaymentDto,
  QueryPaymentDto,
} from './dto/create-payment.dto';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * 创建支付订单
   * 🔒 限流: 5分钟内最多10次 (防止恶意创建订单)
   */
  @Post()
  @ApiBearerAuth()
  @Throttle({ default: { limit: 10, ttl: 300000 } })
  @ApiOperation({ summary: '创建支付订单' })
  @ApiResponse({ status: 201, description: '支付订单创建成功' })
  @ApiResponse({ status: 429, description: '创建订单过于频繁，请稍后再试' })
  async create(
    @Body() createPaymentDto: CreatePaymentDto,
    @Headers('user-id') userId: string,
  ) {
    const payment = await this.paymentsService.createPayment(
      createPaymentDto,
      userId,
    );
    return {
      success: true,
      data: payment,
      message: '支付订单创建成功',
    };
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取支付列表' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async findAll(@Headers('user-id') userId?: string) {
    const payments = await this.paymentsService.findAll(userId);
    return {
      success: true,
      data: payments,
      message: '获取支付列表成功',
    };
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取支付详情' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async findOne(@Param('id') id: string) {
    const payment = await this.paymentsService.findOne(id);
    return {
      success: true,
      data: payment,
      message: '获取支付详情成功',
    };
  }

  @Post('query')
  @ApiBearerAuth()
  @ApiOperation({ summary: '查询支付状态' })
  @ApiResponse({ status: 200, description: '查询成功' })
  async query(@Body() queryPaymentDto: QueryPaymentDto) {
    const result = await this.paymentsService.queryPayment(
      queryPaymentDto.paymentNo,
    );
    return {
      success: true,
      data: result,
      message: '查询支付状态成功',
    };
  }

  /**
   * 申请退款
   * 🔒 限流: 5分钟内最多5次 (防止恶意退款)
   */
  @Post(':id/refund')
  @ApiBearerAuth()
  @Throttle({ default: { limit: 5, ttl: 300000 } })
  @ApiOperation({ summary: '申请退款' })
  @ApiResponse({ status: 200, description: '退款申请成功' })
  @ApiResponse({ status: 429, description: '退款申请过于频繁，请稍后再试' })
  async refund(
    @Param('id') id: string,
    @Body() refundPaymentDto: RefundPaymentDto,
  ) {
    const payment = await this.paymentsService.refundPayment(
      id,
      refundPaymentDto,
    );
    return {
      success: true,
      data: payment,
      message: '退款申请成功',
    };
  }

  @Post('notify/wechat')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '微信支付回调' })
  @ApiResponse({ status: 200, description: '回调处理成功' })
  async wechatNotify(@Body() body: any, @Headers() headers: any) {
    try {
      await this.paymentsService.handleWeChatNotification(body, headers);
      return {
        code: 'SUCCESS',
        message: '成功',
      };
    } catch (error) {
      this.logger.error(`WeChat notify failed: ${error.message}`);
      return {
        code: 'FAIL',
        message: error.message,
      };
    }
  }

  @Post('notify/alipay')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '支付宝支付回调' })
  @ApiResponse({ status: 200, description: '回调处理成功' })
  async alipayNotify(@Body() body: any) {
    try {
      await this.paymentsService.handleAlipayNotification(body);
      return 'success';
    } catch (error) {
      this.logger.error(`Alipay notify failed: ${error.message}`);
      return 'fail';
    }
  }
}
