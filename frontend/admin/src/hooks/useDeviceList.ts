import { useInfiniteQuery } from '@tanstack/react-query';
import request from '@/utils/request';

interface Device {
  id: string;
  name: string;
  userId: string;
  providerType: string;
  deviceType?: string;
  status: string;
  cpu?: number;
  memory?: number;
  gpuEnabled?: boolean;
  screenshotUrl?: string;
  createdAt: string;
  updatedAt: string;
}

interface DeviceListResponse {
  items: Device[];
  total: number;
  page: number;
  pageSize: number;
}

interface UseDeviceListOptions {
  pageSize?: number;
  filters?: {
    status?: string;
    providerType?: string;
    userId?: string;
    search?: string;
  };
  enabled?: boolean;
}

export const useDeviceList = (options: UseDeviceListOptions = {}) => {
  const { pageSize = 50, filters = {}, enabled = true } = options;

  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    status,
    refetch,
  } = useInfiniteQuery<DeviceListResponse>({
    queryKey: ['devices', filters],
    queryFn: async ({ pageParam = 1 }) => {
      try {
        const params: Record<string, any> = {
          page: pageParam,
          pageSize,
        };

        // 添加过滤条件
        if (filters.status) params.status = filters.status;
        if (filters.providerType) params.providerType = filters.providerType;
        if (filters.userId) params.userId = filters.userId;
        if (filters.search) params.search = filters.search;

        const response = await request.get('/devices', { params });

        return {
          items: response.data || [],
          total: response.total || 0,
          page: pageParam as number,
          pageSize,
        };
      } catch (error) {
        console.error('Failed to fetch devices:', error);
        // 返回空数据而不是抛出错误,避免中断用户体验
        return {
          items: [],
          total: 0,
          page: pageParam as number,
          pageSize,
        };
      }
    },
    getNextPageParam: (lastPage, pages) => {
      const currentPage = pages.length;
      const totalPages = Math.ceil(lastPage.total / pageSize);
      return currentPage < totalPages ? currentPage + 1 : undefined;
    },
    staleTime: 30 * 1000, // 30 秒内认为数据新鲜
    gcTime: 5 * 60 * 1000, // 5 分钟缓存 (React Query v5 使用 gcTime)
    enabled,
    refetchOnWindowFocus: false,
    retry: 1,
    initialPageParam: 1, // React Query v5 需要 initialPageParam
  });

  // 扁平化所有页面的设备数据
  const devices: Device[] = data?.pages.flatMap((page) => page.items) ?? [];
  const totalCount = data?.pages[0]?.total ?? 0;

  return {
    devices,
    totalCount,
    error,
    isLoading: status === 'loading',
    isFetching,
    isFetchingNextPage,
    hasNextPage: hasNextPage ?? false,
    fetchNextPage,
    refetch,
  };
};
