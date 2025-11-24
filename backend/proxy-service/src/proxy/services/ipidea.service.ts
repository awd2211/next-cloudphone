import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProxyProvider } from '../../entities/proxy-provider.entity';
import { ProxyProviderConfigService } from './proxy-provider-config.service';
import { IPIDEAAdapter } from '../../adapters/ipidea/ipidea.adapter';
import {
  IPIDEAFlowStatsDto,
  IPIDEAUsageRecordDto,
  IPIDEAAccountListDto,
  IPIDEAAccountDto,
} from '../dto/ipidea.dto';

/**
 * IPIDEA 服务
 *
 * 封装 IPIDEA Adapter 的高级功能，提供业务层接口
 */
@Injectable()
export class IPIDEAService {
  private readonly logger = new Logger(IPIDEAService.name);

  constructor(
    @InjectRepository(ProxyProvider)
    private readonly providerRepo: Repository<ProxyProvider>,
    private readonly configService: ProxyProviderConfigService,
  ) {}

  /**
   * 获取剩余流量
   */
  async getRemainingFlow(providerId: string): Promise<IPIDEAFlowStatsDto> {
    const adapter = await this.getAdapter(providerId);

    const flowLeftMB = await adapter.getRemainingFlow();
    const flowLeftGB = Number((flowLeftMB / 1024).toFixed(2));

    return {
      flowLeftMB,
      flowLeftGB,
    };
  }

  /**
   * 获取流量使用记录
   */
  async getFlowUsage(
    providerId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<IPIDEAUsageRecordDto> {
    const adapter = await this.getAdapter(providerId);

    const stats = await adapter.getUsageStats(startDate, endDate);

    return {
      totalFlowMB: stats.totalBandwidthMB,
      totalFlowGB: Number((stats.totalBandwidthMB / 1024).toFixed(2)),
      totalRequests: stats.totalRequests,
      successfulRequests: stats.successfulRequests,
      failedRequests: stats.failedRequests,
      successRate: stats.successRate,
      averageLatency: stats.averageLatency,
      periodStart: stats.periodStart,
      periodEnd: stats.periodEnd,
    };
  }

  /**
   * 设置流量预警
   */
  async setFlowWarning(providerId: string, thresholdMB: number): Promise<boolean> {
    const adapter = await this.getAdapter(providerId);
    return adapter.setFlowWarning(thresholdMB);
  }

  /**
   * 获取白名单IP列表
   */
  async getWhitelistIPs(providerId: string): Promise<string[]> {
    const adapter = await this.getAdapter(providerId);
    return adapter.getWhitelistIPs();
  }

  /**
   * 添加白名单IP
   */
  async addWhitelistIP(providerId: string, ip: string): Promise<boolean> {
    const adapter = await this.getAdapter(providerId);
    return adapter.addWhitelistIP(ip);
  }

  /**
   * 删除白名单IP
   */
  async removeWhitelistIP(providerId: string, ip: string): Promise<boolean> {
    const adapter = await this.getAdapter(providerId);
    return adapter.removeWhitelistIP(ip);
  }

  /**
   * 获取认证账户列表
   */
  async getAccounts(
    providerId: string,
    page: number,
    limit: number,
  ): Promise<IPIDEAAccountListDto> {
    const adapter = await this.getAdapter(providerId);

    // 获取配置以调用 API
    const provider = await this.providerRepo.findOne({ where: { id: providerId } });
    if (!provider) {
      throw new NotFoundException(`Provider with ID ${providerId} not found`);
    }

    const config = this.configService.decryptConfig(provider.config);

    // 调用 IPIDEA API 获取账户列表
    const response = await (adapter as any).httpClient.post('/api/open/proxy_account_list', {
      appkey: config.apiKey,
      page,
      limit,
    });

    if (response.data.ret !== 0) {
      this.logger.error(`Failed to get accounts: ${response.data.msg}`);
      return {
        accounts: [],
        total: 0,
        page,
        limit,
      };
    }

    const accountsData = response.data.ret_data?.list || [];
    const total = response.data.ret_data?.total || 0;

    const accounts: IPIDEAAccountDto[] = accountsData.map((account: any) => ({
      id: account.id || account.account,
      account: account.account,
      password: this.maskPassword(account.password),
      flowLimit: account.flow_limit,
      flowUsed: account.flow_used,
      flowRemaining: account.flow_limit - account.flow_used,
      region: account.region,
      status: account.status,
      createdAt: account.create_time ? new Date(account.create_time * 1000) : new Date(),
    }));

    return {
      accounts,
      total,
      page,
      limit,
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
   * 获取并初始化 IPIDEA Adapter
   */
  private async getAdapter(providerId: string): Promise<IPIDEAAdapter> {
    const provider = await this.providerRepo.findOne({ where: { id: providerId } });

    if (!provider) {
      throw new NotFoundException(`Provider with ID ${providerId} not found`);
    }

    if (provider.type !== 'ipidea') {
      throw new NotFoundException(
        `Provider ${provider.name} is not an IPIDEA provider (type: ${provider.type})`,
      );
    }

    // 解密配置
    const config = this.configService.decryptConfig(provider.config);

    // 创建并初始化 Adapter
    const adapter = new IPIDEAAdapter();
    await adapter.initialize({
      name: provider.name,
      apiKey: config.apiKey,
      username: config.username,
      password: config.password,
      apiUrl: config.apiUrl || 'https://api.ipidea.net',
      costPerGB: Number(provider.costPerGB),
      extra: {
        gateway: config.gateway,
        port: config.port || 2336,
      },
    });

    return adapter;
  }

  /**
   * 密码脱敏
   */
  private maskPassword(password: string): string {
    if (!password || password.length <= 4) {
      return '****';
    }
    const visibleChars = 2;
    const start = password.substring(0, visibleChars);
    const end = password.substring(password.length - visibleChars);
    const masked = '*'.repeat(password.length - visibleChars * 2);
    return `${start}${masked}${end}`;
  }
}
