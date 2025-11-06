import { useState, useCallback, useEffect } from 'react';
import dayjs from 'dayjs';
import { z } from 'zod';
import { getRevenueStats } from '@/services/billing';
import { getUserGrowthStats, getPlanDistributionStats } from '@/services/stats';
import { getDeviceStats } from '@/services/device';
import type { PeriodType } from '@/components/ReportAnalytics/constants';
import { useSafeApi } from './useSafeApi';
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
 * 1. 数据加载 (收入、用户增长、设备、套餐分布) - 使用 useSafeApi + Zod 验证
 * 2. 日期范围管理
 * 3. 周期类型管理
 */
export const useReportAnalytics = () => {
  const [dateRange, setDateRange] = useState<[string, string]>([
    dayjs().subtract(29, 'day').format('YYYY-MM-DD'),
    dayjs().format('YYYY-MM-DD'),
  ]);
  const [period, setPeriod] = useState<PeriodType>('day');

  // ===== 数据加载 (使用 useSafeApi) =====

  /**
   * 加载收入统计
   */
  const {
    data: revenueData,
    loading: revenueLoading,
    execute: executeLoadRevenue,
  } = useSafeApi(
    () => getRevenueStats(dateRange[0], dateRange[1]),
    RevenueStatsSchema,
    {
      errorMessage: '加载收入统计失败',
      fallbackValue: {
        totalRevenue: 0,
        totalOrders: 0,
        avgOrderValue: 0,
        dailyStats: [],
      },
      manual: true,
    }
  );

  /**
   * 加载用户增长统计
   */
  const {
    data: userGrowthData,
    loading: userGrowthLoading,
    execute: executeLoadUserGrowth,
  } = useSafeApi(
    () => getUserGrowthStats(30),
    z.array(UserGrowthItemSchema),
    {
      errorMessage: '加载用户增长统计失败',
      fallbackValue: [],
      manual: true,
    }
  );

  /**
   * 加载设备统计
   */
  const {
    data: deviceData,
    loading: deviceLoading,
    execute: executeLoadDevice,
  } = useSafeApi(
    getDeviceStats,
    DeviceStatsSchema,
    {
      errorMessage: '加载设备统计失败',
      fallbackValue: {
        total: 0,
        running: 0,
        idle: 0,
        stopped: 0,
      },
      manual: true,
    }
  );

  /**
   * 加载套餐分布统计
   */
  const {
    data: planData,
    loading: planLoading,
    execute: executeLoadPlan,
  } = useSafeApi(
    getPlanDistributionStats,
    z.array(PlanDistributionItemSchema),
    {
      errorMessage: '加载套餐分布统计失败',
      fallbackValue: [],
      manual: true,
    }
  );

  /**
   * 加载所有数据
   */
  const loadData = useCallback(async () => {
    await Promise.all([
      executeLoadRevenue(),
      executeLoadUserGrowth(),
      executeLoadDevice(),
      executeLoadPlan(),
    ]);
  }, [executeLoadRevenue, executeLoadUserGrowth, executeLoadDevice, executeLoadPlan]);

  /**
   * 初始化加载和依赖变化时重新加载
   */
  useEffect(() => {
    loadData();
  }, [loadData, period]);

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
    loading: revenueLoading || userGrowthLoading || deviceLoading || planLoading,
    dateRange,
    period,
    revenueData: revenueData || {
      totalRevenue: 0,
      totalOrders: 0,
      avgOrderValue: 0,
      dailyStats: [],
    },
    userGrowthData: userGrowthData || [],
    deviceData: deviceData || {
      total: 0,
      running: 0,
      idle: 0,
      stopped: 0,
    },
    planData: planData || [],
    handleDateRangeChange,
    handlePeriodChange,
  };
};
