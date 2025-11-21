import { useState, useCallback } from 'react';
import dayjs from 'dayjs';
import { z } from 'zod';
import { getRevenueStats } from '@/services/billing';
import { getUserGrowthStats, getPlanDistributionStats } from '@/services/stats';
import { getDeviceStats } from '@/services/device';
import type { PeriodType } from '@/components/ReportAnalytics/constants';
import { useValidatedQuery } from '@/hooks/utils';
import {
  RevenueStatsSchema,
  DeviceStatsSchema,
  UserGrowthItemSchema,
  PlanDistributionItemSchema,
} from '@/schemas/api.schemas';

/**
 * 报表分析页面业务逻辑 Hook
 *
 * 功能:
 * 1. 数据加载 (收入、用户增长、设备、套餐分布) - 使用 useValidatedQuery + Zod 验证
 * 2. 日期范围管理
 * 3. 周期类型管理
 */
export const useReportAnalytics = () => {
  const [dateRange, setDateRange] = useState<[string, string]>([
    dayjs().subtract(29, 'day').format('YYYY-MM-DD'),
    dayjs().format('YYYY-MM-DD'),
  ]);
  const [period, setPeriod] = useState<PeriodType>('day');

  // ===== 数据加载 (使用 useValidatedQuery + Promise.all) =====

  /**
   * 并发加载所有报表数据
   */
  const {
    data: analyticsData,
    isLoading: loading,
  } = useValidatedQuery({
    queryKey: ['report-analytics', dateRange[0], dateRange[1], period],
    queryFn: async () => {
      const [revenue, userGrowth, device, plan] = await Promise.all([
        getRevenueStats(dateRange[0], dateRange[1]),
        getUserGrowthStats(30),
        getDeviceStats(),
        getPlanDistributionStats(),
      ]);
      return { revenue, userGrowth, device, plan };
    },
    schema: z.object({
      revenue: RevenueStatsSchema,
      userGrowth: z.array(UserGrowthItemSchema),
      device: DeviceStatsSchema,
      plan: z.array(PlanDistributionItemSchema),
    }),
    apiErrorMessage: '加载报表数据失败',
    fallbackValue: {
      revenue: {
        totalRevenue: 0,
        totalOrders: 0,
        avgOrderValue: 0,
        dailyStats: [],
        planStats: [],
      },
      userGrowth: [],
      device: {
        total: 0,
        running: 0,
        idle: 0,
        stopped: 0,
      },
      plan: [],
    },
    staleTime: 60 * 1000, // 报表数据1分钟缓存
  });

  /**
   * 日期范围变更处理
   */
  const handleDateRangeChange = useCallback((dates: [string, string]) => {
    setDateRange(dates);
  }, []);

  /**
   * 周期变更处理
   */
  const handlePeriodChange = useCallback((newPeriod: PeriodType) => {
    setPeriod(newPeriod);
  }, []);

  return {
    loading,
    dateRange,
    period,
    revenueData: analyticsData?.revenue || {
      totalRevenue: 0,
      totalOrders: 0,
      avgOrderValue: 0,
      dailyStats: [],
    },
    userGrowthData: analyticsData?.userGrowth || [],
    deviceData: analyticsData?.device || {
      total: 0,
      running: 0,
      idle: 0,
      stopped: 0,
    },
    planData: analyticsData?.plan || [],
    handleDateRangeChange,
    handlePeriodChange,
  };
};
