import { useQuery } from '@tanstack/react-query';
import { getUsageRecords } from '@/services/billing';

// Query Keys
export const usageKeys = {
  all: ['usage'] as const,
  lists: () => [...usageKeys.all, 'list'] as const,
  list: (params?: { page?: number; pageSize?: number; userId?: string; deviceId?: string }) =>
    [...usageKeys.lists(), params] as const,
};

// Queries
export function useUsageRecords(params?: {
  page?: number;
  pageSize?: number;
  userId?: string;
  deviceId?: string;
}) {
  return useQuery({
    queryKey: usageKeys.list(params),
    queryFn: async () => {
      const response = await getUsageRecords(params || {});
      return {
        data: response.data,
        total: response.total,
      };
    },
    staleTime: 30 * 1000, // 30 seconds
  });
}
