import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventBusService } from '@cloudphone/shared';
import { Order, OrderStatus } from '../billing/entities/order.entity';
import { Plan } from '../billing/entities/plan.entity';
import { v4 as uuid } from 'uuid';

export interface PurchasePlanSagaState {
  sagaId: string;
  orderId?: string;
  deviceId?: string;
  paymentId?: string;
  step: 'init' | 'create_order' | 'allocate_device' | 'process_payment' | 'completed' | 'failed';
  error?: string;
}

@Injectable()
export class PurchasePlanSaga {
  private readonly logger = new Logger(PurchasePlanSaga.name);
  private readonly pendingSagas = new Map<string, PurchasePlanSagaState>();
  private readonly sagaTimeouts = new Map<string, NodeJS.Timeout>();

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Plan)
    private readonly planRepository: Repository<Plan>,
    @Optional() private readonly eventBus: EventBusService,
  ) {}

  /**
   * 执行订单购买 Saga
   */
  async execute(
    userId: string,
    planId: string,
    amount: number,
  ): Promise<{ sagaId: string; orderId: string }> {
    const sagaId = uuid();
    
    const state: PurchasePlanSagaState = {
      sagaId,
      step: 'init',
    };
    
    this.pendingSagas.set(sagaId, state);
    
    // 设置 Saga 超时（5分钟）
    const timeout = setTimeout(() => {
      this.handleSagaTimeout(sagaId);
    }, 5 * 60 * 1000);
    
    this.sagaTimeouts.set(sagaId, timeout);

    try {
      // Step 1: 验证套餐
      const plan = await this.planRepository.findOne({
        where: { id: planId, isActive: true },
      });

      if (!plan) {
        throw new Error(`Plan ${planId} not found or inactive`);
      }

      // Step 2: 创建订单
      state.step = 'create_order';
      const order = await this.createOrder(userId, planId, amount);
      state.orderId = order.id;

      this.logger.log(`Saga ${sagaId}: Order created ${order.id}`);

      // Step 3: 请求分配设备（发布事件）
      state.step = 'allocate_device';
      await this.eventBus.publishDeviceEvent('allocate.requested', {
        sagaId,
        orderId: order.id,
        userId,
        planId,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(`Saga ${sagaId}: Device allocation requested`);

      // 返回 sagaId 和 orderId，后续通过事件驱动
      return { sagaId, orderId: order.id };
      
    } catch (error) {
      this.logger.error(`Saga ${sagaId} failed at step ${state.step}:`, error.message);
      state.step = 'failed';
      state.error = error.message;
      
      // 执行补偿
      await this.compensate(state);
      
      // 清理
      this.cleanupSaga(sagaId);
      
      throw error;
    }
  }

  /**
   * 处理设备分配结果（通过事件触发）
   */
  async handleDeviceAllocated(sagaId: string, deviceId: string | null, success: boolean): Promise<void> {
    const state = this.pendingSagas.get(sagaId);
    
    if (!state) {
      this.logger.warn(`Saga ${sagaId} not found`);
      return;
    }

    if (!success || !deviceId) {
      // 设备分配失败
      this.logger.error(`Saga ${sagaId}: Device allocation failed`);
      state.step = 'failed';
      state.error = 'Device allocation failed';
      
      await this.compensate(state);
      this.cleanupSaga(sagaId);
      return;
    }

    try {
      // 设备分配成功
      state.deviceId = deviceId;
      state.step = 'process_payment';

      // 更新订单关联设备
      await this.orderRepository.update(state.orderId, {
        deviceId,
      });

      this.logger.log(`Saga ${sagaId}: Device ${deviceId} allocated, processing payment`);

      // Step 4: 处理支付（这里简化为直接标记为已支付）
      // 实际应该调用支付服务
      await this.orderRepository.update(state.orderId, {
        status: OrderStatus.PAID,
        paidAt: new Date(),
      });

      state.step = 'completed';
      
      // 发布订单完成事件
      await this.eventBus.publishOrderEvent('paid', {
        orderId: state.orderId,
        userId: null,
        paymentId: null,
        amount: 0,
        paidAt: new Date(),
        timestamp: new Date().toISOString(),
      });

      this.logger.log(`Saga ${sagaId}: Completed successfully`);
      
      // 清理
      this.cleanupSaga(sagaId);
      
    } catch (error) {
      this.logger.error(`Saga ${sagaId} failed at payment:`, error.message);
      state.step = 'failed';
      state.error = error.message;
      
      await this.compensate(state);
      this.cleanupSaga(sagaId);
    }
  }

  /**
   * 创建订单
   */
  private async createOrder(
    userId: string,
    planId: string,
    amount: number,
  ): Promise<Order> {
    const orderNumber = `ORD${Date.now()}${Math.floor(Math.random() * 1000)}`;
    
    const order = this.orderRepository.create({
      userId,
      planId,
      orderNumber,
      amount,
      finalAmount: amount,
      status: OrderStatus.PENDING,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30分钟过期
    });

    return await this.orderRepository.save(order);
  }

  /**
   * 补偿操作（回滚）
   */
  private async compensate(state: PurchasePlanSagaState): Promise<void> {
    this.logger.log(`Executing compensation for Saga ${state.sagaId}`);

    try {
      // 按逆序回滚操作
      if (state.step === 'process_payment' && state.deviceId) {
        // 释放已分配的设备
        this.logger.log(`Compensating: Releasing device ${state.deviceId}`);
        await this.eventBus.publishDeviceEvent('release', {
          deviceId: state.deviceId,
          userId: null,
          reason: `Saga ${state.sagaId} compensation`,
          timestamp: new Date().toISOString(),
        });
      }

      if (state.orderId) {
        // 取消订单
        this.logger.log(`Compensating: Cancelling order ${state.orderId}`);
        await this.orderRepository.update(state.orderId, {
          status: OrderStatus.CANCELLED,
          cancelReason: `Saga ${state.sagaId} compensation: ${state.error}`,
          cancelledAt: new Date(),
        });
        
        // 发布订单取消事件
        await this.eventBus.publishOrderEvent('cancelled', {
          orderId: state.orderId,
          userId: null,
          reason: `Saga compensation: ${state.error}`,
          cancelledAt: new Date(),
          timestamp: new Date().toISOString(),
        });
      }

      this.logger.log(`Compensation completed for Saga ${state.sagaId}`);
    } catch (error) {
      this.logger.error(`Compensation failed for Saga ${state.sagaId}:`, error.message);
    }
  }

  /**
   * 处理 Saga 超时
   */
  private async handleSagaTimeout(sagaId: string): Promise<void> {
    const state = this.pendingSagas.get(sagaId);
    
    if (!state) {
      return;
    }

    this.logger.warn(`Saga ${sagaId} timeout at step ${state.step}`);
    
    state.step = 'failed';
    state.error = 'Saga timeout';
    
    await this.compensate(state);
    this.cleanupSaga(sagaId);
  }

  /**
   * 清理 Saga 状态
   */
  private cleanupSaga(sagaId: string): void {
    this.pendingSagas.delete(sagaId);
    
    const timeout = this.sagaTimeouts.get(sagaId);
    if (timeout) {
      clearTimeout(timeout);
      this.sagaTimeouts.delete(sagaId);
    }
  }

  /**
   * 获取 Saga 状态
   */
  getSagaState(sagaId: string): PurchasePlanSagaState | undefined {
    return this.pendingSagas.get(sagaId);
  }
}

