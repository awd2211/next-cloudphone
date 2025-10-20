import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as ExcelJS from 'exceljs';
import { createObjectCsvWriter } from 'csv-writer';
import * as fs from 'fs';
import * as path from 'path';
import { Order, OrderStatus } from '../billing/entities/order.entity';
import { UsageRecord } from '../billing/entities/usage-record.entity';
import { Plan } from '../billing/entities/plan.entity';

export interface ReportOptions {
  startDate: Date;
  endDate: Date;
  userId?: string;
  tenantId?: string;
  format?: 'excel' | 'csv';
}

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(UsageRecord)
    private usageRecordRepository: Repository<UsageRecord>,
    @InjectRepository(Plan)
    private planRepository: Repository<Plan>,
    private configService: ConfigService,
  ) {}

  /**
   * 生成用户账单报表
   */
  async generateUserBillReport(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<any> {
    this.logger.log(`Generating bill report for user ${userId}`);

    // 获取订单
    const orders = await this.orderRepository.find({
      where: {
        userId,
        createdAt: Between(startDate, endDate),
      },
      order: { createdAt: 'DESC' },
    });

    // 获取使用记录
    const usageRecords = await this.usageRecordRepository.find({
      where: {
        userId,
        startTime: Between(startDate, endDate),
      },
      order: { startTime: 'DESC' },
    });

    // 计算总计
    const totalAmount = orders.reduce((sum, order) => sum + order.amount, 0);
    const totalCpuHours = usageRecords.reduce((sum, r) => sum + (r.durationSeconds / 3600), 0);
    const totalDuration = usageRecords.reduce((sum, r) => sum + r.durationSeconds, 0);

    return {
      userId,
      period: {
        start: startDate,
        end: endDate,
      },
      summary: {
        totalOrders: orders.length,
        totalAmount: totalAmount.toFixed(2),
        totalCpuHours: totalCpuHours.toFixed(2),
        totalDurationHours: (totalDuration / 3600).toFixed(2),
      },
      orders: orders.map(order => ({
        id: order.id,
        amount: order.amount,
        status: order.status,
        createdAt: order.createdAt,
        paidAt: order.paidAt,
      })),
      usageRecords: usageRecords.slice(0, 100), // 限制返回数量
    };
  }

  /**
   * 生成收入统计报表
   */
  async generateRevenueReport(startDate: Date, endDate: Date, tenantId?: string): Promise<any> {
    this.logger.log(`Generating revenue report from ${startDate} to ${endDate}`);

    const whereClause: any = {
      createdAt: Between(startDate, endDate),
      status: 'paid',
    };

    if (tenantId) {
      whereClause.tenantId = tenantId;
    }

    const paidOrders = await this.orderRepository.find({
      where: whereClause,
      order: { createdAt: 'DESC' },
    });

    // 按日期分组统计
    const dailyRevenue = new Map<string, number>();
    paidOrders.forEach(order => {
      const date = order.createdAt.toISOString().split('T')[0];
      const current = dailyRevenue.get(date) || 0;
      dailyRevenue.set(date, current + order.amount);
    });

    // 按套餐分组统计
    const planRevenue = new Map<string, { count: number; amount: number }>();
    paidOrders.forEach(order => {
      const planId = order.planId || 'unknown';
      const current = planRevenue.get(planId) || { count: 0, amount: 0 };
      planRevenue.set(planId, {
        count: current.count + 1,
        amount: current.amount + order.amount,
      });
    });

    const totalRevenue = paidOrders.reduce((sum, order) => sum + order.amount, 0);

    return {
      period: {
        start: startDate,
        end: endDate,
      },
      summary: {
        totalOrders: paidOrders.length,
        totalRevenue: totalRevenue.toFixed(2),
        avgOrderValue: (totalRevenue / paidOrders.length || 0).toFixed(2),
      },
      dailyRevenue: Array.from(dailyRevenue.entries()).map(([date, revenue]) => ({
        date,
        revenue: revenue.toFixed(2),
      })),
      planRevenue: Array.from(planRevenue.entries()).map(([planId, stats]) => ({
        planId,
        orderCount: stats.count,
        totalRevenue: stats.amount.toFixed(2),
        avgRevenue: (stats.amount / stats.count).toFixed(2),
      })),
    };
  }

  /**
   * 生成使用趋势报表
   */
  async generateUsageTrendReport(
    startDate: Date,
    endDate: Date,
    userId?: string,
    tenantId?: string,
  ): Promise<any> {
    this.logger.log(`Generating usage trend report`);

    const whereClause: any = {
      recordedAt: Between(startDate, endDate),
    };

    if (userId) {
      whereClause.userId = userId;
    }
    if (tenantId) {
      whereClause.tenantId = tenantId;
    }

    const usageRecords = await this.usageRecordRepository.find({
      where: whereClause,
      order: { startTime: 'ASC' },
    });

    // 按日期分组
    const dailyUsage = new Map<string, {
      cpuHours: number;
      memoryGB: number;
      duration: number;
    }>();

    usageRecords.forEach(record => {
      const date = record.startTime.toISOString().split('T')[0];
      const current = dailyUsage.get(date) || { cpuHours: 0, memoryGB: 0, duration: 0 };
      // 使用 durationSeconds 计算小时数，quantity 作为资源使用量
      const durationHours = record.durationSeconds / 3600;
      dailyUsage.set(date, {
        cpuHours: current.cpuHours + durationHours,
        memoryGB: current.memoryGB + Number(record.quantity || 0),
        duration: current.duration + record.durationSeconds,
      });
    });

    return {
      period: {
        start: startDate,
        end: endDate,
      },
      trend: Array.from(dailyUsage.entries()).map(([date, usage]) => ({
        date,
        cpuHours: usage.cpuHours.toFixed(2),
        memoryGB: usage.memoryGB.toFixed(2),
        durationHours: (usage.duration / 3600).toFixed(2),
      })),
    };
  }

  /**
   * 导出 Excel 报表
   */
  async exportToExcel(data: any, fileName: string): Promise<string> {
    this.logger.log(`Exporting to Excel: ${fileName}`);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'CloudPhone Platform';
    workbook.created = new Date();

    // 创建摘要表
    const summarySheet = workbook.addWorksheet('Summary');
    summarySheet.columns = [
      { header: '指标', key: 'metric', width: 30 },
      { header: '值', key: 'value', width: 20 },
    ];

    if (data.summary) {
      Object.entries(data.summary).forEach(([key, value]) => {
        summarySheet.addRow({
          metric: key,
          value: String(value),
        });
      });
    }

    // 创建详细数据表
    if (data.orders && data.orders.length > 0) {
      const ordersSheet = workbook.addWorksheet('Orders');
      ordersSheet.columns = [
        { header: 'Order ID', key: 'id', width: 36 },
        { header: 'Amount', key: 'amount', width: 15 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Created At', key: 'createdAt', width: 20 },
        { header: 'Paid At', key: 'paidAt', width: 20 },
      ];
      ordersSheet.addRows(data.orders);
    }

    if (data.trend && data.trend.length > 0) {
      const trendSheet = workbook.addWorksheet('Usage Trend');
      trendSheet.columns = [
        { header: 'Date', key: 'date', width: 15 },
        { header: 'CPU Hours', key: 'cpuHours', width: 15 },
        { header: 'Memory GB', key: 'memoryGB', width: 15 },
        { header: 'Duration Hours', key: 'durationHours', width: 15 },
      ];
      trendSheet.addRows(data.trend);
    }

    // 保存文件
    const outputDir = this.configService.get('REPORTS_DIR', '/tmp/reports');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const filePath = path.join(outputDir, `${fileName}.xlsx`);
    await workbook.xlsx.writeFile(filePath);

    this.logger.log(`Excel file saved: ${filePath}`);
    return filePath;
  }

  /**
   * 导出 CSV 报表
   */
  async exportToCSV(data: any[], fileName: string, headers: any[]): Promise<string> {
    this.logger.log(`Exporting to CSV: ${fileName}`);

    const outputDir = this.configService.get('REPORTS_DIR', '/tmp/reports');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const filePath = path.join(outputDir, `${fileName}.csv`);

    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: headers,
    });

    await csvWriter.writeRecords(data);

    this.logger.log(`CSV file saved: ${filePath}`);
    return filePath;
  }

  /**
   * 获取套餐统计
   */
  async getPlanStats(): Promise<any> {
    const plans = await this.planRepository.find();
    const planStats = [];

    for (const plan of plans) {
      const orderCount = await this.orderRepository.count({
        where: { planId: plan.id },
      });

      const paidOrders = await this.orderRepository.find({
        where: { planId: plan.id, status: OrderStatus.PAID },
      });

      const totalRevenue = paidOrders.reduce((sum, order) => sum + order.amount, 0);

      planStats.push({
        planId: plan.id,
        planName: plan.name,
        price: plan.price,
        orderCount,
        paidCount: paidOrders.length,
        totalRevenue: totalRevenue.toFixed(2),
      });
    }

    return planStats;
  }
}
