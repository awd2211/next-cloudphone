import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProxyProvider } from '../../entities/proxy-provider.entity';
import { ProxyProviderConfigService } from './proxy-provider-config.service';
import { KookeeyAdapter } from '../../adapters/kookeey/kookeey.adapter';
import {
  KookeeyBalanceDto,
  KookeeyStockDto,
  KookeeyProxyListDto,
  KookeeyProxyDto,
  KookeeyOrderListDto,
  KookeeyOrderDto,
  KookeeyUsageStatsDto,
} from '../dto/kookeey.dto';

/**
 * Kookeey 服务
 *
 * 封装 Kookeey Adapter 的高级功能，提供业务层接口
 */
@Injectable()
export class KookeeyService {
  private readonly logger = new Logger(KookeeyService.name);

  constructor(
    @InjectRepository(ProxyProvider)
    private readonly providerRepo: Repository<ProxyProvider>,
    private readonly configService: ProxyProviderConfigService,
  ) {}

  /**
   * 获取账户余额
   */
  async getBalance(providerId: string): Promise<KookeeyBalanceDto> {
    const adapter = await this.getAdapter(providerId);

    const balanceInfo = await adapter.getBalance();
    const remainingFlowMB = await adapter.getRemainingFlow();

    return {
      balance: balanceInfo.balance,
      currency: balanceInfo.currency || 'USD',
      remainingBandwidthMB: remainingFlowMB,
      remainingBandwidthGB: Number((remainingFlowMB / 1024).toFixed(2)),
    };
  }

  /**
   * 获取库存信息
   */
  async getStock(providerId: string, groupId: number): Promise<KookeeyStockDto> {
    const adapter = await this.getAdapter(providerId);

    const availableStock = await adapter.getStock(groupId);

    return {
      groupId,
      availableStock,
      totalStock: availableStock,
    };
  }

  /**
   * 提取代理
   */
  async extractProxies(
    providerId: string,
    groupId: number,
    num: number = 1,
    country?: string,
    state?: string,
    city?: string,
    duration?: number,
  ): Promise<KookeeyProxyListDto> {
    const adapter = await this.getAdapter(providerId);

    const proxies = await adapter.getProxyList({
      limit: num,
      country,
      state,
      city,
      sessionDuration: duration,
      metadata: {
        groupId,
      },
    } as any);

    const proxyDtos: KookeeyProxyDto[] = proxies.map((proxy) => ({
      id: proxy.id,
      host: proxy.host,
      port: proxy.port,
      username: proxy.username,
      password: proxy.password,
      protocol: proxy.protocol,
      country: proxy.location?.country,
      state: proxy.location?.state,
      city: proxy.location?.city,
      expiresAt: proxy.expiresAt,
      createdAt: proxy.createdAt,
    }));

    return {
      proxies: proxyDtos,
      total: proxyDtos.length,
    };
  }

  /**
   * 获取订单列表
   */
  async getOrders(
    providerId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<KookeeyOrderListDto> {
    const adapter = await this.getAdapter(providerId);

    const ordersData = await adapter.getOrders(page, limit);

    const orders: KookeeyOrderDto[] = ordersData.map((order: any) => ({
      orderId: order.id || order.orderId,
      groupId: order.groupId || order.g,
      packageName: order.packageName || order.package,
      quantity: order.quantity || order.num,
      amount: order.amount || order.price,
      status: order.status,
      createdAt: order.createdAt ? new Date(order.createdAt * 1000) : new Date(),
      expiresAt: order.expiresAt ? new Date(order.expiresAt * 1000) : undefined,
    }));

    return {
      orders,
      total: orders.length,
      page,
      limit,
    };
  }

  /**
   * 获取使用统计
   */
  async getUsageStats(
    providerId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<KookeeyUsageStatsDto> {
    const adapter = await this.getAdapter(providerId);

    const stats = await adapter.getUsageStats(startDate, endDate);

    return {
      totalRequests: stats.totalRequests,
      successfulRequests: stats.successfulRequests,
      failedRequests: stats.failedRequests,
      successRate: Number(stats.successRate.toFixed(2)),
      totalBandwidthMB: stats.totalBandwidthMB,
      totalBandwidthGB: Number((stats.totalBandwidthMB / 1024).toFixed(2)),
      averageLatency: stats.averageLatency,
      periodStart: stats.periodStart,
      periodEnd: stats.periodEnd,
    };
  }

  /**
   * 获取可用地区列表
   */
  async getAvailableRegions(providerId: string): Promise<any[]> {
    const adapter = await this.getAdapter(providerId);
    const regions = await adapter.getAvailableRegions();

    return regions.map((region) => ({
      country: region.country,
      countryName: region.countryName,
      cities: region.cities || [],
      availableProxies: region.availableProxies || 0,
      costPerGB: region.costPerGB,
    }));
  }

  /**
   * 获取并初始化 Kookeey Adapter
   */
  private async getAdapter(providerId: string): Promise<KookeeyAdapter> {
    const provider = await this.providerRepo.findOne({ where: { id: providerId } });

    if (!provider) {
      throw new NotFoundException(`Provider with ID ${providerId} not found`);
    }

    if (provider.type !== 'kookeey') {
      throw new NotFoundException(
        `Provider ${provider.name} is not a Kookeey provider (type: ${provider.type})`,
      );
    }

    // 解密配置
    const config = this.configService.decryptConfig(provider.config);

    // 创建并初始化 Adapter
    const adapter = new KookeeyAdapter();
    await adapter.initialize({
      name: provider.name,
      apiKey: config.accessId || config.apiKey,
      apiUrl: config.apiUrl || 'https://kookeey.com',
      costPerGB: Number(provider.costPerGB),
      extra: {
        accessId: config.accessId,
        token: config.token,
      },
    });

    return adapter;
  }
}
