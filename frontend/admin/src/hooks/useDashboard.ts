import { useState, useEffect, useCallback } from 'react';
import { useAsyncOperation } from './useAsyncOperation';
import { getDashboardStats, getUserGrowthStats, getPlanDistributionStats } from '@/services/stats';
import { getRevenueStats } from '@/services/billing';
import { getDeviceStats } from '@/services/device';
import type { DashboardStats } from '@/types';
import dayjs from 'dayjs';

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
  // 统计数据状态
  const [stats, setStats] = useState<DashboardStats>();
  const [hasStatsError, setHasStatsError] = useState(false);

  // 图表数据状态
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [deviceStatusData, setDeviceStatusData] = useState<any[]>([]);
  const [userGrowthData, setUserGrowthData] = useState<any[]>([]);
  const [planDistributionData, setPlanDistributionData] = useState<any[]>([]);
  const [hasChartsError, setHasChartsError] = useState(false);

  const { execute: executeStatsLoad, loading: statsLoading } = useAsyncOperation();
  const { execute: executeChartsLoad, loading: chartsLoading } = useAsyncOperation();

  // 加载统计数据
  const loadStats = useCallback(async () => {
    await executeStatsLoad(
      async () => {
        const response: any = await getDashboardStats();
        return response?.data || response;
      },
      {
        errorContext: '加载仪表盘统计数据',
        showSuccessMessage: false,
        onSuccess: (data) => {
          setStats(data);
          setHasStatsError(false);
        },
        onError: () => {
          setHasStatsError(true);
        },
      }
    );
  }, [executeStatsLoad]);

  // 加载图表数据
  const loadChartData = useCallback(async () => {
    await executeChartsLoad(
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
      {
        errorContext: '加载图表数据',
        showSuccessMessage: false,
        onSuccess: (data) => {
          setRevenueData(data.revenueData);
          setDeviceStatusData(data.deviceStatusData);
          setUserGrowthData(data.userGrowthData);
          setPlanDistributionData(data.planDistributionData);
          setHasChartsError(false);
        },
        onError: () => {
          setHasChartsError(true);
        },
      }
    );
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

    // 图表数据
    revenueData,
    deviceStatusData,
    userGrowthData,
    planDistributionData,
    chartsLoading,
    hasChartsError,

    // 操作方法
    loadStats,
    loadChartData,
  };
};
