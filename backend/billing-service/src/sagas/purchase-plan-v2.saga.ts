import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  SagaOrchestratorService,
  SagaDefinition,
  SagaType,
  EventBusService,
} from '@cloudphone/shared';
import { Order, OrderStatus } from '../billing/entities/order.entity';
import { Plan } from '../billing/entities/plan.entity';
import { PurchasePlanSagaState } from './types/purchase-plan-saga.types';

/**
 * Purchase Plan Saga V2
 *
 * 使用共享的 SagaOrchestratorService 管理订单购买流程
 *
 * 优势：
 * - ✅ 持久化状态（saga_state 表）
 * - ✅ 崩溃恢复
 * - ✅ 自动重试
 * - ✅ 超时检测
 * - ✅ 统一监控
 */
@Injectable()
export class PurchasePlanSagaV2 {
  private readonly logger = new Logger(PurchasePlanSagaV2.name);

  constructor(
    private readonly sagaOrchestrator: SagaOrchestratorService,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Plan)
    private readonly planRepository: Repository<Plan>,
    private readonly eventBus: EventBusService,
  ) {}

  /**
   * 启动订单购买 Saga
   *
   * @param userId 用户 ID
   * @param planId 套餐 ID
   * @param amount 金额
   * @returns Saga ID
   */
  async startPurchase(
    userId: string,
    planId: string,
    amount: number,
  ): Promise<string> {
    const initialState: PurchasePlanSagaState = {
      userId,
      planId,
      amount,
      startTime: new Date(),
      attempts: {},
    };

    const sagaDefinition = this.createSagaDefinition();
    const sagaId = await this.sagaOrchestrator.executeSaga(
      sagaDefinition,
      initialState,
    );

    this.logger.log(`Purchase Saga started: ${sagaId} for user ${userId}`);
    return sagaId;
  }

  /**
   * 创建 Saga 定义
   */
  private createSagaDefinition(): SagaDefinition<PurchasePlanSagaState> {
    return {
      type: SagaType.PAYMENT_PURCHASE,
      timeoutMs: 5 * 60 * 1000, // 5 分钟
      maxRetries: 3,
      steps: [
        {
          name: 'VALIDATE_PLAN',
          execute: this.validatePlan.bind(this),
          compensate: async () => {}, // 无需补偿
        },
        {
          name: 'CREATE_ORDER',
          execute: this.createOrder.bind(this),
          compensate: this.cancelOrder.bind(this),
        },
        {
          name: 'ALLOCATE_DEVICE',
          execute: this.allocateDevice.bind(this),
          compensate: this.releaseDevice.bind(this),
        },
        {
          name: 'PROCESS_PAYMENT',
          execute: this.processPayment.bind(this),
          compensate: this.refundPayment.bind(this),
        },
        {
          name: 'ACTIVATE_ORDER',
          execute: this.activateOrder.bind(this),
          compensate: async () => {}, // 订单已激活，无法补偿
        },
      ],
    };
  }

  // ==================== Step 1: Validate Plan ====================

  /**
   * 验证套餐有效性
   */
  private async validatePlan(
    state: PurchasePlanSagaState,
  ): Promise<Partial<PurchasePlanSagaState>> {
    this.logger.log(`[VALIDATE_PLAN] Validating plan ${state.planId}`);

    const plan = await this.planRepository.findOne({
      where: { id: state.planId, isActive: true },
    });

    if (!plan) {
      throw new Error(`Plan ${state.planId} not found or inactive`);
    }

    if (plan.price !== state.amount) {
      throw new Error(
        `Price mismatch: expected ${plan.price}, got ${state.amount}`,
      );
    }

    this.logger.log(`[VALIDATE_PLAN] Plan validated: ${plan.name}`);
    return {}; // 无需更新状态
  }

  // ==================== Step 2: Create Order ====================

  /**
   * 创建订单
   */
  private async createOrder(
    state: PurchasePlanSagaState,
  ): Promise<Partial<PurchasePlanSagaState>> {
    this.logger.log(`[CREATE_ORDER] Creating order for user ${state.userId}`);

    const orderNumber = `ORD${Date.now()}${Math.floor(Math.random() * 1000)}`;

    const order = this.orderRepository.create({
      userId: state.userId,
      planId: state.planId,
      orderNumber,
      amount: state.amount,
      finalAmount: state.amount,
      status: OrderStatus.PENDING,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30分钟
    });

    const savedOrder = await this.orderRepository.save(order);

    this.logger.log(`[CREATE_ORDER] Order created: ${savedOrder.id}`);
    return { orderId: savedOrder.id };
  }

  /**
   * 补偿：取消订单
   */
  private async cancelOrder(state: PurchasePlanSagaState): Promise<void> {
    if (!state.orderId) return;

    this.logger.log(`[COMPENSATE] Cancelling order ${state.orderId}`);

    await this.orderRepository.update(state.orderId, {
      status: OrderStatus.CANCELLED,
      cancelReason: 'Saga compensation',
      cancelledAt: new Date(),
    });

    // 发送事件
    await this.eventBus.publishBillingEvent('order.cancelled', {
      orderId: state.orderId,
      userId: state.userId,
      reason: 'Saga compensation',
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`[COMPENSATE] Order cancelled: ${state.orderId}`);
  }

  // ==================== Step 3: Allocate Device ====================

  /**
   * 分配设备
   */
  private async allocateDevice(
    state: PurchasePlanSagaState,
  ): Promise<Partial<PurchasePlanSagaState>> {
    this.logger.log(`[ALLOCATE_DEVICE] Requesting device for order ${state.orderId}`);

    // 发送设备分配请求事件
    await this.eventBus.publishDeviceEvent('allocate.requested', {
      orderId: state.orderId,
      userId: state.userId,
      planId: state.planId,
      timestamp: new Date().toISOString(),
    });

    // 等待设备分配结果
    // 注意：实际应该通过事件回调或轮询实现异步等待
    // 这里简化为同步模拟
    const deviceId = await this.waitForDeviceAllocation(state.orderId!);

    if (!deviceId) {
      throw new Error('Device allocation failed');
    }

    // 更新订单
    await this.orderRepository.update(state.orderId!, {
      deviceId,
    });

    this.logger.log(`[ALLOCATE_DEVICE] Device allocated: ${deviceId}`);
    return { deviceId };
  }

  /**
   * 补偿：释放设备
   */
  private async releaseDevice(state: PurchasePlanSagaState): Promise<void> {
    if (!state.deviceId) return;

    this.logger.log(`[COMPENSATE] Releasing device ${state.deviceId}`);

    await this.eventBus.publishDeviceEvent('release', {
      deviceId: state.deviceId,
      userId: state.userId,
      reason: 'Saga compensation',
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`[COMPENSATE] Device released: ${state.deviceId}`);
  }

  // ==================== Step 4: Process Payment ====================

  /**
   * 处理支付
   */
  private async processPayment(
    state: PurchasePlanSagaState,
  ): Promise<Partial<PurchasePlanSagaState>> {
    this.logger.log(`[PROCESS_PAYMENT] Processing payment for order ${state.orderId}`);

    // 调用支付服务
    // 这里简化为直接标记为已支付
    // 实际应该调用 PayPal/Stripe/Alipay 等支付网关

    const paymentId = `PAY${Date.now()}`;

    await this.orderRepository.update(state.orderId!, {
      status: OrderStatus.PAID,
      paidAt: new Date(),
    });

    this.logger.log(`[PROCESS_PAYMENT] Payment processed: ${paymentId}`);
    return { paymentId };
  }

  /**
   * 补偿：退款
   */
  private async refundPayment(state: PurchasePlanSagaState): Promise<void> {
    if (!state.paymentId) return;

    this.logger.log(`[COMPENSATE] Refunding payment ${state.paymentId}`);

    // 调用退款接口
    // await this.paymentService.refund(state.paymentId, state.amount);

    // 更新订单状态
    await this.orderRepository.update(state.orderId!, {
      status: OrderStatus.REFUNDED,
      refundedAt: new Date(),
    });

    this.logger.log(`[COMPENSATE] Payment refunded: ${state.paymentId}`);
  }

  // ==================== Step 5: Activate Order ====================

  /**
   * 激活订单
   */
  private async activateOrder(
    state: PurchasePlanSagaState,
  ): Promise<Partial<PurchasePlanSagaState>> {
    this.logger.log(`[ACTIVATE_ORDER] Activating order ${state.orderId}`);

    await this.orderRepository.update(state.orderId!, {
      status: OrderStatus.PAID,
      paidAt: new Date(),
    });

    // 发送成功事件
    await this.eventBus.publishBillingEvent('order.completed', {
      orderId: state.orderId,
      userId: state.userId,
      deviceId: state.deviceId,
      amount: state.amount,
      timestamp: new Date().toISOString(),
    });

    // 发送通知
    await this.eventBus.publish('cloudphone.events', 'notification.send', {
      userId: state.userId,
      type: 'order_completed',
      title: '订单已完成',
      message: `您的订单已成功完成，设备已激活`,
      priority: 'normal',
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`[ACTIVATE_ORDER] Order activated: ${state.orderId}`);
    return {};
  }

  // ==================== Helper Methods ====================

  /**
   * 等待设备分配结果
   *
   * 注意：这是简化实现，实际应该通过事件回调或轮询实现
   */
  private async waitForDeviceAllocation(orderId: string): Promise<string | null> {
    // 模拟异步等待
    // 实际实现可以：
    // 1. 订阅 RabbitMQ 回调事件
    // 2. 轮询数据库订单表的 deviceId 字段
    // 3. 使用 Redis Pub/Sub

    // 这里简化为返回模拟设备 ID
    return `device-${Date.now()}`;
  }

  /**
   * 查询 Saga 状态
   */
  async getSagaStatus(sagaId: string) {
    return await this.sagaOrchestrator.getSagaState(sagaId);
  }
}
