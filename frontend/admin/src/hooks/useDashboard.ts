import { useEffect, useCallback } from 'react';
import { getDashboardStats, getUserGrowthStats, getPlanDistributionStats } from '@/services/stats';
import { getRevenueStats } from '@/services/billing';
import { getDeviceStats } from '@/services/device';
import type { DashboardStats } from '@/types';
import dayjs from 'dayjs';
import { useSafeApi } from './useSafeApi';
import {
  DashboardStatsSchema,
  ChartDataResponseSchema,
} from '@/schemas/api.schemas';

interface UseDashboardReturn {
  // 统计数据
  stats: DashboardStats | undefined;
  statsLoading: boolean;
  hasStatsError: boolean;

  // 图表数据
  revenueData: any[];
  deviceStatusData: any[];
  userGrowthData: any[];
  planDistributionData: any[];
  chartsLoading: boolean;
  hasChartsError: boolean;

  // 操作方法
  loadStats: () => Promise<void>;
  loadChartData: () => Promise<void>;
}

/**
 * Dashboard 数据管理 Hook
 * 封装控制台的所有数据加载逻辑
 */
export const useDashboard = (): UseDashboardReturn => {
  // ✅ 使用 useSafeApi 加载统计数据
  const {
    data: stats,
    loading: statsLoading,
    error: statsError,
    execute: executeStatsLoad,
  } = useSafeApi(
    async () => {
      const response: any = await getDashboardStats();
      return response?.data || response;
    },
    DashboardStatsSchema,
    {
      errorMessage: '加载仪表盘统计数据失败',
      fallbackValue: undefined,
    }
  );

  // ✅ 使用 useSafeApi 加载图表数据
  const {
    data: chartData,
    loading: chartsLoading,
    error: chartsError,
    execute: executeChartsLoad,
  } = useSafeApi(
    async () => {
      // 加载近7天收入数据
      const endDate = dayjs().format('YYYY-MM-DD');
      const startDate = dayjs().subtract(6, 'day').format('YYYY-MM-DD');
      const revenueRes: any = await getRevenueStats(startDate, endDate);
      const revenueDataResult = revenueRes?.data?.dailyStats || revenueRes?.dailyStats || [];

      // 加载设备状态数据
      const deviceRes: any = await getDeviceStats();
      const deviceData = deviceRes?.data || deviceRes;
      const statusData = [
        { status: 'idle', count: deviceData.idle || 0 },
        { status: 'running', count: deviceData.running || 0 },
        { status: 'stopped', count: deviceData.stopped || 0 },
      ].filter((item) => item.count > 0);

      // 加载用户增长数据（近30天）
      const userGrowthRes: any = await getUserGrowthStats(30);
      const userGrowthResult = userGrowthRes?.data || userGrowthRes || [];

      // 加载套餐分布数据
      const planDistRes: any = await getPlanDistributionStats();
      const planDistResult = planDistRes?.data || planDistRes || [];

      return {
        revenueData: revenueDataResult,
        deviceStatusData: statusData,
        userGrowthData: userGrowthResult,
        planDistributionData: planDistResult,
      };
    },
    ChartDataResponseSchema,
    {
      errorMessage: '加载图表数据失败',
      fallbackValue: {
        revenueData: [],
        deviceStatusData: [],
        userGrowthData: [],
        planDistributionData: [],
      },
    }
  );

  // 计算错误状态
  const hasStatsError = !!statsError;
  const hasChartsError = !!chartsError;

  // ✅ 简化的加载函数
  const loadStats = useCallback(async () => {
    await executeStatsLoad();
  }, [executeStatsLoad]);

  const loadChartData = useCallback(async () => {
    await executeChartsLoad();
  }, [executeChartsLoad]);

  // 初始化加载 + 定时刷新统计数据
  useEffect(() => {
    loadStats();
    loadChartData();
    const interval = setInterval(loadStats, 30000); // 每30秒刷新统计数据
    return () => clearInterval(interval);
  }, [loadStats, loadChartData]);

  return {
    // 统计数据
    stats,
    statsLoading,
    hasStatsError,

    // 图表数据 - ✅ 从 chartData 中提取
    revenueData: chartData?.revenueData || [],
    deviceStatusData: chartData?.deviceStatusData || [],
    userGrowthData: chartData?.userGrowthData || [],
    planDistributionData: chartData?.planDistributionData || [],
    chartsLoading,
    hasChartsError,

    // 操作方法
    loadStats,
    loadChartData,
  };
};
