import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Order } from './entities/order.entity';
import { Plan } from './entities/plan.entity';
import { UsageRecord } from './entities/usage-record.entity';

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

    const totalDuration = records.reduce((sum, record) => sum + record.duration, 0);
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

  async startUsage(data: { userId: string; deviceId: string; tenantId: string }) {
    const record = this.usageRecordRepository.create({
      ...data,
      startTime: new Date(),
      status: 'active',
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
    record.duration = duration;
    record.cost = cost;
    record.status = 'completed';

    return this.usageRecordRepository.save(record);
  }
}
