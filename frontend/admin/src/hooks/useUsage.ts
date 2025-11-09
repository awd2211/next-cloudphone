import { useQuery } from '@tanstack/react-query';
import { getAdminUsageRecords } from '@/services/billing';
import { UsageRecordsResponseSchema } from '@/schemas/api.schemas';

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
      // ✅ 使用管理员专用的使用记录接口（已支持 page/pageSize 分页）
      const response = await getAdminUsageRecords(params || {});
      // ✅ 添加 Zod 验证
      const validated = UsageRecordsResponseSchema.parse(response);
      return validated;
    },
    staleTime: 30 * 1000, // 30 seconds
  });
}
