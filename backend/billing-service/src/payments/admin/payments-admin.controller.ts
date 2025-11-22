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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PaymentsAdminService } from './payments-admin.service';
import { PaymentStatus, PaymentMethod } from '../entities/payment.entity';
import { PaymentConfigService, PaymentProviderConfigDto } from '../services/payment-config.service';
import { PaymentProviderType } from '../entities/payment-provider-config.entity';

/**
 * 支付管理后台 Controller
 * 需要管理员权限
 */
@ApiTags('Admin - Payments')
@Controller('admin/payments')
@ApiBearerAuth()
// @UseGuards(AdminGuard) // 添加管理员权限守卫
export class PaymentsAdminController {
  constructor(
    private readonly paymentsAdminService: PaymentsAdminService,
    private readonly paymentConfigService: PaymentConfigService,
  ) {}

  /**
   * 获取支付统计数据
   */
  @Get('statistics')
  @ApiOperation({ summary: '获取支付统计数据' })
  @ApiQuery({ name: 'startDate', required: false, description: '开始日期 (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, description: '结束日期 (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: '统计数据' })
  async getStatistics(@Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    const stats = await this.paymentsAdminService.getPaymentStatistics(startDate, endDate);
    return {
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
    @Query('endDate') endDate?: string
  ) {
    const stats = await this.paymentsAdminService.getPaymentMethodsStatistics(startDate, endDate);
    return {
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
  @ApiQuery({ name: 'pageSize', required: false, description: '每页数量，默认20' })
  @ApiQuery({ name: 'limit', required: false, description: '每页数量（兼容参数），默认20' })
  @ApiQuery({ name: 'status', required: false, description: '支付状态筛选' })
  @ApiQuery({ name: 'method', required: false, description: '支付方式筛选' })
  @ApiQuery({ name: 'userId', required: false, description: '用户ID筛选' })
  @ApiQuery({ name: 'startDate', required: false, description: '开始日期' })
  @ApiQuery({ name: 'endDate', required: false, description: '结束日期' })
  @ApiQuery({ name: 'search', required: false, description: '搜索（支付单号/订单号）' })
  async findAll(
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: PaymentStatus,
    @Query('method') method?: PaymentMethod,
    @Query('userId') userId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('search') search?: string
  ) {
    // 支持 pageSize 或 limit 参数
    const itemsPerPage = pageSize || limit || 20;
    const result = await this.paymentsAdminService.findAllWithPagination({
      page,
      limit: itemsPerPage,
      status,
      method,
      userId,
      startDate,
      endDate,
      search,
    });

    return {
      data: result.items,
      pagination: {
        page: result.page,
        pageSize: result.limit,
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
    @Body() body: { amount?: number; reason: string; adminNote?: string }
  ) {
    const result = await this.paymentsAdminService.manualRefund(
      id,
      body.amount,
      body.reason,
      body.adminNote
    );
    return {
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
  async approveRefund(@Param('id') id: string, @Body() body: { adminNote?: string }) {
    const result = await this.paymentsAdminService.approveRefund(id, body.adminNote);
    return {
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
    @Body() body: { reason: string; adminNote?: string }
  ) {
    await this.paymentsAdminService.rejectRefund(id, body.reason, body.adminNote);
    return {
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
  async getExceptions(@Query('page') page: number = 1, @Query('limit') limit: number = 20) {
    const result = await this.paymentsAdminService.getExceptionPayments(page, limit);
    return {
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
    @Query('method') method?: PaymentMethod
  ) {
    const buffer = await this.paymentsAdminService.exportPaymentsToExcel({
      startDate,
      endDate,
      status,
      method,
    });

    return {
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
    }
  ) {
    const result = await this.paymentsAdminService.updatePaymentConfig(config);
    return {
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
    @Query('provider') provider?: PaymentMethod
  ) {
    const result = await this.paymentsAdminService.getWebhookLogs(page, limit, provider);
    return {
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

  // ==================== 支付提供商配置管理 API ====================

  /**
   * 获取所有支付提供商配置
   */
  @Get('providers/config')
  @ApiOperation({ summary: '获取所有支付提供商配置' })
  @ApiResponse({ status: 200, description: '支付提供商配置列表' })
  async getProviderConfigs() {
    const configs = await this.paymentConfigService.getAllConfigs();
    return {
      success: true,
      data: configs,
      message: '获取配置成功',
    };
  }

  /**
   * 获取单个支付提供商配置
   */
  @Get('providers/config/:provider')
  @ApiOperation({ summary: '获取单个支付提供商配置' })
  @ApiResponse({ status: 200, description: '支付提供商配置' })
  async getProviderConfig(@Param('provider') provider: PaymentProviderType) {
    const config = await this.paymentConfigService.getConfig(provider);
    return {
      success: true,
      data: config,
      message: '获取配置成功',
    };
  }

  /**
   * 更新支付提供商配置
   */
  @Put('providers/config/:provider')
  @ApiOperation({ summary: '更新支付提供商配置' })
  @ApiResponse({ status: 200, description: '配置更新成功' })
  async updateProviderConfig(
    @Param('provider') provider: PaymentProviderType,
    @Body() dto: Omit<PaymentProviderConfigDto, 'provider'>
  ) {
    const config = await this.paymentConfigService.updateConfig({
      provider,
      ...dto,
    });
    return {
      success: true,
      data: config,
      message: '配置更新成功',
    };
  }

  /**
   * 测试支付提供商连接（使用数据库配置）
   */
  @Post('providers/config/:provider/test')
  @ApiOperation({ summary: '测试支付提供商连接' })
  @HttpCode(HttpStatus.OK)
  async testProviderConnectionNew(@Param('provider') provider: PaymentProviderType) {
    // 先获取配置以验证是否已配置
    const config = await this.paymentConfigService.getConfig(provider);

    if (!config.hasSecretKey) {
      const result = { success: false, message: '未配置 API 密钥' };
      await this.paymentConfigService.recordTestResult(provider, false, result.message);
      return {
        success: false,
        data: result,
        message: result.message,
      };
    }

    // 转换 provider type 到 payment method
    const providerToMethod: Record<PaymentProviderType, PaymentMethod> = {
      [PaymentProviderType.STRIPE]: PaymentMethod.STRIPE,
      [PaymentProviderType.PAYPAL]: PaymentMethod.PAYPAL,
      [PaymentProviderType.PADDLE]: PaymentMethod.PADDLE,
      [PaymentProviderType.WECHAT]: PaymentMethod.WECHAT,
      [PaymentProviderType.ALIPAY]: PaymentMethod.ALIPAY,
    };

    const method = providerToMethod[provider];
    const result = await this.paymentsAdminService.testProviderConnection(method);

    // 记录测试结果
    await this.paymentConfigService.recordTestResult(provider, result.success, result.message);

    return {
      success: result.success,
      data: result,
      message: result.success ? '连接测试成功' : '连接测试失败',
    };
  }

  /**
   * 获取启用的支付方式列表
   */
  @Get('providers/enabled')
  @ApiOperation({ summary: '获取启用的支付方式列表' })
  async getEnabledProviders() {
    const providers = await this.paymentConfigService.getEnabledMethods();
    return {
      success: true,
      data: providers,
      message: '获取成功',
    };
  }

  /**
   * 切换支付提供商启用状态
   */
  @Post('providers/config/:provider/toggle')
  @ApiOperation({ summary: '切换支付提供商启用/禁用' })
  @HttpCode(HttpStatus.OK)
  async toggleProvider(
    @Param('provider') provider: PaymentProviderType,
    @Body() body: { enabled: boolean }
  ) {
    const config = await this.paymentConfigService.updateConfig({
      provider,
      enabled: body.enabled,
    });
    return {
      success: true,
      data: config,
      message: body.enabled ? '已启用' : '已禁用',
    };
  }

  /**
   * 清除配置缓存
   */
  @Post('providers/config/cache/clear')
  @ApiOperation({ summary: '清除配置缓存' })
  @HttpCode(HttpStatus.OK)
  async clearConfigCache() {
    this.paymentConfigService.clearCache();
    return {
      success: true,
      message: '缓存已清除',
    };
  }
}
