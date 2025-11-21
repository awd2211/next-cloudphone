import { getDashboardStats, getUserGrowthStats, getPlanDistributionStats } from '@/services/stats';
import { getRevenueStats } from '@/services/billing';
import { getDeviceStats } from '@/services/device';
import type { DashboardStats } from '@/types';
import dayjs from 'dayjs';
import { useValidatedQuery } from '@/hooks/utils';
import {
  DashboardStatsSchema,
  ChartDataResponseSchema,
} from '@/schemas/api.schemas';

interface UseDashboardReturn {
  // 统计数据
  stats: DashboardStats | null | undefined;
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
  // ✅ 使用 useValidatedQuery 加载统计数据（自动30秒刷新）
  const {
    data: stats,
    isLoading: statsLoading,
    isError: hasStatsError,
    refetch: loadStats,
  } = useValidatedQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const response: any = await getDashboardStats();
      return response?.data || response;
    },
    schema: DashboardStatsSchema,
    apiErrorMessage: '加载仪表盘统计数据失败',
    fallbackValue: undefined,
    staleTime: 30 * 1000, // 统计数据30秒缓存
    refetchInterval: 30 * 1000, // 自动每30秒刷新
  });

  // ✅ 使用 useValidatedQuery 加载图表数据（聚合多个API）
  const {
    data: chartData,
    isLoading: chartsLoading,
    isError: hasChartsError,
    refetch: loadChartData,
  } = useValidatedQuery({
    queryKey: ['dashboard-charts'],
    queryFn: async () => {
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
    schema: ChartDataResponseSchema,
    apiErrorMessage: '加载图表数据失败',
    fallbackValue: {
      revenueData: [],
      deviceStatusData: [],
      userGrowthData: [],
      planDistributionData: [],
    },
    staleTime: 60 * 1000, // 图表数据1分钟缓存
  });

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
    loadStats: async () => { await loadStats(); },
    loadChartData: async () => { await loadChartData(); },
  };
};
