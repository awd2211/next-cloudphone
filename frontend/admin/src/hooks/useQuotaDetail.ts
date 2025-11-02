import { useState, useCallback } from 'react';
import type { Quota, QuotaStatistics } from '@/types';
import * as quotaService from '@/services/quota';

interface UseQuotaDetailReturn {
  // 状态
  detailDrawerVisible: boolean;
  selectedQuota: Quota | null;
  selectedUserId: string;
  statistics: QuotaStatistics | null;

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
  const [statistics, setStatistics] = useState<QuotaStatistics | null>(null);

  // 查看配额详情
  const handleViewDetail = useCallback(async (record: Quota) => {
    setSelectedQuota(record);
    setSelectedUserId(record.userId);
    setDetailDrawerVisible(true);

    // 加载使用统计
    try {
      const result = await quotaService.getUsageStats(record.userId);
      if (result.success && result.data) {
        setStatistics(result.data);
      }
    } catch (error) {
      console.error('加载使用统计失败:', error);
    }
  }, []);

  // 关闭详情抽屉
  const handleCloseDetail = useCallback(() => {
    setDetailDrawerVisible(false);
    setStatistics(null);
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
