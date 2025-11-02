import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpClientService, ProxyClientService } from '@cloudphone/shared';

export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
  decimals: number;
}

export interface ExchangeRates {
  base: string;
  rates: Record<string, number>;
  timestamp: number;
}

@Injectable()
export class CurrencyService {
  private readonly logger = new Logger(CurrencyService.name);
  private readonly CACHE_TTL = 3600; // 1小时缓存
  private exchangeRates: ExchangeRates | null = null;
  private lastFetchTime = 0;

  // 支持的货币列表
  private readonly SUPPORTED_CURRENCIES: Record<string, CurrencyInfo> = {
    USD: { code: 'USD', symbol: '$', name: 'US Dollar', decimals: 2 },
    EUR: { code: 'EUR', symbol: '€', name: 'Euro', decimals: 2 },
    GBP: { code: 'GBP', symbol: '£', name: 'British Pound', decimals: 2 },
    JPY: { code: 'JPY', symbol: '¥', name: 'Japanese Yen', decimals: 0 },
    CNY: { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', decimals: 2 },
    AUD: { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', decimals: 2 },
    CAD: { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', decimals: 2 },
    CHF: { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc', decimals: 2 },
    HKD: { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar', decimals: 2 },
    SGD: { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', decimals: 2 },
    INR: { code: 'INR', symbol: '₹', name: 'Indian Rupee', decimals: 2 },
    KRW: { code: 'KRW', symbol: '₩', name: 'South Korean Won', decimals: 0 },
  };

  constructor(
    private configService: ConfigService,
    private readonly httpClient: HttpClientService,
    private readonly proxyClient: ProxyClientService // ✅ 注入代理客户端
  ) {}

  /**
   * 获取支持的货币列表
   */
  getSupportedCurrencies(): CurrencyInfo[] {
    return Object.values(this.SUPPORTED_CURRENCIES);
  }

  /**
   * 获取货币信息
   */
  getCurrencyInfo(code: string): CurrencyInfo | null {
    return this.SUPPORTED_CURRENCIES[code.toUpperCase()] || null;
  }

  /**
   * 检查货币是否支持
   */
  isCurrencySupported(code: string): boolean {
    return !!this.SUPPORTED_CURRENCIES[code.toUpperCase()];
  }

  /**
   * 获取最新汇率
   */
  async getExchangeRates(baseCurrency = 'USD'): Promise<ExchangeRates> {
    const now = Date.now();

    // 检查缓存
    if (
      this.exchangeRates &&
      this.exchangeRates.base === baseCurrency &&
      now - this.lastFetchTime < this.CACHE_TTL * 1000
    ) {
      this.logger.debug('Using cached exchange rates');
      return this.exchangeRates;
    }

    // 获取新汇率（使用代理绕过 IP 限流）
    try {
      const apiKey = this.configService.get('EXCHANGE_RATE_API_KEY');
      const apiUrl = apiKey
        ? `https://v6.exchangerate-api.com/v6/${apiKey}/latest/${baseCurrency}`
        : `https://open.er-api.com/v6/latest/${baseCurrency}`;

      this.logger.log(`Fetching exchange rates from ${apiUrl.replace(apiKey || '', '***')}`);

      // ✅ 使用代理获取汇率（如果启用）
      let response: { rates: Record<string, number> };

      if (this.proxyClient.isEnabled()) {
        this.logger.debug('Using proxy for exchange rate API');

        // 使用代理的便捷方法
        response = await this.proxyClient.withProxy(
          async (proxy) => {
            // 通过代理发送请求
            const axios = require('axios');
            const result = await axios.get(apiUrl, {
              proxy: {
                host: proxy.host,
                port: proxy.port,
                auth: proxy.username && proxy.password
                  ? { username: proxy.username, password: proxy.password }
                  : undefined,
              },
              timeout: 10000,
            });

            return result.data;
          },
          {
            // 代理筛选条件
            criteria: {
              country: 'US', // 使用美国代理（汇率 API 通常在美国）
              minQuality: 75, // 中等质量即可
              maxLatency: 800, // 最大延迟 800ms
            },
            validate: true, // 验证代理可用性
          }
        );
      } else {
        // 不使用代理的原有逻辑
        response = await this.httpClient.get<{ rates: Record<string, number> }>(
          apiUrl,
          {},
          {
            timeout: 10000,
            retries: 3,
            circuitBreaker: true,
          }
        );
      }

      if (response && response.rates) {
        this.exchangeRates = {
          base: baseCurrency,
          rates: response.rates,
          timestamp: now,
        };
        this.lastFetchTime = now;
        this.logger.log(
          `Exchange rates updated successfully${this.proxyClient.isEnabled() ? ' (via proxy)' : ''}`
        );
        return this.exchangeRates;
      }
    } catch (error) {
      this.logger.error(`Failed to fetch exchange rates: ${error.message}`);

      // 如果缓存还有效（24小时内），继续使用
      if (this.exchangeRates && now - this.lastFetchTime < 86400 * 1000) {
        this.logger.warn('Using stale exchange rates cache');
        return this.exchangeRates;
      }

      // 使用默认汇率（仅用于开发）
      return this.getDefaultRates(baseCurrency);
    }

    return this.getDefaultRates(baseCurrency);
  }

  /**
   * 货币转换
   */
  async convert(amount: number, fromCurrency: string, toCurrency: string): Promise<number> {
    if (fromCurrency === toCurrency) {
      return amount;
    }

    const rates = await this.getExchangeRates(fromCurrency);
    const rate = rates.rates[toCurrency.toUpperCase()];

    if (!rate) {
      throw new Error(`Exchange rate not found for ${toCurrency}`);
    }

    const converted = amount * rate;
    const toCurrencyInfo = this.getCurrencyInfo(toCurrency);
    const decimals = toCurrencyInfo?.decimals ?? 2;

    return Math.round(converted * Math.pow(10, decimals)) / Math.pow(10, decimals);
  }

  /**
   * 格式化货币金额
   */
  format(amount: number, currency: string, locale = 'en-US'): string {
    const currencyInfo = this.getCurrencyInfo(currency);

    if (!currencyInfo) {
      return `${amount} ${currency}`;
    }

    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency.toUpperCase(),
        minimumFractionDigits: currencyInfo.decimals,
        maximumFractionDigits: currencyInfo.decimals,
      }).format(amount);
    } catch (error) {
      // 降级处理
      return `${currencyInfo.symbol}${amount.toFixed(currencyInfo.decimals)}`;
    }
  }

  /**
   * 转换为最小单位（如美元转分）
   */
  toSmallestUnit(amount: number, currency: string): number {
    const currencyInfo = this.getCurrencyInfo(currency);
    const decimals = currencyInfo?.decimals ?? 2;
    return Math.round(amount * Math.pow(10, decimals));
  }

  /**
   * 从最小单位转换（如分转美元）
   */
  fromSmallestUnit(amount: number, currency: string): number {
    const currencyInfo = this.getCurrencyInfo(currency);
    const decimals = currencyInfo?.decimals ?? 2;
    return amount / Math.pow(10, decimals);
  }

  /**
   * 获取默认汇率（开发模式使用）
   */
  private getDefaultRates(baseCurrency: string): ExchangeRates {
    this.logger.warn('Using default exchange rates (development mode only)');

    // 相对于 USD 的汇率
    const usdRates: Record<string, number> = {
      USD: 1,
      EUR: 0.85,
      GBP: 0.73,
      JPY: 110,
      CNY: 6.45,
      AUD: 1.35,
      CAD: 1.25,
      CHF: 0.92,
      HKD: 7.8,
      SGD: 1.35,
      INR: 74,
      KRW: 1180,
    };

    if (baseCurrency === 'USD') {
      return {
        base: 'USD',
        rates: usdRates,
        timestamp: Date.now(),
      };
    }

    // 转换为其他基准货币
    const baseRate = usdRates[baseCurrency] || 1;
    const convertedRates: Record<string, number> = {};

    for (const [currency, rate] of Object.entries(usdRates)) {
      convertedRates[currency] = rate / baseRate;
    }

    return {
      base: baseCurrency,
      rates: convertedRates,
      timestamp: Date.now(),
    };
  }
}
