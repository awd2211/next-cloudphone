import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual } from 'typeorm';
import { Order, OrderStatus } from '../billing/entities/order.entity';
import { HttpClientService } from '@cloudphone/shared';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class StatsService {
  private readonly logger = new Logger(StatsService.name);

  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    private readonly httpClient: HttpClientService,
    private readonly configService: ConfigService
  ) {}

  /**
   * 获取仪表盘统计数据
   */
  async getDashboardStats() {
    const [totalUsers, activeDevices, todayRevenue, monthRevenue, todayOrders, pendingOrders] =
      await Promise.all([
        this.getTotalUsersCount(),
        this.getOnlineDevicesCount(),
        this.getTodayRevenue(),
        this.getMonthRevenue(),
        this.getTodayOrdersCount(),
        this.getPendingOrdersCount(),
      ]);

    return {
      totalUsers,
      activeDevices,
      todayRevenue,
      monthRevenue,
      todayOrders,
      pendingOrders,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * 获取总用户数
   */
  async getTotalUsersCount(): Promise<number> {
    try {
      const userServiceUrl = this.configService.get(
        'USER_SERVICE_URL',
        'http://user-service:30001'
      );
      const response = await this.httpClient.get<{ count: number }>(
        `${userServiceUrl}/users/count`,
        {},
        { timeout: 5000, retries: 2, circuitBreaker: true }
      );
      return response.count || 0;
    } catch (error) {
      this.logger.warn(`Failed to get total users count: ${error.message}`);
      return 0;
    }
  }

  /**
   * 获取在线设备数
   */
  async getOnlineDevicesCount(): Promise<number> {
    try {
      const deviceServiceUrl = this.configService.get(
        'DEVICE_SERVICE_URL',
        'http://device-service:30002'
      );
      const response = await this.httpClient.get<{ count: number }>(
        `${deviceServiceUrl}/devices/count?status=running`,
        {},
        { timeout: 5000, retries: 2, circuitBreaker: true }
      );
      return response.count || 0;
    } catch (error) {
      this.logger.warn(`Failed to get online devices count: ${error.message}`);
      return 0;
    }
  }

  /**
   * 获取设备状态分布
   */
  async getDeviceStatusDistribution() {
    try {
      const deviceServiceUrl = this.configService.get(
        'DEVICE_SERVICE_URL',
        'http://device-service:30002'
      );
      const response = await this.httpClient.get<any>(
        `${deviceServiceUrl}/devices/stats/status-distribution`,
        {},
        { timeout: 5000, retries: 2, circuitBreaker: true }
      );
      return response || { idle: 0, running: 0, stopped: 0, error: 0 };
    } catch (error) {
      this.logger.warn(`Failed to get device status distribution: ${error.message}`);
      return { idle: 0, running: 0, stopped: 0, error: 0 };
    }
  }

  /**
   * 获取今日新增用户数
   */
  async getTodayNewUsersCount(): Promise<number> {
    try {
      const userServiceUrl = this.configService.get(
        'USER_SERVICE_URL',
        'http://user-service:30001'
      );
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const response = await this.httpClient.get<{ count: number }>(
        `${userServiceUrl}/users/count?createdAfter=${today.toISOString()}`,
        {},
        { timeout: 5000, retries: 2, circuitBreaker: true }
      );
      return response.count || 0;
    } catch (error) {
      this.logger.warn(`Failed to get today new users count: ${error.message}`);
      return 0;
    }
  }

  /**
   * 获取用户活跃度统计
   */
  async getUserActivityStats(days: number = 7) {
    try {
      const userServiceUrl = this.configService.get(
        'USER_SERVICE_URL',
        'http://user-service:30001'
      );
      const response = await this.httpClient.get<any>(
        `${userServiceUrl}/users/stats/activity?days=${days}`,
        {},
        { timeout: 5000, retries: 2, circuitBreaker: true }
      );
      return response || [];
    } catch (error) {
      this.logger.warn(`Failed to get user activity stats: ${error.message}`);
      return [];
    }
  }

  /**
   * 获取用户增长统计
   */
  async getUserGrowthStats(days: number = 30) {
    try {
      const userServiceUrl = this.configService.get(
        'USER_SERVICE_URL',
        'http://user-service:30001'
      );
      const response = await this.httpClient.get<any>(
        `${userServiceUrl}/users/stats/growth?days=${days}`,
        {},
        { timeout: 5000, retries: 2, circuitBreaker: true }
      );
      return response || [];
    } catch (error) {
      this.logger.warn(`Failed to get user growth stats: ${error.message}`);
      return [];
    }
  }

  /**
   * 获取今日收入
   */
  async getTodayRevenue(): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const result = await this.orderRepository
      .createQueryBuilder('order')
      .select('SUM(order.amount)', 'total')
      .where('order.status = :status', { status: OrderStatus.PAID })
      .andWhere('order.paidAt >= :start', { start: today })
      .andWhere('order.paidAt < :end', { end: tomorrow })
      .getRawOne();

    return parseFloat(result?.total || '0');
  }

  /**
   * 获取本月收入
   */
  async getMonthRevenue(): Promise<number> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const result = await this.orderRepository
      .createQueryBuilder('order')
      .select('SUM(order.amount)', 'total')
      .where('order.status = :status', { status: OrderStatus.PAID })
      .andWhere('order.paidAt >= :start', { start: monthStart })
      .andWhere('order.paidAt < :end', { end: monthEnd })
      .getRawOne();

    return parseFloat(result?.total || '0');
  }

  /**
   * 获取收入趋势
   */
  async getRevenueTrend(days: number = 30) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const orders = await this.orderRepository
      .createQueryBuilder('order')
      .select('DATE(order.paidAt)', 'date')
      .addSelect('SUM(order.amount)', 'revenue')
      .addSelect('COUNT(order.id)', 'orders')
      .where('order.status = :status', { status: OrderStatus.PAID })
      .andWhere('order.paidAt >= :start', { start: startDate })
      .andWhere('order.paidAt <= :end', { end: endDate })
      .groupBy('DATE(order.paidAt)')
      .orderBy('date', 'ASC')
      .getRawMany();

    return orders.map((row) => ({
      date: row.date,
      revenue: parseFloat(row.revenue || '0'),
      orders: parseInt(row.orders || '0'),
    }));
  }

  /**
   * 获取今日订单数
   */
  private async getTodayOrdersCount(): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return await this.orderRepository.count({
      where: {
        createdAt: Between(today, tomorrow),
      },
    });
  }

  /**
   * 获取待处理订单数
   */
  private async getPendingOrdersCount(): Promise<number> {
    return await this.orderRepository.count({
      where: {
        status: OrderStatus.PENDING,
      },
    });
  }

  /**
   * 获取套餐分布统计
   */
  async getPlanDistributionStats() {
    try {
      const userServiceUrl = this.configService.get(
        'USER_SERVICE_URL',
        'http://user-service:30001'
      );
      const response = await this.httpClient.get<any>(
        `${userServiceUrl}/plans/stats/distribution`,
        {},
        { timeout: 5000, retries: 2, circuitBreaker: true }
      );
      return response || [];
    } catch (error) {
      this.logger.warn(`Failed to get plan distribution stats: ${error.message}`);
      return [];
    }
  }

  /**
   * 获取全局统计概览（更全面的统计数据）
   */
  async getOverview() {
    const [
      // 用户统计
      totalUsers,
      todayNewUsers,
      activeUsers,
      // 设备统计
      totalDevices,
      onlineDevices,
      deviceDistribution,
      // 订单统计
      totalOrders,
      todayOrders,
      pendingOrders,
      // 收入统计
      todayRevenue,
      monthRevenue,
      totalRevenue,
      // 应用统计
      totalApps,
    ] = await Promise.all([
      // 用户
      this.getTotalUsersCount(),
      this.getTodayNewUsersCount(),
      this.getActiveUsersCount(),
      // 设备
      this.getTotalDevicesCount(),
      this.getOnlineDevicesCount(),
      this.getDeviceStatusDistribution(),
      // 订单
      this.getTotalOrdersCount(),
      this.getTodayOrdersCount(),
      this.getPendingOrdersCount(),
      // 收入
      this.getTodayRevenue(),
      this.getMonthRevenue(),
      this.getTotalRevenue(),
      // 应用
      this.getTotalAppsCount(),
    ]);

    return {
      users: {
        total: totalUsers,
        todayNew: todayNewUsers,
        active: activeUsers,
      },
      devices: {
        total: totalDevices,
        online: onlineDevices,
        distribution: deviceDistribution,
      },
      orders: {
        total: totalOrders,
        today: todayOrders,
        pending: pendingOrders,
      },
      revenue: {
        today: todayRevenue,
        month: monthRevenue,
        total: totalRevenue,
      },
      apps: {
        total: totalApps,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 获取性能统计
   */
  async getPerformance() {
    const [deviceServiceHealth, userServiceHealth, billingServiceHealth] = await Promise.all([
      this.getServiceHealth('device-service', 'DEVICE_SERVICE_URL', 30002),
      this.getServiceHealth('user-service', 'USER_SERVICE_URL', 30001),
      this.getServiceHealth('billing-service', 'BILLING_SERVICE_URL', 30005),
    ]);

    return {
      services: {
        deviceService: deviceServiceHealth,
        userService: userServiceHealth,
        billingService: billingServiceHealth,
      },
      system: {
        uptime: process.uptime(),
        memory: {
          used: process.memoryUsage().heapUsed / 1024 / 1024, // MB
          total: process.memoryUsage().heapTotal / 1024 / 1024, // MB
        },
        cpu: process.cpuUsage(),
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 获取服务健康状态
   */
  private async getServiceHealth(
    serviceName: string,
    configKey: string,
    defaultPort: number
  ): Promise<any> {
    try {
      const serviceUrl = this.configService.get(configKey, `http://${serviceName}:${defaultPort}`);
      const startTime = Date.now();
      const response = await this.httpClient.get<any>(
        `${serviceUrl}/health`,
        {},
        { timeout: 3000, retries: 1 }
      );
      const responseTime = Date.now() - startTime;

      return {
        status: 'healthy',
        responseTime,
        details: response,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
      };
    }
  }

  /**
   * 获取活跃用户数
   */
  private async getActiveUsersCount(): Promise<number> {
    try {
      const userServiceUrl = this.configService.get(
        'USER_SERVICE_URL',
        'http://user-service:30001'
      );
      const response = await this.httpClient.get<{ count: number }>(
        `${userServiceUrl}/users/count?status=active`,
        {},
        { timeout: 5000, retries: 2, circuitBreaker: true }
      );
      return response.count || 0;
    } catch (error) {
      this.logger.warn(`Failed to get active users count: ${error.message}`);
      return 0;
    }
  }

  /**
   * 获取总设备数
   */
  private async getTotalDevicesCount(): Promise<number> {
    try {
      const deviceServiceUrl = this.configService.get(
        'DEVICE_SERVICE_URL',
        'http://device-service:30002'
      );
      const response = await this.httpClient.get<{ count: number }>(
        `${deviceServiceUrl}/devices/count`,
        {},
        { timeout: 5000, retries: 2, circuitBreaker: true }
      );
      return response.count || 0;
    } catch (error) {
      this.logger.warn(`Failed to get total devices count: ${error.message}`);
      return 0;
    }
  }

  /**
   * 获取总订单数
   */
  private async getTotalOrdersCount(): Promise<number> {
    return await this.orderRepository.count();
  }

  /**
   * 获取总收入
   */
  private async getTotalRevenue(): Promise<number> {
    const result = await this.orderRepository
      .createQueryBuilder('order')
      .select('SUM(order.amount)', 'total')
      .where('order.status = :status', { status: OrderStatus.PAID })
      .getRawOne();

    return parseFloat(result?.total || '0');
  }

  /**
   * 获取总应用数
   */
  private async getTotalAppsCount(): Promise<number> {
    try {
      const appServiceUrl = this.configService.get('APP_SERVICE_URL', 'http://app-service:30003');
      const response = await this.httpClient.get<{ count: number }>(
        `${appServiceUrl}/apps/count`,
        {},
        { timeout: 5000, retries: 2, circuitBreaker: true }
      );
      return response.count || 0;
    } catch (error) {
      this.logger.warn(`Failed to get total apps count: ${error.message}`);
      return 0;
    }
  }
}
