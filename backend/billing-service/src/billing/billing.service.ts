import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThan } from 'typeorm';
import { CronExpression } from '@nestjs/schedule';
import { ClusterSafeCron, DistributedLockService } from '@cloudphone/shared';
import { Order, OrderStatus, PaymentMethod } from './entities/order.entity';
import { Plan } from './entities/plan.entity';
import { UsageRecord, UsageType } from './entities/usage-record.entity';
import { PurchasePlanSagaV2 } from '../sagas/purchase-plan-v2.saga';
import { UnifiedCacheService } from '@cloudphone/shared';
import { CacheKeys, CacheTTL } from '../cache/cache-keys';
import { trace, SpanStatusCode } from '@opentelemetry/api';
import { BalanceService } from '../balance/balance.service';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private readonly tracer = trace.getTracer('billing-service');

  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(Plan)
    private planRepository: Repository<Plan>,
    @InjectRepository(UsageRecord)
    private usageRecordRepository: Repository<UsageRecord>,
    private readonly purchasePlanSaga: PurchasePlanSagaV2,
    @Optional() private cacheService: UnifiedCacheService,
    private readonly lockService: DistributedLockService, // ✅ K8s cluster safety
    private readonly balanceService: BalanceService // ✅ 用于退款到用户余额
  ) {}

  async getPlans(page: number = 1, pageSize: number = 10) {
    const skip = (page - 1) * pageSize;

    const [data, total] = await this.planRepository.findAndCount({
      where: { isPublic: true, isActive: true },
      order: { createdAt: 'DESC' },
      skip,
      take: pageSize,
    });

    return {
      success: true,
      data,
      total,
      page,
      pageSize,
    };
  }

  async getPlan(id: string) {
    const plan = await this.planRepository.findOne({ where: { id } });
    if (!plan) {
      throw new NotFoundException(`套餐不存在: ${id}`);
    }
    return {
      success: true,
      data: plan,
    };
  }

  async createPlan(data: any) {
    const plan = this.planRepository.create(data);
    await this.planRepository.save(plan);
    return {
      success: true,
      data: plan,
      message: '套餐创建成功',
    };
  }

  async updatePlan(id: string, data: any) {
    const plan = await this.planRepository.findOne({ where: { id } });
    if (!plan) {
      throw new NotFoundException(`套餐不存在: ${id}`);
    }
    Object.assign(plan, data);
    await this.planRepository.save(plan);
    return {
      success: true,
      data: plan,
      message: '套餐更新成功',
    };
  }

  async deletePlan(id: string) {
    const plan = await this.planRepository.findOne({ where: { id } });
    if (!plan) {
      throw new NotFoundException(`套餐不存在: ${id}`);
    }
    await this.planRepository.remove(plan);
    return {
      success: true,
      message: '套餐删除成功',
    };
  }

  /**
   * 创建订单 (使用 Saga 模式)
   *
   * @param createOrderDto - 订单创建数据 { userId, planId, amount? }
   * @returns 订单 ID 和 Saga ID
   */
  async createOrder(createOrderDto: any) {
    // 创建自定义 span 用于追踪订单创建
    return await this.tracer.startActiveSpan(
      'billing.create_order',
      {
        attributes: {
          'user.id': createOrderDto.userId,
          'plan.id': createOrderDto.planId,
        },
      },
      async (span) => {
        try {
          const { userId, planId } = createOrderDto;

          // 获取套餐信息以确定金额
          const plan = await this.planRepository.findOne({
            where: { id: planId, isActive: true },
          });

          if (!plan) {
            throw new NotFoundException(`套餐不存在或已下架: ${planId}`);
          }

          // 添加套餐信息到 span
          span.setAttributes({
            'plan.name': plan.name,
            'plan.price': plan.price,
            'plan.billing_cycle': plan.billingCycle,
          });

          // 使用 Saga 模式启动订单购买流程
          const sagaId = await this.purchasePlanSaga.startPurchase(userId, planId, plan.price);

          this.logger.log(`Purchase Saga started: ${sagaId} for user ${userId}`);

          // 添加 saga ID 到 span
          span.setAttributes({
            'saga.id': sagaId,
          });

          // 设置成功状态
          span.setStatus({ code: SpanStatusCode.OK });

          return {
            sagaId,
            message: '订单创建中，请稍候...',
          };
        } catch (error) {
          // 记录错误
          span.recordException(error);
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error.message || 'Order creation failed',
          });
          throw error;
        } finally {
          span.end();
        }
      }
    );
  }

  /**
   * 查询 Saga 状态
   *
   * @param sagaId - Saga ID
   * @returns Saga 状态信息
   */
  async getSagaStatus(sagaId: string) {
    return this.purchasePlanSaga.getSagaStatus(sagaId);
  }

  async getOrder(orderId: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException(`订单不存在: ${orderId}`);
    }

    return order;
  }

  async updateOrderStatus(orderId: string, status: OrderStatus, metadata?: any): Promise<Order> {
    const order = await this.getOrder(orderId);

    order.status = status;

    if (status === OrderStatus.PAID) {
      order.paidAt = new Date();
    } else if (status === OrderStatus.CANCELLED) {
      order.cancelledAt = new Date();
      if (metadata?.cancelReason) {
        order.cancelReason = metadata.cancelReason;
      }
    } else if (status === OrderStatus.REFUNDED) {
      order.refundedAt = new Date();
      if (metadata?.refundReason) {
        order.refundReason = metadata.refundReason;
      }
    }

    if (metadata?.transactionId) {
      order.transactionId = metadata.transactionId;
    }

    return this.orderRepository.save(order);
  }

  async cancelOrder(orderId: string, reason?: string): Promise<Order> {
    const order = await this.getOrder(orderId);

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(`只能取消待支付的订单，当前状态: ${order.status}`);
    }

    order.status = OrderStatus.CANCELLED;
    order.cancelledAt = new Date();
    order.cancelReason = reason || '用户主动取消';

    return this.orderRepository.save(order);
  }

  /**
   * 确认订单
   * 管理员手动确认订单支付完成
   */
  async confirmOrder(
    orderId: string,
    confirmData: { paymentMethod?: string; transactionId?: string; note?: string }
  ): Promise<Order> {
    const order = await this.getOrder(orderId);

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(`只能确认待支付的订单，当前状态: ${order.status}`);
    }

    // 更新订单状态为已完成
    order.status = OrderStatus.COMPLETED;
    order.paidAt = new Date();

    // 如果提供了支付方式，验证并更新到订单
    if (confirmData.paymentMethod) {
      // 验证是否为有效的支付方式
      const validMethods = Object.values(PaymentMethod);
      if (validMethods.includes(confirmData.paymentMethod as PaymentMethod)) {
        order.paymentMethod = confirmData.paymentMethod as PaymentMethod;
      }
    }

    const updatedOrder = await this.orderRepository.save(order);

    this.logger.log(
      `订单已确认 - 订单ID: ${orderId}, 金额: ${order.amount}, ` +
      `支付方式: ${confirmData.paymentMethod || order.paymentMethod}, 管理员操作`
    );

    return updatedOrder;
  }

  /**
   * 获取订单统计
   */
  async getOrderStats(params: { tenantId?: string; startDate?: string; endDate?: string }) {
    const { tenantId, startDate, endDate } = params;

    // 构建查询条件
    const queryBuilder = this.orderRepository.createQueryBuilder('order');

    if (tenantId) {
      queryBuilder.andWhere('order.tenantId = :tenantId', { tenantId });
    }

    if (startDate) {
      queryBuilder.andWhere('order.createdAt >= :startDate', { startDate: new Date(startDate) });
    }

    if (endDate) {
      queryBuilder.andWhere('order.createdAt <= :endDate', { endDate: new Date(endDate + ' 23:59:59') });
    }

    // 总订单数
    const totalOrders = await queryBuilder.getCount();

    // 按状态统计
    const byStatus = await this.orderRepository
      .createQueryBuilder('order')
      .select('order.status', 'status')
      .addSelect('COUNT(order.id)', 'count')
      .addSelect('SUM(order.amount)', 'totalAmount')
      .where(tenantId ? 'order.tenantId = :tenantId' : '1=1', tenantId ? { tenantId } : {})
      .andWhere(startDate ? 'order.createdAt >= :startDate' : '1=1', startDate ? { startDate: new Date(startDate) } : {})
      .andWhere(endDate ? 'order.createdAt <= :endDate' : '1=1', endDate ? { endDate: new Date(endDate + ' 23:59:59') } : {})
      .groupBy('order.status')
      .getRawMany();

    // 总收入（仅已支付订单）
    const revenue = await this.orderRepository
      .createQueryBuilder('order')
      .select('SUM(order.amount)', 'total')
      .where('order.status = :status', { status: OrderStatus.PAID })
      .andWhere(tenantId ? 'order.tenantId = :tenantId' : '1=1', tenantId ? { tenantId } : {})
      .andWhere(startDate ? 'order.createdAt >= :startDate' : '1=1', startDate ? { startDate: new Date(startDate) } : {})
      .andWhere(endDate ? 'order.createdAt <= :endDate' : '1=1', endDate ? { endDate: new Date(endDate + ' 23:59:59') } : {})
      .getRawOne();

    return {
      totalOrders,
      byStatus: byStatus.map(item => ({
        status: item.status,
        count: parseInt(item.count),
        totalAmount: parseFloat(item.totalAmount) || 0,
      })),
      totalRevenue: parseFloat(revenue.total) || 0,
    };
  }

  /**
   * 更新订单
   */
  async updateOrder(orderId: string, data: { remark?: string; metadata?: any }): Promise<Order> {
    const order = await this.getOrder(orderId);

    if (data.remark !== undefined) {
      order.remark = data.remark;
    }

    if (data.metadata !== undefined) {
      order.metadata = { ...order.metadata, ...data.metadata };
    }

    return this.orderRepository.save(order);
  }

  /**
   * 删除订单（软删除）
   */
  async deleteOrder(orderId: string): Promise<void> {
    const order = await this.getOrder(orderId);

    // 只允许删除已取消或超时的订单
    if (order.status !== OrderStatus.CANCELLED) {
      throw new BadRequestException(`只能删除已取消的订单，当前状态: ${order.status}`);
    }

    // 软删除
    await this.orderRepository.softDelete(orderId);
  }

  /**
   * 订单退款
   * 支持两种退款方式：
   * 1. 余额支付订单 → 退回用户余额
   * 2. 第三方支付订单 → 退回用户余额（作为补偿，实际退款需手动处理）
   */
  async refundOrder(orderId: string, amount: number, reason?: string, operatorId?: string) {
    const order = await this.getOrder(orderId);

    // 检查订单状态
    if (order.status !== OrderStatus.PAID) {
      throw new BadRequestException(`只能为已支付订单退款，当前状态: ${order.status}`);
    }

    // 检查退款金额
    if (amount <= 0 || amount > order.amount) {
      throw new BadRequestException(`退款金额必须大于 0 且不能超过订单金额 ${order.amount}`);
    }

    // 检查是否已经退款过（防止重复退款）
    if (order.refundAmount && order.refundAmount > 0) {
      const remainingAmount = order.amount - order.refundAmount;
      if (amount > remainingAmount) {
        throw new BadRequestException(
          `退款金额超出可退款余额，订单金额: ${order.amount}，已退款: ${order.refundAmount}，可退款: ${remainingAmount}`
        );
      }
    }

    // ✅ 实际退款：将金额退回用户余额账户
    const refundResult = await this.balanceService.refund({
      userId: order.userId,
      amount,
      orderId: order.id,
      orderNumber: order.orderNumber,
      reason: reason || '订单退款',
      operatorId,
      metadata: {
        originalPaymentMethod: order.paymentMethod,
        planId: order.planId,
        deviceId: order.deviceId,
      },
    });

    // 更新订单状态
    const previousRefundAmount = order.refundAmount || 0;
    order.refundAmount = previousRefundAmount + amount;

    // 如果全额退款，标记为已退款状态
    if (order.refundAmount >= order.amount) {
      order.status = OrderStatus.REFUNDED;
    }
    order.refundedAt = new Date();
    order.refundReason = reason || '用户申请退款';

    const updatedOrder = await this.orderRepository.save(order);

    this.logger.log(
      `Refunded order ${order.orderNumber}: ${amount} CNY → user ${order.userId} balance. Transaction: ${refundResult.transaction.id}`
    );

    return {
      order: updatedOrder,
      refundedAmount: amount,
      refundedAt: updatedOrder.refundedAt,
      balanceTransaction: refundResult.transaction,
      newBalance: refundResult.balance.balance,
    };
  }

  /**
   * 定时任务：自动取消超时未支付订单
   */
  @ClusterSafeCron(CronExpression.EVERY_5_MINUTES)
  async cancelExpiredOrders() {
    this.logger.log('Checking expired orders...');

    const expiredOrders = await this.orderRepository.find({
      where: {
        status: OrderStatus.PENDING,
        expiresAt: LessThan(new Date()),
      },
    });

    for (const order of expiredOrders) {
      try {
        order.status = OrderStatus.CANCELLED;
        order.cancelledAt = new Date();
        order.cancelReason = '订单超时自动取消';
        await this.orderRepository.save(order);

        this.logger.log(`Cancelled expired order: ${order.orderNumber}`);
      } catch (error) {
        this.logger.error(`Failed to cancel order ${order.orderNumber}: ${error.message}`);
      }
    }

    if (expiredOrders.length > 0) {
      this.logger.log(`Cancelled ${expiredOrders.length} expired orders`);
    }
  }

  /**
   * 获取所有订单（分页）
   */
  async getAllOrders(params: {
    page: number;
    limit: number;
    status?: string;
    paymentMethod?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const { page, limit, status, paymentMethod, search, startDate, endDate } = params;
    const queryBuilder = this.orderRepository.createQueryBuilder('order');

    // 状态筛选
    if (status) {
      queryBuilder.andWhere('order.status = :status', { status });
    }

    // 支付方式筛选
    if (paymentMethod) {
      queryBuilder.andWhere('order.paymentMethod = :paymentMethod', { paymentMethod });
    }

    // 搜索（订单号）
    if (search) {
      queryBuilder.andWhere('order.id ILIKE :search', { search: `%${search}%` });
    }

    // 日期范围筛选
    if (startDate && endDate) {
      queryBuilder.andWhere('order.createdAt BETWEEN :startDate AND :endDate', {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      });
    } else if (startDate) {
      queryBuilder.andWhere('order.createdAt >= :startDate', { startDate: new Date(startDate) });
    } else if (endDate) {
      queryBuilder.andWhere('order.createdAt <= :endDate', { endDate: new Date(endDate) });
    }

    // 分页
    queryBuilder.skip((page - 1) * limit).take(limit);

    // 排序
    queryBuilder.orderBy('order.createdAt', 'DESC');

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
    };
  }

  async getUserOrders(userId: string) {
    return this.orderRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async getUserUsage(userId: string, startDate: string, endDate: string) {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const records = await this.usageRecordRepository.find({
      where: {
        userId,
        createdAt: Between(start, end),
      },
      order: { createdAt: 'DESC' },
    });

    const totalDuration = records.reduce((sum, record) => sum + record.durationSeconds, 0);
    const totalCost = records.reduce((sum, record) => sum + Number(record.cost), 0);

    return {
      records,
      summary: {
        totalDuration,
        totalCost,
        recordCount: records.length,
      },
    };
  }

  async startUsage(data: {
    userId: string;
    deviceId: string;
    tenantId: string;
    usageType?: UsageType;
  }) {
    const record = this.usageRecordRepository.create({
      userId: data.userId,
      deviceId: data.deviceId,
      tenantId: data.tenantId,
      usageType: data.usageType || UsageType.DEVICE_USAGE,
      startTime: new Date(),
      quantity: 0,
      cost: 0,
    });
    return this.usageRecordRepository.save(record);
  }

  async stopUsage(recordId: string) {
    const record = await this.usageRecordRepository.findOne({ where: { id: recordId } });

    if (!record) {
      throw new Error('Usage record not found');
    }

    const endTime = new Date();
    const duration = Math.floor((endTime.getTime() - record.startTime.getTime()) / 1000);

    // 简单计费：每小时 1 元
    const cost = (duration / 3600) * 1;

    record.endTime = endTime;
    record.durationSeconds = duration;
    record.cost = cost;
    record.isBilled = false;

    return this.usageRecordRepository.save(record);
  }

  async getStats(tenantId?: string) {
    const where: any = {};
    if (tenantId) {
      where.tenantId = tenantId;
    }

    // 总订单数
    const totalOrders = await this.orderRepository.count({ where });

    // 待支付订单数
    const pendingOrders = await this.orderRepository.count({
      where: { ...where, status: 'pending' },
    });

    // 已完成订单数
    const completedOrders = await this.orderRepository.count({
      where: { ...where, status: OrderStatus.COMPLETED },
    });

    // 总收入
    const ordersRevenue = await this.orderRepository
      .createQueryBuilder('order')
      .select('SUM(order.totalAmount)', 'total')
      .where('order.status = :status', { status: OrderStatus.COMPLETED })
      .andWhere(tenantId ? 'order.tenantId = :tenantId' : '1=1', { tenantId })
      .getRawOne();

    // 套餐统计
    const totalPlans = await this.planRepository.count({ where: { isActive: true } });

    // 本月新增订单
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const newOrdersThisMonth = await this.orderRepository
      .createQueryBuilder('order')
      .where('order.createdAt >= :date', { date: firstDayOfMonth })
      .andWhere(tenantId ? 'order.tenantId = :tenantId' : '1=1', { tenantId })
      .getCount();

    // 本月收入
    const monthRevenue = await this.orderRepository
      .createQueryBuilder('order')
      .select('SUM(order.totalAmount)', 'total')
      .where('order.createdAt >= :date', { date: firstDayOfMonth })
      .andWhere('order.status = :status', { status: OrderStatus.COMPLETED })
      .andWhere(tenantId ? 'order.tenantId = :tenantId' : '1=1', { tenantId })
      .getRawOne();

    // 使用记录统计
    const totalUsageRecords = await this.usageRecordRepository.count({ where });

    const totalUsageCost = await this.usageRecordRepository
      .createQueryBuilder('usage')
      .select('SUM(usage.cost)', 'total')
      .where(tenantId ? 'usage.tenantId = :tenantId' : '1=1', { tenantId })
      .getRawOne();

    return {
      orders: {
        total: totalOrders,
        pending: pendingOrders,
        completed: completedOrders,
        newThisMonth: newOrdersThisMonth,
      },
      revenue: {
        total: parseFloat(ordersRevenue?.total || '0'),
        thisMonth: parseFloat(monthRevenue?.total || '0'),
      },
      usage: {
        totalRecords: totalUsageRecords,
        totalCost: parseFloat(totalUsageCost?.total || '0'),
      },
      plans: {
        total: totalPlans,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 获取套餐快速列表（用于下拉框等UI组件）
   */
  async getPlansQuickList(query: { status?: string; search?: string; limit?: number }): Promise<{
    items: Array<{ id: string; name: string; status?: string; extra?: Record<string, any> }>;
    total: number;
    cached: boolean;
  }> {
    const limit = query.limit || 100;
    const cacheKey = `${CacheKeys.PLAN_QUICK_LIST}:${JSON.stringify(query)}`;

    // 1. 尝试从缓存获取
    if (this.cacheService) {
      const cached = await this.cacheService.get<any>(cacheKey);
      if (cached) {
        this.logger.debug(`Plan quick list cache hit: ${cacheKey}`);
        return { ...cached, cached: true };
      }
    }

    // 2. 数据库查询 - 只查询必要字段
    const qb = this.planRepository
      .createQueryBuilder('plan')
      .select([
        'plan.id',
        'plan.name',
        'plan.type',
        'plan.price',
        'plan.billingCycle',
        'plan.isActive',
        'plan.isPublic',
      ])
      .where('plan.isPublic = :isPublic', { isPublic: true })
      .orderBy('plan.createdAt', 'DESC')
      .limit(limit);

    // 3. 类型过滤（使用 type 字段作为 status）
    if (query.status) {
      qb.andWhere('plan.type = :type', { type: query.status });
    }

    // 4. 关键词搜索 - 搜索名称
    if (query.search) {
      qb.andWhere('plan.name LIKE :search', {
        search: `%${query.search}%`,
      });
    }

    const [plans, total] = await qb.getManyAndCount();

    const result = {
      items: plans.map((plan) => ({
        id: plan.id,
        name: plan.name,
        status: plan.type,
        extra: {
          price: plan.price,
          billingCycle: plan.billingCycle,
          isActive: plan.isActive,
        },
      })),
      total,
      cached: false,
    };

    // 5. 存入缓存（60秒）
    if (this.cacheService) {
      await this.cacheService.set(cacheKey, result, CacheTTL.QUICK_LIST);
    }

    return result;
  }

  /**
   * 获取订单快速列表（用于下拉框等UI组件）
   */
  async getOrdersQuickList(query: { status?: string; search?: string; limit?: number }): Promise<{
    items: Array<{ id: string; name: string; status?: string; extra?: Record<string, any> }>;
    total: number;
    cached: boolean;
  }> {
    const limit = query.limit || 100;
    const cacheKey = `${CacheKeys.ORDER_QUICK_LIST}:${JSON.stringify(query)}`;

    // 1. 尝试从缓存获取
    if (this.cacheService) {
      const cached = await this.cacheService.get<any>(cacheKey);
      if (cached) {
        this.logger.debug(`Order quick list cache hit: ${cacheKey}`);
        return { ...cached, cached: true };
      }
    }

    // 2. 数据库查询 - 只查询必要字段
    const qb = this.orderRepository
      .createQueryBuilder('order')
      .select([
        'order.id',
        'order.orderNumber',
        'order.finalAmount',
        'order.status',
        'order.userId',
        'order.createdAt',
      ])
      .orderBy('order.createdAt', 'DESC')
      .limit(limit);

    // 3. 状态过滤
    if (query.status) {
      qb.andWhere('order.status = :status', { status: query.status });
    }

    // 4. 关键词搜索 - 搜索订单号
    if (query.search) {
      qb.andWhere('order.orderNumber LIKE :search', {
        search: `%${query.search}%`,
      });
    }

    const [orders, total] = await qb.getManyAndCount();

    const result = {
      items: orders.map((order) => ({
        id: order.id,
        name: order.orderNumber,
        status: order.status,
        extra: {
          amount: order.finalAmount,
          userId: order.userId,
          createdAt: order.createdAt,
        },
      })),
      total,
      cached: false,
    };

    // 5. 存入缓存（60秒）
    if (this.cacheService) {
      await this.cacheService.set(cacheKey, result, CacheTTL.QUICK_LIST);
    }

    return result;
  }

  // ============================================================================
  // P1 新增方法 - 云对账功能
  // ============================================================================

  /**
   * 云对账
   * 获取云服务商计费数据并与平台计费进行对账
   *
   * @param params 对账参数
   * @returns 对账结果
   */
  async getCloudReconciliation(params: {
    startDate?: string;
    endDate?: string;
    provider?: string;
    reconciliationType?: string;
  }) {
    this.logger.log(`开始云对账: ${JSON.stringify(params)}`);

    // 设置默认日期范围（最近30天）
    const endDate = params.endDate ? new Date(params.endDate) : new Date();
    const startDate = params.startDate
      ? new Date(params.startDate)
      : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    // 验证日期范围
    if (startDate > endDate) {
      throw new BadRequestException('开始日期不能大于结束日期');
    }

    // 1. 获取平台计费数据
    const platformData = await this.getPlatformBillingData(
      startDate,
      endDate,
      params.reconciliationType
    );

    // 2. 获取云服务商计费数据（模拟数据，实际应调用云服务商API）
    const providerData = await this.getProviderBillingData(
      startDate,
      endDate,
      params.provider,
      params.reconciliationType
    );

    // 3. 进行对账比对
    const reconciliationResult = this.performReconciliation(platformData, providerData);

    // 4. 计算统计数据
    const summary = {
      totalPlatformCost: platformData.totalCost,
      totalProviderCost: providerData.totalCost,
      discrepancy: Math.abs(platformData.totalCost - providerData.totalCost),
      discrepancyRate:
        platformData.totalCost > 0
          ? (
              (Math.abs(platformData.totalCost - providerData.totalCost) / platformData.totalCost) *
              100
            ).toFixed(2)
          : 0,
    };

    return {
      summary,
      details: reconciliationResult,
      reconciliationDate: new Date().toISOString(),
      dateRange: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      },
      provider: params.provider || 'all',
      reconciliationType: params.reconciliationType || 'all',
    };
  }

  /**
   * 获取平台计费数据
   */
  private async getPlatformBillingData(
    startDate: Date,
    endDate: Date,
    reconciliationType?: string
  ) {
    // 查询平台的使用记录和订单数据
    const usageRecords = await this.usageRecordRepository.find({
      where: {
        createdAt: Between(startDate, endDate),
        ...(reconciliationType && reconciliationType !== 'all'
          ? { usageType: reconciliationType as UsageType }
          : {}),
      },
    });

    const totalCost = usageRecords.reduce((sum, record) => sum + (record.cost || 0), 0);

    const records = usageRecords.map((record) => ({
      resourceType: record.usageType,
      resourceId: record.deviceId || record.id,
      cost: record.cost || 0,
      duration: record.endTime
        ? (new Date(record.endTime).getTime() - new Date(record.startTime).getTime()) / 1000
        : 0,
      startTime: record.startTime,
      endTime: record.endTime,
    }));

    return {
      totalCost,
      records,
      count: records.length,
    };
  }

  /**
   * 获取云服务商计费数据
   * 注意：这是模拟实现，实际应该调用云服务商的API
   */
  private async getProviderBillingData(
    startDate: Date,
    endDate: Date,
    provider?: string,
    reconciliationType?: string
  ) {
    // 云服务商 API 集成说明：
    // 当前为 Mock 实现，生产环境应按以下方式集成：
    // - AWS: Cost Explorer API (ce.getCostAndUsage)
    // - 阿里云: BssOpenApi QueryBill
    // - 腾讯云: Billing DescribeBillDetail
    // 建议创建独立的 CloudProviderBillingService 统一管理

    this.logger.log(`获取云服务商计费数据 - Provider: ${provider}, Type: ${reconciliationType}`);

    // 模拟云服务商返回数据
    // 实际应该根据provider调用不同的API
    const mockProviderData: {
      totalCost: number;
      records: any[];
      count: number;
    } = {
      totalCost: 0,
      records: [],
      count: 0,
    };

    // 这里返回模拟数据，实际应该是真实的云服务商账单
    // 建议与平台数据差异在5%以内
    const platformTotal = await this.usageRecordRepository
      .createQueryBuilder('usage')
      .select('SUM(usage.cost)', 'total')
      .where('usage.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .getRawOne();

    const simulatedTotal = (platformTotal?.total || 0) * (1 + (Math.random() * 0.1 - 0.05)); // ±5% 差异

    mockProviderData.totalCost = simulatedTotal;
    mockProviderData.count = 1;
    mockProviderData.records = [
      {
        resourceType: reconciliationType || 'all',
        resourceId: 'cloud-bill-001',
        cost: simulatedTotal,
        billingPeriod: `${startDate.toISOString().split('T')[0]} ~ ${endDate.toISOString().split('T')[0]}`,
      },
    ] as any[];

    return mockProviderData;
  }

  /**
   * 执行对账比对
   */
  private performReconciliation(platformData: any, providerData: any) {
    const details = [];

    // 按资源类型汇总平台数据
    const platformByType = platformData.records.reduce(
      (acc: Record<string, { cost: number; count: number }>, record: any) => {
        const key = record.resourceType || 'unknown';
        if (!acc[key]) {
          acc[key] = { cost: 0, count: 0 };
        }
        acc[key].cost += record.cost;
        acc[key].count += 1;
        return acc;
      },
      {} as Record<string, { cost: number; count: number }>
    );

    // 按资源类型汇总云服务商数据
    const providerByType = providerData.records.reduce(
      (acc: Record<string, { cost: number; count: number }>, record: any) => {
        const key = record.resourceType || 'unknown';
        if (!acc[key]) {
          acc[key] = { cost: 0, count: 0 };
        }
        acc[key].cost += record.cost;
        acc[key].count += 1;
        return acc;
      },
      {} as Record<string, { cost: number; count: number }>
    );

    // 合并所有资源类型
    const allTypes = new Set([...Object.keys(platformByType), ...Object.keys(providerByType)]);

    for (const type of allTypes) {
      const platformCost = platformByType[type]?.cost || 0;
      const providerCost = providerByType[type]?.cost || 0;
      const difference = Math.abs(platformCost - providerCost);
      const threshold = 0.01; // 1分钱阈值

      let status: string;
      if (!platformByType[type]) {
        status = 'missing_platform';
      } else if (!providerByType[type]) {
        status = 'missing_provider';
      } else if (difference < threshold) {
        status = 'matched';
      } else {
        status = 'discrepancy';
      }

      details.push({
        resourceType: type,
        resourceId: `${type}-summary`,
        platformCost: platformCost.toFixed(2),
        providerCost: providerCost.toFixed(2),
        difference: difference.toFixed(2),
        differenceRate:
          platformCost > 0 ? `${((difference / platformCost) * 100).toFixed(2)}%` : 'N/A',
        status,
        platformRecordCount: platformByType[type]?.count || 0,
        providerRecordCount: providerByType[type]?.count || 0,
      });
    }

    return details;
  }
}
