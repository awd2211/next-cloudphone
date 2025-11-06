/**
 * 业务指标集成示例
 *
 * 本文件展示如何在 PurchasePlanSagaV2 中集成 BillingMetricsService
 * 记录支付相关的业务指标
 */

// ==================== 1. 在 constructor 中注入 BillingMetricsService ====================

import { BillingMetricsService } from '../metrics/billing-metrics.service';

// 在 constructor 中添加：
// constructor(
//   private readonly sagaOrchestrator: SagaOrchestratorService,
//   @InjectRepository(Order)
//   private readonly orderRepository: Repository<Order>,
//   @InjectRepository(Plan)
//   private readonly planRepository: Repository<Plan>,
//   private readonly eventBus: EventBusService,
//   private readonly billingMetrics: BillingMetricsService, // ✅ 注入指标服务
// ) {}

// ==================== 2. 在 processPayment 方法中记录指标 ====================

/**
 * 处理支付（集成指标）
 */
async processPaymentWithMetrics(state: PurchasePlanSagaState): Promise<Partial<PurchasePlanSagaState>> {
  this.logger.log(`[PROCESS_PAYMENT] Processing payment for order ${state.orderId}`);

  const startTime = Date.now();
  const method = 'alipay'; // 从 state 或 order 中获取真实支付方式

  // 记录支付尝试
  this.billingMetrics.recordPaymentAttempt(state.userId, method);

  try {
    // 调用支付服务
    const paymentId = `PAY${Date.now()}`;

    await this.orderRepository.update(state.orderId!, {
      status: OrderStatus.PAID,
      paidAt: new Date(),
    });

    // 记录支付成功
    this.billingMetrics.recordPaymentSuccess(state.userId, method);

    // 记录支付耗时
    const durationSeconds = (Date.now() - startTime) / 1000;
    this.billingMetrics.recordPaymentDuration(method, 'success', durationSeconds);

    this.logger.log(`[PROCESS_PAYMENT] Payment processed: ${paymentId}`);
    return { paymentId };
  } catch (error) {
    // 记录支付失败
    this.billingMetrics.recordPaymentFailure(
      state.userId,
      method,
      error.code || 'unknown'
    );

    // 记录失败耗时
    const durationSeconds = (Date.now() - startTime) / 1000;
    this.billingMetrics.recordPaymentDuration(method, 'failure', durationSeconds);

    throw error;
  }
}

// ==================== 3. 在 refundPayment 补偿方法中记录指标 ====================

/**
 * 补偿：退款（集成指标）
 */
async refundPaymentWithMetrics(state: PurchasePlanSagaState): Promise<void> {
  if (!state.paymentId) return;

  this.logger.log(`[COMPENSATE] Refunding payment ${state.paymentId}`);

  // 记录退款
  this.billingMetrics.recordRefund(state.userId, 'saga_compensation');

  // 更新订单状态
  await this.orderRepository.update(state.orderId!, {
    status: OrderStatus.REFUNDED,
    refundedAt: new Date(),
  });

  this.logger.log(`[COMPENSATE] Payment refunded: ${state.paymentId}`);
}

// ==================== 4. 使用 measurePayment 辅助方法 ====================

/**
 * 使用辅助方法测量支付耗时（更简洁）
 */
async processPaymentSimple(state: PurchasePlanSagaState): Promise<Partial<PurchasePlanSagaState>> {
  const method = 'alipay';

  // 记录支付尝试
  this.billingMetrics.recordPaymentAttempt(state.userId, method);

  try {
    // 使用 measurePayment 自动记录耗时
    const result = await this.billingMetrics.measurePayment(method, async () => {
      const paymentId = `PAY${Date.now()}`;

      await this.orderRepository.update(state.orderId!, {
        status: OrderStatus.PAID,
        paidAt: new Date(),
      });

      return { paymentId };
    });

    // 记录支付成功
    this.billingMetrics.recordPaymentSuccess(state.userId, method);

    return result;
  } catch (error) {
    // 记录支付失败
    this.billingMetrics.recordPaymentFailure(state.userId, method, error.code || 'unknown');
    throw error;
  }
}

// ==================== 5. 完整的集成示例 ====================

/**
 * 完整的 PurchasePlanSagaV2 构造函数示例
 */
class PurchasePlanSagaV2Example {
  private readonly logger = new Logger(PurchasePlanSagaV2.name);

  constructor(
    private readonly sagaOrchestrator: SagaOrchestratorService,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Plan)
    private readonly planRepository: Repository<Plan>,
    private readonly eventBus: EventBusService,
    private readonly billingMetrics: BillingMetricsService, // ✅ 添加这一行
  ) {}

  // ... 其他方法
}

/**
 * 使用说明:
 *
 * 1. 在 purchase-plan-v2.saga.ts 中导入:
 *    import { BillingMetricsService } from '../metrics/billing-metrics.service';
 *
 * 2. 在 constructor 中注入（参考上面的示例）
 *
 * 3. 在 processPayment 方法中添加指标记录（参考 processPaymentWithMetrics）
 *
 * 4. 在 refundPayment 方法中添加退款记录（参考 refundPaymentWithMetrics）
 *
 * 5. 可选：在 createOrder 方法中记录账单生成
 *    this.billingMetrics.recordBillGenerated(state.userId, 'purchase');
 */

export {};
