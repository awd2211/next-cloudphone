/**
 * 计费服务业务指标服务
 * 统一管理计费相关的 Prometheus 指标记录
 */

import { Injectable, Logger } from '@nestjs/common';
import { CronExpression } from '@nestjs/schedule';
import { ClusterSafeCron, DistributedLockService } from '@cloudphone/shared';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource, LessThan } from 'typeorm';
import { BillingMetrics } from '@cloudphone/shared';
import { Order, OrderStatus } from '../billing/entities/order.entity';

@Injectable()
export class BillingMetricsService {
  private readonly logger = new Logger(BillingMetricsService.name);

  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectDataSource()
    private dataSource: DataSource,
    private readonly lockService: DistributedLockService // ✅ K8s cluster safety
  ) {}

  /**
   * 记录支付尝试
   */
  recordPaymentAttempt(userId: string, method: string): void {
    BillingMetrics.paymentAttempts.inc({ userId, method });
    this.logger.debug(`Payment attempt recorded: userId=${userId}, method=${method}`);
  }

  /**
   * 记录支付失败
   */
  recordPaymentFailure(userId: string, method: string, reason: string): void {
    BillingMetrics.paymentFailures.inc({ userId, method, reason });
    this.logger.debug(
      `Payment failure recorded: userId=${userId}, method=${method}, reason=${reason}`
    );
  }

  /**
   * 记录支付成功
   */
  recordPaymentSuccess(userId: string, method: string): void {
    BillingMetrics.paymentsSuccess.inc({ userId, method });
    this.logger.debug(`Payment success recorded: userId=${userId}, method=${method}`);
  }

  /**
   * 记录退款
   */
  recordRefund(userId: string, reason: string): void {
    BillingMetrics.refunds.inc({ userId, reason });
    this.logger.debug(`Refund recorded: userId=${userId}, reason=${reason}`);
  }

  /**
   * 记录账单生成
   */
  recordBillGenerated(userId: string, type: string): void {
    BillingMetrics.billsGenerated.inc({ userId, type });
    this.logger.debug(`Bill generated: userId=${userId}, type=${type}`);
  }

  /**
   * 记录支付耗时
   */
  recordPaymentDuration(
    method: string,
    status: 'success' | 'failure',
    durationSeconds: number
  ): void {
    BillingMetrics.paymentDuration.observe({ method, status }, durationSeconds);
    this.logger.debug(
      `Payment duration recorded: method=${method}, status=${status}, duration=${durationSeconds}s`
    );
  }

  /**
   * 测量支付操作耗时（辅助方法）
   */
  async measurePayment<T>(method: string, fn: () => Promise<T>): Promise<T> {
    const startTime = Date.now();
    let status: 'success' | 'failure' = 'success';

    try {
      const result = await fn();
      return result;
    } catch (error) {
      status = 'failure';
      throw error;
    } finally {
      const durationSeconds = (Date.now() - startTime) / 1000;
      this.recordPaymentDuration(method, status, durationSeconds);
    }
  }

  /**
   * 每 5 分钟更新余额不足用户数
   *
   * 查询条件: 余额 < 10 元的用户数
   */
  @ClusterSafeCron(CronExpression.EVERY_5_MINUTES)
  async updateLowBalanceMetrics(): Promise<void> {
    try {
      // 从 user-service 数据库查询余额不足的用户数
      // 注意: 这需要跨服务查询或通过 API 调用
      // 这里简化为示例（实际需要调用 user-service API 或访问共享数据库）

      const lowBalanceThreshold = 10; // 10 元

      // 方式 1: 如果有共享的用户表访问权限
      // const count = await this.userRepository.count({
      //   where: { balance: LessThan(lowBalanceThreshold) }
      // });

      // 方式 2: 通过 HTTP 调用 user-service API
      // const count = await this.httpClient.get('/users/stats/low-balance');

      // 方式 3: 临时使用订单数据估算（示例）
      // 统计最近创建但未支付的订单数作为间接指标
      const unpaidOrders = await this.orderRepository.count({
        where: {
          status: OrderStatus.PENDING,
        },
      });

      // 这里使用 unpaidOrders 作为示例，实际应该是真实的余额不足用户数
      BillingMetrics.usersLowBalance.set(unpaidOrders);

      this.logger.debug(`Low balance metric updated: ${unpaidOrders} users`);
    } catch (error) {
      this.logger.error('Failed to update low balance metrics', error.stack);
    }
  }

  /**
   * 每 10 分钟更新总营收指标
   *
   * 统计所有已支付订单的总金额
   */
  @ClusterSafeCron('0 */10 * * * *') // 每 10 分钟
  async updateTotalRevenueMetrics(): Promise<void> {
    try {
      const result = await this.orderRepository
        .createQueryBuilder('order')
        .select('SUM(order.amount)', 'total')
        .where('order.status = :status', { status: OrderStatus.PAID })
        .getRawOne();

      const totalRevenue = parseFloat(result?.total || '0');

      BillingMetrics.totalRevenue.set(totalRevenue);

      this.logger.debug(`Total revenue metric updated: ¥${totalRevenue}`);
    } catch (error) {
      this.logger.error('Failed to update total revenue metrics', error.stack);
    }
  }

  /**
   * 每天凌晨统计昨日订单指标
   */
  @ClusterSafeCron('0 0 * * *') // 每天 00:00
  async recordDailyOrderStats(): Promise<void> {
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // 统计昨日各状态订单数
      const stats = await this.orderRepository
        .createQueryBuilder('order')
        .select('order.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .addSelect('SUM(order.amount)', 'amount')
        .where('order.createdAt >= :yesterday', { yesterday })
        .andWhere('order.createdAt < :today', { today })
        .groupBy('order.status')
        .getRawMany();

      this.logger.log(`Daily order stats (${yesterday.toISOString().split('T')[0]}):`);
      for (const stat of stats) {
        this.logger.log(`  - ${stat.status}: ${stat.count} orders, ¥${stat.amount || 0}`);
      }
    } catch (error) {
      this.logger.error('Failed to record daily order stats', error.stack);
    }
  }
}
