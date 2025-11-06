import { Injectable, Logger, Inject } from '@nestjs/common';
import { ProxyService } from '../proxy/proxy.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import {
  SearchQueryDto,
  AutocompleteQueryDto,
  SearchHistoryQueryDto,
  SearchScope,
} from './dto/search-query.dto';
import {
  SearchResultDto,
  SearchResultItem,
  ResultType,
  AutocompleteResultDto,
  AutocompleteSuggestion,
  SearchHistoryDto,
  SearchHistoryItem,
  TrendingSearchDto,
  TrendingSearchItem,
} from './dto/search-result.dto';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);
  private readonly SEARCH_HISTORY_PREFIX = 'search:history:';
  private readonly SEARCH_TRENDING_KEY = 'search:trending';
  private readonly SEARCH_COUNT_PREFIX = 'search:count:';
  private readonly HISTORY_TTL = 7 * 24 * 60 * 60; // 7天
  private readonly TRENDING_TTL = 60 * 60; // 1小时

  constructor(
    private readonly proxyService: ProxyService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache
  ) {}

  /**
   * 全局搜索 - 聚合多个服务的搜索结果
   */
  async globalSearch(query: SearchQueryDto, userId: string): Promise<SearchResultDto> {
    const startTime = Date.now();
    this.logger.log(`Global search: keyword="${query.keyword}", scope=${query.scope}, user=${userId}`);

    // 记录搜索历史
    this.recordSearchHistory(userId, query.keyword, query.scope || SearchScope.ALL);

    // 增加搜索计数（用于热门搜索）
    this.incrementSearchCount(query.keyword);

    // 根据搜索范围调用不同服务
    const results: SearchResultItem[] = [];
    const stats: Record<string, number> = {};

    try {
      if (query.scope === SearchScope.ALL || query.scope === SearchScope.DEVICES) {
        const deviceResults = await this.searchDevices(query);
        results.push(...deviceResults);
        stats.devices = deviceResults.length;
      }

      if (query.scope === SearchScope.ALL || query.scope === SearchScope.USERS) {
        const userResults = await this.searchUsers(query);
        results.push(...userResults);
        stats.users = userResults.length;
      }

      if (query.scope === SearchScope.ALL || query.scope === SearchScope.APPS) {
        const appResults = await this.searchApps(query);
        results.push(...appResults);
        stats.apps = appResults.length;
      }

      if (query.scope === SearchScope.ALL || query.scope === SearchScope.TEMPLATES) {
        const templateResults = await this.searchTemplates(query);
        results.push(...templateResults);
        stats.templates = templateResults.length;
      }

      if (query.scope === SearchScope.ALL || query.scope === SearchScope.TICKETS) {
        const ticketResults = await this.searchTickets(query);
        results.push(...ticketResults);
        stats.tickets = ticketResults.length;
      }

      if (query.scope === SearchScope.ALL || query.scope === SearchScope.ORDERS) {
        const orderResults = await this.searchOrders(query);
        results.push(...orderResults);
        stats.orders = orderResults.length;
      }

      // 按相关性得分排序
      results.sort((a, b) => b.score - a.score);

      // 分页
      const page = query.page || 1;
      const pageSize = query.pageSize || 20;
      const offset = (page - 1) * pageSize;
      const paginatedResults = results.slice(offset, offset + pageSize);

      const searchTime = Date.now() - startTime;
      this.logger.log(
        `Search completed: ${results.length} results in ${searchTime}ms (${Object.entries(stats).map(([k, v]) => `${k}:${v}`).join(', ')})`
      );

      return {
        total: results.length,
        page,
        pageSize,
        totalPages: Math.ceil(results.length / pageSize),
        keyword: query.keyword,
        scope: query.scope || SearchScope.ALL,
        items: paginatedResults,
        stats,
        searchTime,
      };
    } catch (error) {
      this.logger.error(`Search error: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 搜索设备
   */
  private async searchDevices(query: SearchQueryDto): Promise<SearchResultItem[]> {
    try {
      const response = await this.proxyService.proxyRequestAsync(
        'devices',
        '/devices',
        'GET',
        null,
        null,
        {
          search: query.keyword,
          page: 1,
          pageSize: 50, // 每个服务最多返回50条
        }
      );

      if (!response?.items) return [];

      return response.items.map((device: any) => ({
        type: ResultType.DEVICE,
        id: device.id,
        title: device.name || device.id,
        description: `${device.model || 'Unknown'} - ${device.status || 'unknown'}`,
        metadata: {
          status: device.status,
          provider: device.provider,
          region: device.region,
        },
        score: this.calculateRelevanceScore(query.keyword, device.name || device.id),
        createdAt: device.createdAt,
      }));
    } catch (error) {
      this.logger.warn(`Failed to search devices: ${error.message}`);
      return [];
    }
  }

  /**
   * 搜索用户
   */
  private async searchUsers(query: SearchQueryDto): Promise<SearchResultItem[]> {
    try {
      const response = await this.proxyService.proxyRequestAsync(
        'users',
        '/users',
        'GET',
        null,
        null,
        {
          search: query.keyword,
          page: 1,
          pageSize: 50,
        }
      );

      if (!response?.items) return [];

      return response.items.map((user: any) => ({
        type: ResultType.USER,
        id: user.id,
        title: user.username || user.email,
        description: `${user.email} - ${user.role || 'user'}`,
        metadata: {
          email: user.email,
          role: user.role,
          status: user.status,
        },
        score: this.calculateRelevanceScore(query.keyword, user.username || user.email),
        createdAt: user.createdAt,
      }));
    } catch (error) {
      this.logger.warn(`Failed to search users: ${error.message}`);
      return [];
    }
  }

  /**
   * 搜索应用
   */
  private async searchApps(query: SearchQueryDto): Promise<SearchResultItem[]> {
    try {
      const response = await this.proxyService.proxyRequestAsync(
        'apps',
        '/apps',
        'GET',
        null,
        null,
        {
          search: query.keyword,
          page: 1,
          pageSize: 50,
        }
      );

      if (!response?.items) return [];

      return response.items.map((app: any) => ({
        type: ResultType.APP,
        id: app.id,
        title: app.name,
        description: `${app.packageName} v${app.version}`,
        metadata: {
          packageName: app.packageName,
          version: app.version,
          category: app.category,
        },
        score: this.calculateRelevanceScore(query.keyword, app.name),
        createdAt: app.createdAt,
      }));
    } catch (error) {
      this.logger.warn(`Failed to search apps: ${error.message}`);
      return [];
    }
  }

  /**
   * 搜索模板
   */
  private async searchTemplates(query: SearchQueryDto): Promise<SearchResultItem[]> {
    try {
      const response = await this.proxyService.proxyRequestAsync(
        'devices',
        '/templates',
        'GET',
        null,
        null,
        {
          search: query.keyword,
          page: 1,
          pageSize: 50,
        }
      );

      if (!response?.items) return [];

      return response.items.map((template: any) => ({
        type: ResultType.TEMPLATE,
        id: template.id,
        title: template.name,
        description: template.description || '',
        metadata: {
          type: template.type,
          isPublic: template.isPublic,
        },
        score: this.calculateRelevanceScore(query.keyword, template.name),
        createdAt: template.createdAt,
      }));
    } catch (error) {
      this.logger.warn(`Failed to search templates: ${error.message}`);
      return [];
    }
  }

  /**
   * 搜索工单
   */
  private async searchTickets(query: SearchQueryDto): Promise<SearchResultItem[]> {
    try {
      const response = await this.proxyService.proxyRequestAsync(
        'users',
        '/tickets',
        'GET',
        null,
        null,
        {
          search: query.keyword,
          page: 1,
          pageSize: 50,
        }
      );

      if (!response?.items) return [];

      return response.items.map((ticket: any) => ({
        type: ResultType.TICKET,
        id: ticket.id,
        title: ticket.title,
        description: ticket.description || '',
        metadata: {
          status: ticket.status,
          priority: ticket.priority,
          category: ticket.category,
        },
        score: this.calculateRelevanceScore(query.keyword, ticket.title),
        createdAt: ticket.createdAt,
      }));
    } catch (error) {
      this.logger.warn(`Failed to search tickets: ${error.message}`);
      return [];
    }
  }

  /**
   * 搜索订单
   */
  private async searchOrders(query: SearchQueryDto): Promise<SearchResultItem[]> {
    try {
      const response = await this.proxyService.proxyRequestAsync(
        'billing',
        '/orders',
        'GET',
        null,
        null,
        {
          search: query.keyword,
          page: 1,
          pageSize: 50,
        }
      );

      if (!response?.items) return [];

      return response.items.map((order: any) => ({
        type: ResultType.ORDER,
        id: order.id,
        title: `Order ${order.orderNumber || order.id}`,
        description: `${order.planName || 'N/A'} - ${order.totalAmount || 0} ${order.currency || 'USD'}`,
        metadata: {
          status: order.status,
          totalAmount: order.totalAmount,
          currency: order.currency,
        },
        score: this.calculateRelevanceScore(query.keyword, order.orderNumber || order.id),
        createdAt: order.createdAt,
      }));
    } catch (error) {
      this.logger.warn(`Failed to search orders: ${error.message}`);
      return [];
    }
  }

  /**
   * 自动补全建议
   */
  async autocomplete(query: AutocompleteQueryDto, userId: string): Promise<AutocompleteResultDto> {
    this.logger.log(`Autocomplete: prefix="${query.prefix}", scope=${query.scope}, user=${userId}`);

    const suggestions: AutocompleteSuggestion[] = [];

    try {
      // 从搜索历史中获取匹配的建议
      const historySuggestions = await this.getHistorySuggestions(userId, query.prefix);
      suggestions.push(...historySuggestions);

      // 从热门搜索中获取匹配的建议
      const trendingSuggestions = await this.getTrendingSuggestions(query.prefix);
      suggestions.push(...trendingSuggestions);

      // 去重并按得分排序
      const uniqueSuggestions = this.deduplicateSuggestions(suggestions);
      uniqueSuggestions.sort((a, b) => b.score - a.score);

      return {
        prefix: query.prefix,
        suggestions: uniqueSuggestions.slice(0, query.limit),
        total: uniqueSuggestions.length,
      };
    } catch (error) {
      this.logger.error(`Autocomplete error: ${error.message}`, error.stack);
      return {
        prefix: query.prefix,
        suggestions: [],
        total: 0,
      };
    }
  }

  /**
   * 获取搜索历史
   */
  async getSearchHistory(query: SearchHistoryQueryDto, userId: string): Promise<SearchHistoryDto> {
    try {
      const historyKey = `${this.SEARCH_HISTORY_PREFIX}${userId}`;
      const history: SearchHistoryItem[] = (await this.cacheManager.get(historyKey)) || [];

      return {
        history: history.slice(0, query.limit),
        total: history.length,
      };
    } catch (error) {
      this.logger.error(`Failed to get search history: ${error.message}`, error.stack);
      return {
        history: [],
        total: 0,
      };
    }
  }

  /**
   * 获取热门搜索
   */
  async getTrendingSearches(): Promise<TrendingSearchDto> {
    try {
      const trending: TrendingSearchItem[] = (await this.cacheManager.get(this.SEARCH_TRENDING_KEY)) || [];

      return {
        trending: trending.slice(0, 10), // 返回前10个
        timeRange: '24h',
        updatedAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Failed to get trending searches: ${error.message}`, error.stack);
      return {
        trending: [],
        timeRange: '24h',
        updatedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * 记录搜索历史
   */
  private async recordSearchHistory(userId: string, keyword: string, scope: string): Promise<void> {
    try {
      const historyKey = `${this.SEARCH_HISTORY_PREFIX}${userId}`;
      const history: SearchHistoryItem[] = (await this.cacheManager.get(historyKey)) || [];

      // 添加新记录到开头
      history.unshift({
        keyword,
        scope,
        timestamp: new Date().toISOString(),
        resultCount: 0, // 将在搜索完成后更新
      });

      // 保持最多50条历史记录
      if (history.length > 50) {
        history.pop();
      }

      await this.cacheManager.set(historyKey, history, this.HISTORY_TTL);
    } catch (error) {
      this.logger.error(`Failed to record search history: ${error.message}`);
    }
  }

  /**
   * 增加搜索计数（用于热门搜索）
   */
  private async incrementSearchCount(keyword: string): Promise<void> {
    try {
      const countKey = `${this.SEARCH_COUNT_PREFIX}${keyword.toLowerCase()}`;
      const count: number = (await this.cacheManager.get(countKey)) || 0;
      await this.cacheManager.set(countKey, count + 1, this.TRENDING_TTL);

      // 更新热门搜索排行
      await this.updateTrendingSearches(keyword, count + 1);
    } catch (error) {
      this.logger.error(`Failed to increment search count: ${error.message}`);
    }
  }

  /**
   * 更新热门搜索排行
   */
  private async updateTrendingSearches(keyword: string, count: number): Promise<void> {
    try {
      const trending: TrendingSearchItem[] = (await this.cacheManager.get(this.SEARCH_TRENDING_KEY)) || [];

      const existingIndex = trending.findIndex((item) => item.keyword === keyword);

      if (existingIndex >= 0) {
        // 更新现有关键词的计数
        trending[existingIndex].count = count;
      } else {
        // 添加新关键词
        trending.push({
          keyword,
          count,
          trend: 0, // 趋势计算需要历史数据
        });
      }

      // 按计数降序排序
      trending.sort((a, b) => b.count - a.count);

      // 保持前50个
      const topTrending = trending.slice(0, 50);

      await this.cacheManager.set(this.SEARCH_TRENDING_KEY, topTrending, this.TRENDING_TTL);
    } catch (error) {
      this.logger.error(`Failed to update trending searches: ${error.message}`);
    }
  }

  /**
   * 从搜索历史获取建议
   */
  private async getHistorySuggestions(userId: string, prefix: string): Promise<AutocompleteSuggestion[]> {
    try {
      const historyKey = `${this.SEARCH_HISTORY_PREFIX}${userId}`;
      const history: SearchHistoryItem[] = (await this.cacheManager.get(historyKey)) || [];

      return history
        .filter((item) => item.keyword.toLowerCase().startsWith(prefix.toLowerCase()))
        .map((item) => ({
          text: item.keyword,
          type: this.scopeToResultType(item.scope),
          score: 0.8, // 历史记录得分稍低
        }));
    } catch (error) {
      this.logger.error(`Failed to get history suggestions: ${error.message}`);
      return [];
    }
  }

  /**
   * 从热门搜索获取建议
   */
  private async getTrendingSuggestions(prefix: string): Promise<AutocompleteSuggestion[]> {
    try {
      const trending: TrendingSearchItem[] = (await this.cacheManager.get(this.SEARCH_TRENDING_KEY)) || [];

      return trending
        .filter((item) => item.keyword.toLowerCase().startsWith(prefix.toLowerCase()))
        .map((item) => ({
          text: item.keyword,
          type: ResultType.DEVICE, // 默认类型
          score: 0.9 + Math.min(item.count / 1000, 0.1), // 热门搜索得分更高
        }));
    } catch (error) {
      this.logger.error(`Failed to get trending suggestions: ${error.message}`);
      return [];
    }
  }

  /**
   * 去重建议
   */
  private deduplicateSuggestions(suggestions: AutocompleteSuggestion[]): AutocompleteSuggestion[] {
    const seen = new Set<string>();
    const unique: AutocompleteSuggestion[] = [];

    for (const suggestion of suggestions) {
      const key = suggestion.text.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(suggestion);
      }
    }

    return unique;
  }

  /**
   * 计算相关性得分（简单的字符串匹配）
   */
  private calculateRelevanceScore(keyword: string, text: string): number {
    const lowerKeyword = keyword.toLowerCase();
    const lowerText = text.toLowerCase();

    // 完全匹配
    if (lowerText === lowerKeyword) return 1.0;

    // 开头匹配
    if (lowerText.startsWith(lowerKeyword)) return 0.9;

    // 包含匹配
    if (lowerText.includes(lowerKeyword)) {
      const position = lowerText.indexOf(lowerKeyword);
      return 0.7 - position / lowerText.length * 0.2; // 越靠前得分越高
    }

    // 模糊匹配（包含所有字符）
    let score = 0;
    let lastIndex = 0;
    for (const char of lowerKeyword) {
      const index = lowerText.indexOf(char, lastIndex);
      if (index >= 0) {
        score += 0.5 / lowerKeyword.length;
        lastIndex = index + 1;
      }
    }

    return score;
  }

  /**
   * 转换搜索范围到结果类型
   */
  private scopeToResultType(scope: string): ResultType {
    const mapping: Record<string, ResultType> = {
      users: ResultType.USER,
      devices: ResultType.DEVICE,
      apps: ResultType.APP,
      templates: ResultType.TEMPLATE,
      tickets: ResultType.TICKET,
      notifications: ResultType.NOTIFICATION,
      orders: ResultType.ORDER,
    };
    return mapping[scope] || ResultType.DEVICE;
  }
}
