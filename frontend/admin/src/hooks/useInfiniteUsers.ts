/**
 * useInfiniteUsers - 用户列表无限滚动 Hook
 *
 * 使用游标分页实现高性能的用户列表无限加载
 * 适用于虚拟滚动场景，支持角色信息关联查询
 *
 * @example
 * ```tsx
 * const { data, fetchNextPage, hasNextPage, isFetching } = useInfiniteUsers({
 *   limit: 20,
 *   includeRoles: true
 * });
 *
 * // 展开所有页面的数据
 * const allUsers = data?.pages.flatMap(page => page.data) ?? [];
 * ```
 */

import { useInfiniteQuery } from '@tanstack/react-query';
import { getUsersCursor } from '@/services/user';
import type { User, CursorPaginationParams } from '@/types';

/**
 * 用户查询过滤参数
 */
export interface UserFilters {
  tenantId?: string;
  includeRoles?: boolean;
  limit?: number;
}

/**
 * useInfiniteUsers Hook
 *
 * @param filters - 查询过滤条件
 * @param enabled - 是否启用查询 (默认: true)
 * @returns React Query infinite query result
 */
export function useInfiniteUsers(
  filters?: UserFilters,
  enabled: boolean = true
) {
  return useInfiniteQuery({
    // Query Key - 包含所有过滤条件用于缓存隔离
    queryKey: ['users', 'infinite', filters],

    // Query Function - 使用游标分页API
    queryFn: async ({ pageParam }) => {
      const response = await getUsersCursor({
        cursor: pageParam as string | undefined,
        limit: filters?.limit || 20,
        tenantId: filters?.tenantId,
        includeRoles: filters?.includeRoles,
      });

      // API Gateway 双重包装处理
      const actualData = response.data?.data || response.data || response;

      return {
        data: actualData.data || [],
        nextCursor: actualData.nextCursor,
        hasMore: actualData.hasMore,
        count: actualData.count,
      };
    },

    // 初始页面参数 (undefined = 第一页，无游标)
    initialPageParam: undefined,

    // 获取下一页参数 - 返回 nextCursor 或 undefined
    getNextPageParam: (lastPage) => {
      return lastPage.hasMore ? lastPage.nextCursor : undefined;
    },

    // 缓存配置
    staleTime: 30 * 1000, // 30秒内数据视为新鲜
    gcTime: 5 * 60 * 1000, // 5分钟后垃圾回收

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
 * @returns 所有用户的扁平化数组
 *
 * @example
 * ```tsx
 * const { data } = useInfiniteUsers();
 * const allUsers = flattenUsers(data?.pages);
 * ```
 */
export function flattenUsers(
  pages?: Array<{ data: User[] }>
): User[] {
  if (!pages) return [];
  return pages.flatMap((page) => page.data);
}

/**
 * 工具函数：计算已加载的总用户数
 *
 * @param pages - Infinite Query 返回的pages数据
 * @returns 已加载的用户总数
 *
 * @example
 * ```tsx
 * const { data } = useInfiniteUsers();
 * const loadedCount = getTotalLoadedUsers(data?.pages);
 * // 显示: "已加载 60 位用户"
 * ```
 */
export function getTotalLoadedUsers(
  pages?: Array<{ data: User[]; count: number }>
): number {
  if (!pages) return 0;
  return pages.reduce((total, page) => total + page.count, 0);
}
