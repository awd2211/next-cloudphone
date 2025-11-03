/**
 * useInfiniteDevices - 设备列表无限滚动 Hook
 *
 * 使用游标分页实现高性能的设备列表无限加载
 * 适用于虚拟滚动场景，避免传统分页的深分页性能问题
 *
 * @example
 * ```tsx
 * const { data, fetchNextPage, hasNextPage, isFetching } = useInfiniteDevices({
 *   limit: 20,
 *   status: 'running'
 * });
 *
 * // 展开所有页面的数据
 * const allDevices = data?.pages.flatMap(page => page.data) ?? [];
 * ```
 */

import { useInfiniteQuery } from '@tanstack/react-query';
import { getDevicesCursor } from '@/services/device';
import type { Device, CursorPaginationParams } from '@/types';

/**
 * 设备查询过滤参数
 */
export interface DeviceFilters {
  userId?: string;
  tenantId?: string;
  status?: string;
  limit?: number;
}

/**
 * useInfiniteDevices Hook
 *
 * @param filters - 查询过滤条件
 * @param enabled - 是否启用查询 (默认: true)
 * @returns React Query infinite query result
 */
export function useInfiniteDevices(filters?: DeviceFilters, enabled: boolean = true) {
  return useInfiniteQuery({
    // Query Key - 包含所有过滤条件用于缓存隔离
    queryKey: ['devices', 'infinite', filters],

    // Query Function - 使用游标分页API
    queryFn: async ({ pageParam }) => {
      const response = await getDevicesCursor({
        cursor: pageParam as string | undefined,
        limit: filters?.limit || 20,
        userId: filters?.userId,
        tenantId: filters?.tenantId,
        status: filters?.status,
      });

      // response已被拦截器unwrapped，直接使用
      // response类型: CursorPaginatedResponse<Device>
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
 * @returns 所有设备的扁平化数组
 *
 * @example
 * ```tsx
 * const { data } = useInfiniteDevices();
 * const allDevices = flattenDevices(data?.pages);
 * ```
 */
export function flattenDevices(pages?: Array<{ data: Device[] }>): Device[] {
  if (!pages) return [];
  return pages.flatMap((page) => page.data);
}

/**
 * 工具函数：计算已加载的总设备数
 *
 * @param pages - Infinite Query 返回的pages数据
 * @returns 已加载的设备总数
 *
 * @example
 * ```tsx
 * const { data } = useInfiniteDevices();
 * const loadedCount = getTotalLoadedDevices(data?.pages);
 * // 显示: "已加载 60 台设备"
 * ```
 */
export function getTotalLoadedDevices(pages?: Array<{ data: Device[]; count: number }>): number {
  if (!pages) return 0;
  return pages.reduce((total, page) => total + page.count, 0);
}
