import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Order } from './entities/order.entity';
import { Plan } from './entities/plan.entity';
import { UsageRecord, UsageType } from './entities/usage-record.entity';

@Injectable()
export class BillingService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(Plan)
    private planRepository: Repository<Plan>,
    @InjectRepository(UsageRecord)
    private usageRecordRepository: Repository<UsageRecord>,
  ) {}

  async getPlans() {
    return this.planRepository.find({ where: { isActive: true } });
  }

  async createOrder(createOrderDto: any) {
    const order = this.orderRepository.create(createOrderDto);
    return this.orderRepository.save(order);
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

  async startUsage(data: { userId: string; deviceId: string; tenantId: string; usageType?: UsageType }) {
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
      where: { ...where, status: 'completed' },
    });

    // 总收入
    const ordersRevenue = await this.orderRepository
      .createQueryBuilder('order')
      .select('SUM(order.totalAmount)', 'total')
      .where('order.status = :status', { status: 'completed' })
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
      .andWhere('order.status = :status', { status: 'completed' })
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
}
