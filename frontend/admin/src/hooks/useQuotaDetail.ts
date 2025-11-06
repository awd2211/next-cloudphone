import { useState, useCallback } from 'react';
import type { Quota } from '@/types';
import * as quotaService from '@/services/quota';
import { useSafeApi } from './useSafeApi';
import { QuotaStatisticsResponseSchema } from '@/schemas/api.schemas';

interface UseQuotaDetailReturn {
  // 状态
  detailDrawerVisible: boolean;
  selectedQuota: Quota | null;
  selectedUserId: string;
  statistics: ReturnType<typeof useSafeApi>['data'];

  // 操作方法
  handleViewDetail: (record: Quota) => Promise<void>;
  handleCloseDetail: () => void;
}

/**
 * 配额详情查看 Hook
 * 封装配额详情的查看和统计数据加载
 */
export const useQuotaDetail = (): UseQuotaDetailReturn => {
  const [detailDrawerVisible, setDetailDrawerVisible] = useState(false);
  const [selectedQuota, setSelectedQuota] = useState<Quota | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  // ✅ 使用 useSafeApi 加载使用统计
  const {
    data: statisticsResponse,
    execute: executeLoadStatistics,
  } = useSafeApi(
    (userId: string) => quotaService.getUsageStats(userId),
    QuotaStatisticsResponseSchema,
    {
      errorMessage: '加载使用统计失败',
      fallbackValue: null,
      manual: true,
      showError: false,
    }
  );

  const statistics = statisticsResponse?.success ? statisticsResponse.data : null;

  // 查看配额详情
  const handleViewDetail = useCallback(
    async (record: Quota) => {
      setSelectedQuota(record);
      setSelectedUserId(record.userId);
      setDetailDrawerVisible(true);

      // 加载使用统计
      await executeLoadStatistics(record.userId);
    },
    [executeLoadStatistics]
  );

  // 关闭详情抽屉
  const handleCloseDetail = useCallback(() => {
    setDetailDrawerVisible(false);
  }, []);

  return {
    detailDrawerVisible,
    selectedQuota,
    selectedUserId,
    statistics,
    handleViewDetail,
    handleCloseDetail,
  };
};
