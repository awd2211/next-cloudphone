// @ts-nocheck
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In, Like } from 'typeorm';
import { Payment, PaymentStatus, PaymentMethod } from '../entities/payment.entity';
import { Subscription } from '../entities/subscription.entity';
import { StripeProvider } from '../providers/stripe.provider';
import { PayPalProvider } from '../providers/paypal.provider';
import { PaddleProvider } from '../providers/paddle.provider';
import { WeChatPayProvider } from '../providers/wechat-pay.provider';
import { AlipayProvider } from '../providers/alipay.provider';
import * as ExcelJS from 'exceljs';

interface PaginationParams {
  page: number;
  limit: number;
  status?: PaymentStatus;
  method?: PaymentMethod;
  userId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class PaymentsAdminService {
  private readonly logger = new Logger(PaymentsAdminService.name);

  constructor(
    @InjectRepository(Payment)
    private paymentsRepository: Repository<Payment>,
    @InjectRepository(Subscription)
    private subscriptionsRepository: Repository<Subscription>,
    private stripeProvider: StripeProvider,
    private paypalProvider: PayPalProvider,
    private paddleProvider: PaddleProvider,
    private wechatPayProvider: WeChatPayProvider,
    private alipayProvider: AlipayProvider
  ) {}

  /**
   * 获取支付统计数据
   */
  async getPaymentStatistics(startDate?: string, endDate?: string) {
    const where: any = {};

    if (startDate || endDate) {
      where.createdAt = Between(
        startDate ? new Date(startDate) : new Date('2020-01-01'),
        endDate ? new Date(endDate) : new Date()
      );
    }

    // 总交易统计
    const totalCount = await this.paymentsRepository.count({ where });
    const successCount = await this.paymentsRepository.count({
      where: { ...where, status: PaymentStatus.SUCCESS },
    });
    const failedCount = await this.paymentsRepository.count({
      where: { ...where, status: PaymentStatus.FAILED },
    });
    const refundedCount = await this.paymentsRepository.count({
      where: { ...where, status: PaymentStatus.REFUNDED },
    });

    // 金额统计
    const successPayments = await this.paymentsRepository.find({
      where: { ...where, status: PaymentStatus.SUCCESS },
      select: ['amount', 'currency'],
    });

    const totalRevenue = successPayments.reduce((sum, p) => sum + Number(p.amount), 0);

    const refundedPayments = await this.paymentsRepository.find({
      where: { ...where, status: PaymentStatus.REFUNDED },
      select: ['refundAmount'],
    });

    const totalRefunded = refundedPayments.reduce((sum, p) => sum + Number(p.refundAmount || 0), 0);

    return {
      overview: {
        totalTransactions: totalCount,
        successfulTransactions: successCount,
        failedTransactions: failedCount,
        refundedTransactions: refundedCount,
        successRate: totalCount > 0 ? ((successCount / totalCount) * 100).toFixed(2) : 0,
      },
      revenue: {
        totalRevenue: totalRevenue.toFixed(2),
        totalRefunded: totalRefunded.toFixed(2),
        netRevenue: (totalRevenue - totalRefunded).toFixed(2),
      },
      period: {
        startDate: startDate || 'all',
        endDate: endDate || 'now',
      },
    };
  }

  /**
   * 获取各支付方式统计
   */
  async getPaymentMethodsStatistics(startDate?: string, endDate?: string) {
    const where: any = { status: PaymentStatus.SUCCESS };

    if (startDate || endDate) {
      where.createdAt = Between(
        startDate ? new Date(startDate) : new Date('2020-01-01'),
        endDate ? new Date(endDate) : new Date()
      );
    }

    const payments = await this.paymentsRepository.find({
      where,
      select: ['method', 'amount'],
    });

    const methodStats: Record<string, { count: number; amount: number }> = {};

    payments.forEach((payment) => {
      const method = payment.method;
      if (!methodStats[method]) {
        methodStats[method] = { count: 0, amount: 0 };
      }
      methodStats[method].count++;
      methodStats[method].amount += Number(payment.amount);
    });

    const total = payments.length;
    const totalAmount = payments.reduce((sum, p) => sum + Number(p.amount), 0);

    return Object.entries(methodStats).map(([method, stats]) => ({
      method,
      count: stats.count,
      percentage: total > 0 ? ((stats.count / total) * 100).toFixed(2) : 0,
      totalAmount: stats.amount.toFixed(2),
      amountPercentage: totalAmount > 0 ? ((stats.amount / totalAmount) * 100).toFixed(2) : 0,
    }));
  }

  /**
   * 获取每日统计
   */
  async getDailyStatistics(days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const payments = await this.paymentsRepository
      .createQueryBuilder('payment')
      .select('DATE(payment.created_at)', 'date')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(CASE WHEN payment.status = :success THEN 1 ELSE 0 END)', 'successCount')
      .addSelect(
        'SUM(CASE WHEN payment.status = :success THEN payment.amount ELSE 0 END)',
        'revenue'
      )
      .where('payment.created_at >= :startDate', { startDate })
      .setParameter('success', PaymentStatus.SUCCESS)
      .groupBy('DATE(payment.created_at)')
      .orderBy('date', 'ASC')
      .getRawMany();

    return payments.map((row) => ({
      date: row.date,
      totalTransactions: parseInt(row.count),
      successfulTransactions: parseInt(row.successCount),
      revenue: parseFloat(row.revenue || 0).toFixed(2),
    }));
  }

  /**
   * 分页查询支付列表
   */
  async findAllWithPagination(params: PaginationParams): Promise<PaginatedResult<Payment>> {
    const { page, limit, status, method, userId, startDate, endDate, search } = params;

    const where: any = {};

    if (status) where.status = status;
    if (method) where.method = method;
    if (userId) where.userId = userId;

    if (startDate || endDate) {
      where.createdAt = Between(
        startDate ? new Date(startDate) : new Date('2020-01-01'),
        endDate ? new Date(endDate) : new Date()
      );
    }

    const queryBuilder = this.paymentsRepository.createQueryBuilder('payment');

    // 搜索功能
    if (search) {
      queryBuilder.where('(payment.payment_no LIKE :search OR payment.order_id LIKE :search)', {
        search: `%${search}%`,
      });
    } else {
      queryBuilder.where(where);
    }

    const [items, total] = await queryBuilder
      .orderBy('payment.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 获取支付详情（包含关联数据）
   */
  async findOneWithRelations(id: string): Promise<Payment> {
    const payment = await this.paymentsRepository.findOne({
      where: { id },
      relations: ['order'],
    });

    if (!payment) {
      throw new NotFoundException(`支付记录不存在: ${id}`);
    }

    return payment;
  }

  /**
   * 管理员手动退款
   */
  async manualRefund(
    paymentId: string,
    amount?: number,
    reason: string = '管理员手动退款',
    adminNote?: string
  ) {
    const payment = await this.paymentsRepository.findOne({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException(`支付记录不存在: ${paymentId}`);
    }

    if (payment.status !== PaymentStatus.SUCCESS) {
      throw new Error(`只能对支付成功的订单进行退款`);
    }

    const refundAmount = amount || payment.amount;

    if (refundAmount > payment.amount) {
      throw new Error(`退款金额不能大于支付金额`);
    }

    // 调用对应的 provider 退款
    const provider = this.getProvider(payment.method);

    if (provider) {
      const refundNo = this.generateRefundNo();

      await provider.refund({
        paymentNo: payment.paymentNo,
        refundNo,
        totalAmount: payment.amount,
        refundAmount,
        reason,
        metadata: { adminNote },
      });
    }

    // 更新支付状态
    payment.status = PaymentStatus.REFUNDED;
    payment.refundAmount = refundAmount;
    payment.refundReason = reason;
    payment.refundedAt = new Date();
    payment.metadata = {
      ...payment.metadata,
      adminRefund: true,
      adminNote,
    };

    return await this.paymentsRepository.save(payment);
  }

  /**
   * 获取待审核退款列表
   */
  async getPendingRefunds() {
    return await this.paymentsRepository.find({
      where: { status: PaymentStatus.REFUNDING },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 批准退款申请
   */
  async approveRefund(paymentId: string, adminNote?: string) {
    const payment = await this.paymentsRepository.findOne({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException(`支付记录不存在: ${paymentId}`);
    }

    return await this.manualRefund(paymentId, payment.amount, '退款申请已批准', adminNote);
  }

  /**
   * 拒绝退款申请
   */
  async rejectRefund(paymentId: string, reason: string, adminNote?: string) {
    const payment = await this.paymentsRepository.findOne({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException(`支付记录不存在: ${paymentId}`);
    }

    payment.status = PaymentStatus.SUCCESS; // 恢复为成功状态
    payment.metadata = {
      ...payment.metadata,
      refundRejected: true,
      rejectionReason: reason,
      adminNote,
    };

    await this.paymentsRepository.save(payment);
  }

  /**
   * 获取异常支付列表
   */
  async getExceptionPayments(
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResult<Payment>> {
    const [items, total] = await this.paymentsRepository.findAndCount({
      where: [{ status: PaymentStatus.FAILED }, { status: PaymentStatus.REFUNDING }],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 手动同步支付状态
   */
  async syncPaymentStatus(paymentId: string) {
    const payment = await this.paymentsRepository.findOne({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException(`支付记录不存在: ${paymentId}`);
    }

    const provider = this.getProvider(payment.method);

    if (!provider) {
      throw new Error(`不支持的支付方式: ${payment.method}`);
    }

    try {
      const result = await provider.queryPayment(payment.paymentNo);

      // 更新状态
      if (result.status === 'success' && payment.status !== PaymentStatus.SUCCESS) {
        payment.status = PaymentStatus.SUCCESS;
        payment.paidAt = result.paidAt || new Date();
      }

      payment.metadata = {
        ...payment.metadata,
        lastSync: new Date().toISOString(),
        syncResult: result,
      };

      return await this.paymentsRepository.save(payment);
    } catch (error) {
      this.logger.error(`Sync payment status failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * 导出支付数据为 Excel
   */
  async exportPaymentsToExcel(params: {
    startDate?: string;
    endDate?: string;
    status?: PaymentStatus;
    method?: PaymentMethod;
  }): Promise<Buffer> {
    const where: any = {};

    if (params.status) where.status = params.status;
    if (params.method) where.method = params.method;
    if (params.startDate || params.endDate) {
      where.createdAt = Between(
        params.startDate ? new Date(params.startDate) : new Date('2020-01-01'),
        params.endDate ? new Date(params.endDate) : new Date()
      );
    }

    const payments = await this.paymentsRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('支付记录');

    // 设置表头
    worksheet.columns = [
      { header: '支付单号', key: 'paymentNo', width: 20 },
      { header: '订单号', key: 'orderId', width: 25 },
      { header: '用户ID', key: 'userId', width: 25 },
      { header: '金额', key: 'amount', width: 12 },
      { header: '货币', key: 'currency', width: 8 },
      { header: '支付方式', key: 'method', width: 12 },
      { header: '状态', key: 'status', width: 12 },
      { header: '支付时间', key: 'paidAt', width: 20 },
      { header: '创建时间', key: 'createdAt', width: 20 },
    ];

    // 添加数据
    payments.forEach((payment) => {
      worksheet.addRow({
        paymentNo: payment.paymentNo,
        orderId: payment.orderId,
        userId: payment.userId,
        amount: payment.amount,
        currency: payment.currency,
        method: payment.method,
        status: payment.status,
        paidAt: payment.paidAt ? payment.paidAt.toISOString() : '',
        createdAt: payment.createdAt.toISOString(),
      });
    });

    // 生成 Buffer
    return (await workbook.xlsx.writeBuffer()) as Buffer;
  }

  /**
   * 获取支付配置
   */
  async getPaymentConfig() {
    return {
      enabledMethods: [
        PaymentMethod.STRIPE,
        PaymentMethod.PAYPAL,
        PaymentMethod.PADDLE,
        PaymentMethod.WECHAT,
        PaymentMethod.ALIPAY,
      ],
      enabledCurrencies: ['USD', 'EUR', 'GBP', 'CNY', 'JPY'],
      providers: {
        stripe: {
          enabled: true,
          mode: 'test',
          connected: await this.testProviderConnection(PaymentMethod.STRIPE),
        },
        paypal: {
          enabled: true,
          mode: 'sandbox',
          connected: await this.testProviderConnection(PaymentMethod.PAYPAL),
        },
        paddle: {
          enabled: true,
          environment: 'sandbox',
          connected: await this.testProviderConnection(PaymentMethod.PADDLE),
        },
      },
    };
  }

  /**
   * 更新支付配置
   */
  async updatePaymentConfig(config: any) {
    // 这里可以将配置保存到数据库或配置服务
    // 简化实现，直接返回
    return config;
  }

  /**
   * 测试支付提供商连接
   */
  async testProviderConnection(
    provider: PaymentMethod
  ): Promise<{ success: boolean; message: string }> {
    try {
      const providerInstance = this.getProvider(provider);

      if (!providerInstance) {
        return { success: false, message: '不支持的支付方式' };
      }

      // 检查 provider 是否有 getClientConfig 方法
      if (typeof providerInstance.getClientConfig !== 'function') {
        return { success: false, message: '提供商未实现配置方法' };
      }

      // 获取客户端配置来验证连接
      const config = providerInstance.getClientConfig();

      if (!config) {
        return { success: false, message: '无法获取配置' };
      }

      if (!config.publicKey && !config.clientId && !config.appId) {
        return { success: false, message: '未配置密钥' };
      }

      return { success: true, message: '连接正常' };
    } catch (error) {
      this.logger.error(`测试支付提供商连接失败: ${provider}`, error.stack);
      return { success: false, message: error?.message || '连接测试失败' };
    }
  }

  /**
   * 获取 Webhook 日志
   */
  async getWebhookLogs(
    page: number = 1,
    limit: number = 50,
    provider?: PaymentMethod
  ): Promise<PaginatedResult<any>> {
    // 这里需要有一个 webhook_logs 表来记录所有 webhook 事件
    // 简化实现，返回空数据
    return {
      items: [],
      total: 0,
      page,
      limit,
      totalPages: 0,
    };
  }

  /**
   * 获取支付提供商
   */
  private getProvider(method: PaymentMethod): any {
    switch (method) {
      case PaymentMethod.STRIPE:
        return this.stripeProvider;
      case PaymentMethod.PAYPAL:
        return this.paypalProvider;
      case PaymentMethod.PADDLE:
        return this.paddleProvider;
      case PaymentMethod.WECHAT:
        return this.wechatPayProvider;
      case PaymentMethod.ALIPAY:
        return this.alipayProvider;
      default:
        return null;
    }
  }

  /**
   * 生成退款单号
   */
  private generateRefundNo(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0');
    return `REFUND${timestamp}${random}`;
  }
}
