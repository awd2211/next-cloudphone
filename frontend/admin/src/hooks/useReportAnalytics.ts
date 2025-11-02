import { useState, useEffect, useCallback } from 'react';
import dayjs from 'dayjs';
import { getRevenueStats } from '@/services/billing';
import { getUserGrowthStats, getPlanDistributionStats } from '@/services/stats';
import { getDeviceStats } from '@/services/device';
import type { PeriodType, AnalyticsData } from '@/components/ReportAnalytics/constants';

export const useReportAnalytics = () => {
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<[string, string]>([
    dayjs().subtract(29, 'day').format('YYYY-MM-DD'),
    dayjs().format('YYYY-MM-DD'),
  ]);
  const [period, setPeriod] = useState<PeriodType>('day');

  // 统计数据
  const [revenueData, setRevenueData] = useState<AnalyticsData['revenueData']>({
    totalRevenue: 0,
    totalOrders: 0,
    avgOrderValue: 0,
    dailyStats: [],
  });
  const [userGrowthData, setUserGrowthData] = useState<AnalyticsData['userGrowthData']>([]);
  const [deviceData, setDeviceData] = useState<AnalyticsData['deviceData']>({
    total: 0,
    running: 0,
    idle: 0,
    stopped: 0,
  });
  const [planData, setPlanData] = useState<AnalyticsData['planData']>([]);

  // 加载数据
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // 并行加载所有数据
      const [revenueRes, userRes, deviceRes, planRes] = await Promise.all([
        getRevenueStats(dateRange[0], dateRange[1]),
        getUserGrowthStats(30),
        getDeviceStats(),
        getPlanDistributionStats(),
      ]);

      setRevenueData(revenueRes);
      setUserGrowthData(userRes || []);
      setDeviceData(deviceRes);
      setPlanData(planRes || []);
    } catch (error) {
      console.error('加载数据失败', error);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    loadData();
  }, [loadData, period]);

  // 日期范围变更
  const handleDateRangeChange = useCallback((dates: [string, string]) => {
    setDateRange(dates);
  }, []);

  // 周期变更
  const handlePeriodChange = useCallback((newPeriod: PeriodType) => {
    setPeriod(newPeriod);
  }, []);

  return {
    loading,
    dateRange,
    period,
    revenueData,
    userGrowthData,
    deviceData,
    planData,
    handleDateRangeChange,
    handlePeriodChange,
  };
};
