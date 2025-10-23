import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { PaymentsAdminService } from './payments-admin.service';
import { PaymentStatus, PaymentMethod } from '../entities/payment.entity';

/**
 * 支付管理后台 Controller
 * 需要管理员权限
 */
@ApiTags('Admin - Payments')
@Controller('admin/payments')
@ApiBearerAuth()
// @UseGuards(AdminGuard) // 添加管理员权限守卫
export class PaymentsAdminController {
  constructor(private readonly paymentsAdminService: PaymentsAdminService) {}

  /**
   * 获取支付统计数据
   */
  @Get('statistics')
  @ApiOperation({ summary: '获取支付统计数据' })
  @ApiQuery({ name: 'startDate', required: false, description: '开始日期 (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, description: '结束日期 (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: '统计数据' })
  async getStatistics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const stats = await this.paymentsAdminService.getPaymentStatistics(
      startDate,
      endDate,
    );
    return {
      success: true,
      data: stats,
      message: '获取统计数据成功',
    };
  }

  /**
   * 获取支付方式占比
   */
  @Get('statistics/payment-methods')
  @ApiOperation({ summary: '获取各支付方式占比' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async getPaymentMethodsStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const stats = await this.paymentsAdminService.getPaymentMethodsStatistics(
      startDate,
      endDate,
    );
    return {
      success: true,
      data: stats,
      message: '获取支付方式统计成功',
    };
  }

  /**
   * 获取每日交易统计
   */
  @Get('statistics/daily')
  @ApiOperation({ summary: '获取每日交易统计' })
  @ApiQuery({ name: 'days', required: false, description: '统计天数，默认30天' })
  async getDailyStatistics(@Query('days') days: number = 30) {
    const stats = await this.paymentsAdminService.getDailyStatistics(days);
    return {
      success: true,
      data: stats,
      message: '获取每日统计成功',
    };
  }

  /**
   * 获取所有支付记录（管理员视图）
   */
  @Get()
  @ApiOperation({ summary: '获取所有支付记录' })
  @ApiQuery({ name: 'page', required: false, description: '页码，默认1' })
  @ApiQuery({ name: 'limit', required: false, description: '每页数量，默认20' })
  @ApiQuery({ name: 'status', required: false, description: '支付状态筛选' })
  @ApiQuery({ name: 'method', required: false, description: '支付方式筛选' })
  @ApiQuery({ name: 'userId', required: false, description: '用户ID筛选' })
  @ApiQuery({ name: 'startDate', required: false, description: '开始日期' })
  @ApiQuery({ name: 'endDate', required: false, description: '结束日期' })
  @ApiQuery({ name: 'search', required: false, description: '搜索（支付单号/订单号）' })
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('status') status?: PaymentStatus,
    @Query('method') method?: PaymentMethod,
    @Query('userId') userId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('search') search?: string,
  ) {
    const result = await this.paymentsAdminService.findAllWithPagination({
      page,
      limit,
      status,
      method,
      userId,
      startDate,
      endDate,
      search,
    });

    return {
      success: true,
      data: result.items,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
      message: '获取支付列表成功',
    };
  }

  /**
   * 获取支付详情
   */
  @Get(':id')
  @ApiOperation({ summary: '获取支付详情（包含关联数据）' })
  async findOne(@Param('id') id: string) {
    const payment = await this.paymentsAdminService.findOneWithRelations(id);
    return {
      success: true,
      data: payment,
      message: '获取支付详情成功',
    };
  }

  /**
   * 手动发起退款
   */
  @Post(':id/refund')
  @ApiOperation({ summary: '管理员手动退款' })
  @HttpCode(HttpStatus.OK)
  async manualRefund(
    @Param('id') id: string,
    @Body() body: { amount?: number; reason: string; adminNote?: string },
  ) {
    const result = await this.paymentsAdminService.manualRefund(
      id,
      body.amount,
      body.reason,
      body.adminNote,
    );
    return {
      success: true,
      data: result,
      message: '退款处理成功',
    };
  }

  /**
   * 获取待审核退款列表
   */
  @Get('refunds/pending')
  @ApiOperation({ summary: '获取待审核退款列表' })
  async getPendingRefunds() {
    const refunds = await this.paymentsAdminService.getPendingRefunds();
    return {
      success: true,
      data: refunds,
      message: '获取待审核退款成功',
    };
  }

  /**
   * 审核退款申请
   */
  @Post('refunds/:id/approve')
  @ApiOperation({ summary: '批准退款申请' })
  @HttpCode(HttpStatus.OK)
  async approveRefund(
    @Param('id') id: string,
    @Body() body: { adminNote?: string },
  ) {
    const result = await this.paymentsAdminService.approveRefund(id, body.adminNote);
    return {
      success: true,
      data: result,
      message: '退款已批准',
    };
  }

  /**
   * 拒绝退款申请
   */
  @Post('refunds/:id/reject')
  @ApiOperation({ summary: '拒绝退款申请' })
  @HttpCode(HttpStatus.OK)
  async rejectRefund(
    @Param('id') id: string,
    @Body() body: { reason: string; adminNote?: string },
  ) {
    await this.paymentsAdminService.rejectRefund(id, body.reason, body.adminNote);
    return {
      success: true,
      message: '退款已拒绝',
    };
  }

  /**
   * 获取异常支付列表
   */
  @Get('exceptions/list')
  @ApiOperation({ summary: '获取异常支付列表' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getExceptions(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    const result = await this.paymentsAdminService.getExceptionPayments(page, limit);
    return {
      success: true,
      data: result.items,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
      message: '获取异常支付成功',
    };
  }

  /**
   * 手动同步支付状态
   */
  @Post(':id/sync')
  @ApiOperation({ summary: '手动同步支付状态' })
  @HttpCode(HttpStatus.OK)
  async syncPaymentStatus(@Param('id') id: string) {
    const result = await this.paymentsAdminService.syncPaymentStatus(id);
    return {
      success: true,
      data: result,
      message: '同步成功',
    };
  }

  /**
   * 导出支付数据
   */
  @Get('export/excel')
  @ApiOperation({ summary: '导出支付数据为 Excel' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'method', required: false })
  async exportToExcel(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: PaymentStatus,
    @Query('method') method?: PaymentMethod,
  ) {
    const buffer = await this.paymentsAdminService.exportPaymentsToExcel({
      startDate,
      endDate,
      status,
      method,
    });

    return {
      success: true,
      data: {
        buffer: buffer.toString('base64'),
        filename: `payments_${new Date().toISOString().split('T')[0]}.xlsx`,
      },
      message: '导出成功',
    };
  }

  /**
   * 获取支付配置
   */
  @Get('config/all')
  @ApiOperation({ summary: '获取所有支付配置' })
  async getPaymentConfig() {
    const config = await this.paymentsAdminService.getPaymentConfig();
    return {
      success: true,
      data: config,
      message: '获取配置成功',
    };
  }

  /**
   * 更新支付配置
   */
  @Put('config')
  @ApiOperation({ summary: '更新支付配置' })
  async updatePaymentConfig(
    @Body()
    config: {
      enabledMethods?: PaymentMethod[];
      enabledCurrencies?: string[];
      settings?: any;
    },
  ) {
    const result = await this.paymentsAdminService.updatePaymentConfig(config);
    return {
      success: true,
      data: result,
      message: '配置更新成功',
    };
  }

  /**
   * 测试支付提供商连接
   */
  @Post('config/test/:provider')
  @ApiOperation({ summary: '测试支付提供商连接' })
  @HttpCode(HttpStatus.OK)
  async testProvider(@Param('provider') provider: PaymentMethod) {
    const result = await this.paymentsAdminService.testProviderConnection(provider);
    return {
      success: result.success,
      data: result,
      message: result.success ? '连接测试成功' : '连接测试失败',
    };
  }

  /**
   * 获取 Webhook 日志
   */
  @Get('webhooks/logs')
  @ApiOperation({ summary: '获取 Webhook 日志' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'provider', required: false })
  async getWebhookLogs(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 50,
    @Query('provider') provider?: PaymentMethod,
  ) {
    const result = await this.paymentsAdminService.getWebhookLogs(page, limit, provider);
    return {
      success: true,
      data: result.items,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
      message: '获取日志成功',
    };
  }
}
