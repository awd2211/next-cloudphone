import { Injectable, Logger } from '@nestjs/common';
import { ProxyInfo } from '../../common/interfaces';

/**
 * 代理信息解析结果
 */
export interface ProxyParsedInfo {
  /** 代理类型 */
  proxyType: 'residential' | 'datacenter' | 'mobile' | 'isp' | 'unknown';
  /** 国家代码 */
  country?: string;
  /** 国家名称 */
  countryName?: string;
  /** 城市 */
  city?: string;
  /** 州/省 */
  state?: string;
  /** 供应商名称 */
  provider: string;
  /** 会话类型 */
  sessionType?: 'rotating' | 'sticky';
  /** 解析来源 */
  source: 'url' | 'config' | 'metadata';
}

/**
 * 国家代码到名称的映射
 */
const COUNTRY_NAMES: Record<string, string> = {
  US: 'United States',
  GB: 'United Kingdom',
  UK: 'United Kingdom',
  DE: 'Germany',
  FR: 'France',
  CA: 'Canada',
  AU: 'Australia',
  JP: 'Japan',
  KR: 'South Korea',
  SG: 'Singapore',
  HK: 'Hong Kong',
  TW: 'Taiwan',
  BR: 'Brazil',
  IN: 'India',
  RU: 'Russia',
  MX: 'Mexico',
  IT: 'Italy',
  ES: 'Spain',
  NL: 'Netherlands',
  PL: 'Poland',
  TH: 'Thailand',
  VN: 'Vietnam',
  PH: 'Philippines',
  ID: 'Indonesia',
  MY: 'Malaysia',
  CN: 'China',
  AR: 'Argentina',
  CL: 'Chile',
  CO: 'Colombia',
  ZA: 'South Africa',
  AE: 'United Arab Emirates',
  SA: 'Saudi Arabia',
  TR: 'Turkey',
  SE: 'Sweden',
  NO: 'Norway',
  DK: 'Denmark',
  FI: 'Finland',
  AT: 'Austria',
  CH: 'Switzerland',
  BE: 'Belgium',
  PT: 'Portugal',
  GR: 'Greece',
  CZ: 'Czech Republic',
  RO: 'Romania',
  HU: 'Hungary',
  NZ: 'New Zealand',
  IE: 'Ireland',
  IL: 'Israel',
};

/**
 * 供应商代理类型映射
 * 根据供应商的主要业务类型设置默认代理类型
 */
const PROVIDER_DEFAULT_TYPE: Record<string, ProxyParsedInfo['proxyType']> = {
  kookeey: 'residential',  // Kookeey 主要提供家宽代理
  ipidea: 'residential',   // IPIDEA 默认为住宅代理
  oxylabs: 'residential',
  brightdata: 'residential',
  smartproxy: 'residential',
  iproyal: 'residential',
  // 数据中心代理供应商
  storm: 'datacenter',
  // 移动代理供应商
  '911': 'mobile',
};

/**
 * 代理信息解析服务
 *
 * 功能：
 * 1. 从代理URL中解析位置信息（国家、城市、州）
 * 2. 从供应商配置解析代理类型（住宅、数据中心、移动）
 * 3. 从元数据获取额外信息
 *
 * 注意：此服务不进行网络检测，仅解析配置信息
 */
@Injectable()
export class ProxyIpDetectionService {
  private readonly logger = new Logger(ProxyIpDetectionService.name);

  /**
   * 解析代理信息
   * 从代理的URL、配置和元数据中提取位置和类型信息
   *
   * @param proxy - 代理信息
   * @returns 解析后的代理信息
   */
  parseProxyInfo(proxy: ProxyInfo): ProxyParsedInfo {
    const provider = proxy.provider.toLowerCase();

    // 根据供应商类型选择解析方法
    switch (provider) {
      case 'kookeey':
        return this.parseKookeeyProxy(proxy);
      case 'ipidea':
        return this.parseIpideaProxy(proxy);
      default:
        return this.parseGenericProxy(proxy);
    }
  }

  /**
   * 解析 Kookeey 代理信息
   *
   * Kookeey 用户名格式: accountId-username-{country}-sessionId-duration
   * 示例: acc123-user1-US-abc12345-5m
   */
  private parseKookeeyProxy(proxy: ProxyInfo): ProxyParsedInfo {
    const result: ProxyParsedInfo = {
      proxyType: 'residential', // Kookeey 固定为住宅代理
      provider: 'kookeey',
      source: 'url',
    };

    // 尝试从用户名解析国家代码
    if (proxy.username) {
      const parts = proxy.username.split('-');

      // Kookeey 格式: accountId-username-{country}-sessionId-duration
      // 国家代码通常在第3个位置（索引2），是2个大写字母
      for (const part of parts) {
        const upperPart = part.toUpperCase();
        // 检查是否是有效的国家代码（2个大写字母且在我们的映射中）
        if (
          part.length === 2 &&
          /^[A-Z]{2}$/.test(upperPart) &&
          COUNTRY_NAMES[upperPart]
        ) {
          result.country = upperPart;
          result.countryName = COUNTRY_NAMES[upperPart];
          break;
        }
      }
    }

    // 如果URL中没有解析到，尝试从 location 字段获取
    if (!result.country && proxy.location?.country) {
      result.country = proxy.location.country.toUpperCase();
      result.countryName = COUNTRY_NAMES[result.country] || result.country;
      result.source = 'config';
    }

    // 城市信息从 location 获取
    if (proxy.location?.city) {
      result.city = proxy.location.city;
    }

    // 从元数据获取额外信息
    if (proxy.metadata) {
      if (proxy.metadata.proxyType) {
        result.proxyType = proxy.metadata.proxyType;
      }
      if (proxy.metadata.sessionType) {
        result.sessionType = proxy.metadata.sessionType;
      }
    }

    return result;
  }

  /**
   * 解析 IPIDEA 代理信息
   *
   * IPIDEA 用户名格式: account-zone-custom-region-{country}-st-{state}-city-{city}-session-{id}-sessTime-{minutes}
   * 示例: user1-zone-custom-region-us-city-newyork-session-abc123-sessTime-30
   */
  private parseIpideaProxy(proxy: ProxyInfo): ProxyParsedInfo {
    const result: ProxyParsedInfo = {
      proxyType: 'residential', // IPIDEA 默认为住宅代理
      provider: 'ipidea',
      source: 'url',
    };

    if (proxy.username) {
      const username = proxy.username.toLowerCase();

      // 解析国家/地区: -region-{country}
      const regionMatch = username.match(/-region-([a-z]{2})/);
      if (regionMatch) {
        result.country = regionMatch[1].toUpperCase();
        result.countryName = COUNTRY_NAMES[result.country] || result.country;
      }

      // 解析州/省: -st-{state}
      const stateMatch = username.match(/-st-([a-z]+)/);
      if (stateMatch) {
        result.state = stateMatch[1];
      }

      // 解析城市: -city-{city}
      const cityMatch = username.match(/-city-([a-z]+)/);
      if (cityMatch) {
        result.city = cityMatch[1];
      }

      // 检查是否有会话参数（粘性会话）
      if (username.includes('-session-') || username.includes('-sesstime-')) {
        result.sessionType = 'sticky';
      } else {
        result.sessionType = 'rotating';
      }
    }

    // 如果URL中没有解析到，尝试从 location 字段获取
    if (!result.country && proxy.location?.country) {
      result.country = proxy.location.country.toUpperCase();
      result.countryName = COUNTRY_NAMES[result.country] || result.country;
      result.source = 'config';
    }

    if (!result.city && proxy.location?.city) {
      result.city = proxy.location.city;
    }

    if (!result.state && proxy.location?.state) {
      result.state = proxy.location.state;
    }

    // 从元数据获取代理类型（如果配置了）
    if (proxy.metadata?.proxyType) {
      result.proxyType = proxy.metadata.proxyType;
      result.source = 'metadata';
    }

    // 从 ispType 字段获取（如果有）
    if (proxy.ispType) {
      result.proxyType = this.normalizeProxyType(proxy.ispType);
    }

    return result;
  }

  /**
   * 通用代理信息解析
   * 用于其他供应商或未知格式的代理
   */
  private parseGenericProxy(proxy: ProxyInfo): ProxyParsedInfo {
    const provider = proxy.provider.toLowerCase();

    const result: ProxyParsedInfo = {
      proxyType: PROVIDER_DEFAULT_TYPE[provider] || 'unknown',
      provider: proxy.provider,
      source: 'config',
    };

    // 从 location 字段获取位置信息
    if (proxy.location?.country) {
      result.country = proxy.location.country.toUpperCase();
      result.countryName = COUNTRY_NAMES[result.country] || result.country;
    }

    if (proxy.location?.city) {
      result.city = proxy.location.city;
    }

    if (proxy.location?.state) {
      result.state = proxy.location.state;
    }

    // 从 ispType 获取代理类型
    if (proxy.ispType) {
      result.proxyType = this.normalizeProxyType(proxy.ispType);
    }

    // 从元数据获取额外信息
    if (proxy.metadata) {
      if (proxy.metadata.proxyType) {
        result.proxyType = this.normalizeProxyType(proxy.metadata.proxyType);
      }
      if (proxy.metadata.country) {
        result.country = proxy.metadata.country.toUpperCase();
        result.countryName = COUNTRY_NAMES[result.country] || result.country;
      }
    }

    return result;
  }

  /**
   * 标准化代理类型
   */
  private normalizeProxyType(type: string): ProxyParsedInfo['proxyType'] {
    const normalized = type.toLowerCase();

    if (normalized.includes('residential') || normalized.includes('家宽') || normalized.includes('住宅')) {
      return 'residential';
    }
    if (normalized.includes('datacenter') || normalized.includes('dc') || normalized.includes('数据中心')) {
      return 'datacenter';
    }
    if (normalized.includes('mobile') || normalized.includes('4g') || normalized.includes('5g') || normalized.includes('移动')) {
      return 'mobile';
    }
    if (normalized.includes('isp') || normalized.includes('static')) {
      return 'isp';
    }

    return 'unknown';
  }

  /**
   * 批量解析代理信息
   *
   * @param proxies - 代理列表
   * @returns 解析结果 Map
   */
  parseProxyInfoBatch(proxies: ProxyInfo[]): Map<string, ProxyParsedInfo> {
    const results = new Map<string, ProxyParsedInfo>();

    for (const proxy of proxies) {
      try {
        const info = this.parseProxyInfo(proxy);
        results.set(proxy.id, info);
      } catch (error) {
        this.logger.warn(`Failed to parse proxy ${proxy.id}: ${error.message}`);
        results.set(proxy.id, {
          proxyType: 'unknown',
          provider: proxy.provider,
          source: 'config',
        });
      }
    }

    this.logger.log(`Parsed ${results.size} proxies`);
    return results;
  }

  /**
   * 更新代理的解析信息到 ProxyInfo 对象
   *
   * @param proxy - 代理信息（会被修改）
   * @returns 是否更新成功
   */
  updateProxyParsedInfo(proxy: ProxyInfo): boolean {
    try {
      const parsed = this.parseProxyInfo(proxy);

      // 更新位置信息
      if (parsed.country) {
        proxy.country = parsed.country;
        proxy.exitCountry = parsed.country;
        proxy.exitCountryName = parsed.countryName;
      }
      if (parsed.city) {
        proxy.city = parsed.city;
        proxy.exitCity = parsed.city;
      }

      // 更新代理类型
      proxy.ispType = parsed.proxyType;

      // 记录解析时间
      proxy.ipCheckedAt = new Date();

      this.logger.debug(
        `Updated proxy ${proxy.id}: type=${parsed.proxyType}, country=${parsed.country}, city=${parsed.city}`,
      );

      return true;
    } catch (error) {
      this.logger.warn(`Failed to update proxy ${proxy.id}: ${error.message}`);
      return false;
    }
  }

  /**
   * 获取代理类型的显示名称
   */
  getProxyTypeDisplayName(type: ProxyParsedInfo['proxyType']): string {
    const names: Record<ProxyParsedInfo['proxyType'], string> = {
      residential: '住宅代理',
      datacenter: '数据中心',
      mobile: '移动代理',
      isp: 'ISP代理',
      unknown: '未知',
    };
    return names[type] || '未知';
  }

  /**
   * 获取国家名称
   */
  getCountryName(countryCode: string): string {
    return COUNTRY_NAMES[countryCode.toUpperCase()] || countryCode;
  }
}
