/**
 * useInfiniteApps - 应用列表无限滚动 Hook
 *
 * 使用游标分页实现高性能的应用市场列表无限加载
 * 适用于虚拟滚动场景，支持分类过滤
 *
 * @example
 * ```tsx
 * const { data, fetchNextPage, hasNextPage, isFetching } = useInfiniteApps({
 *   limit: 20,
 *   category: '游戏'
 * });
 *
 * // 展开所有页面的数据
 * const allApps = data?.pages.flatMap(page => page.data) ?? [];
 * ```
 */

import { useInfiniteQuery } from '@tanstack/react-query';
import { getAppsCursor } from '@/services/app';
import type { Application, CursorPaginationParams } from '@/types';

/**
 * 应用查询过滤参数
 */
export interface AppFilters {
  tenantId?: string;
  category?: string;
  limit?: number;
}

/**
 * useInfiniteApps Hook
 *
 * @param filters - 查询过滤条件
 * @param enabled - 是否启用查询 (默认: true)
 * @returns React Query infinite query result
 */
export function useInfiniteApps(filters?: AppFilters, enabled: boolean = true) {
  return useInfiniteQuery({
    // Query Key - 包含所有过滤条件用于缓存隔离
    queryKey: ['apps', 'infinite', filters],

    // Query Function - 使用游标分页API
    queryFn: async ({ pageParam }) => {
      const response = await getAppsCursor({
        cursor: pageParam as string | undefined,
        limit: filters?.limit || 20,
        tenantId: filters?.tenantId,
        category: filters?.category,
      });

      // response已被拦截器unwrapped，直接使用
      // response类型: CursorPaginatedResponse<Application>
      return {
        data: response.data || [],
        nextCursor: response.nextCursor,
        hasMore: response.hasMore,
        count: response.count,
      };
    },

    // 初始页面参数 (undefined = 第一页，无游标)
    initialPageParam: undefined,

    // 获取下一页参数 - 返回 nextCursor 或 undefined
    getNextPageParam: (lastPage) => {
      return lastPage.hasMore ? lastPage.nextCursor : undefined;
    },

    // 缓存配置
    staleTime: 60 * 1000, // 应用列表1分钟内数据视为新鲜（更新较少）
    gcTime: 10 * 60 * 1000, // 10分钟后垃圾回收

    // 启用/禁用查询
    enabled,

    // 重试配置
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

/**
 * 工具函数：展开所有页面数据为单一数组
 *
 * @param pages - Infinite Query 返回的pages数据
 * @returns 所有应用的扁平化数组
 *
 * @example
 * ```tsx
 * const { data } = useInfiniteApps();
 * const allApps = flattenApps(data?.pages);
 * ```
 */
export function flattenApps(pages?: Array<{ data: Application[] }>): Application[] {
  if (!pages) return [];
  return pages.flatMap((page) => page.data);
}

/**
 * 工具函数：计算已加载的总应用数
 *
 * @param pages - Infinite Query 返回的pages数据
 * @returns 已加载的应用总数
 *
 * @example
 * ```tsx
 * const { data } = useInfiniteApps();
 * const loadedCount = getTotalLoadedApps(data?.pages);
 * // 显示: "已加载 60 个应用"
 * ```
 */
export function getTotalLoadedApps(pages?: Array<{ data: Application[]; count: number }>): number {
  if (!pages) return 0;
  return pages.reduce((total, page) => total + page.count, 0);
}

/**
 * 工具函数：按分类分组应用
 *
 * @param apps - 应用数组
 * @returns 按分类分组的应用对象
 *
 * @example
 * ```tsx
 * const { data } = useInfiniteApps();
 * const allApps = flattenApps(data?.pages);
 * const groupedApps = groupAppsByCategory(allApps);
 * // { '游戏': [...], '工具': [...], ... }
 * ```
 */
export function groupAppsByCategory(apps: Application[]): Record<string, Application[]> {
  return apps.reduce(
    (groups, app) => {
      const category = app.category || '未分类';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(app);
      return groups;
    },
    {} as Record<string, Application[]>
  );
}
