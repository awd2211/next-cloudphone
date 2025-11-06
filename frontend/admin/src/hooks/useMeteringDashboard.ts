import { useState, useEffect, useCallback } from 'react';
import { z } from 'zod';
import dayjs from 'dayjs';
import type { TrendType } from '@/components/Metering';
import {
  getMeteringOverview,
  getUserMeterings,
  getDeviceMeterings,
} from '@/services/billing';
import { useSafeApi } from './useSafeApi';
import {
  MeteringOverviewSchema,
  UserMeteringSchema,
  DeviceMeteringSchema,
} from '@/schemas/api.schemas';

/**
 * 计量仪表板业务逻辑 Hook
 *
 * 功能:
 * 1. 数据加载 (概览、用户计量、设备计量) - 使用 useSafeApi + Zod 验证
 * 2. 日期范围管理
 * 3. 趋势类型管理
 */
export const useMeteringDashboard = () => {
  // ===== 日期和趋势状态 =====
  const [dateRange, setDateRange] = useState<[string, string]>([
    dayjs().subtract(30, 'days').format('YYYY-MM-DD'),
    dayjs().format('YYYY-MM-DD'),
  ]);
  const [trendType, setTrendType] = useState<TrendType>('daily');

  // ===== 数据加载 (使用 useSafeApi) =====

  /**
   * 加载概览数据
   */
  const { data: overview } = useSafeApi(
    getMeteringOverview,
    MeteringOverviewSchema,
    {
      errorMessage: '加载概览数据失败',
      showError: false,
    }
  );

  /**
   * 加载用户计量
   */
  const {
    data: userMeteringsResponse,
    loading: userMeteringsLoading,
    execute: executeLoadUserMeterings,
  } = useSafeApi(
    () =>
      getUserMeterings({
        startDate: dateRange[0],
        endDate: dateRange[1],
      }),
    z.object({
      data: z.array(UserMeteringSchema),
    }),
    {
      errorMessage: '加载用户计量失败',
      fallbackValue: { data: [] },
    }
  );

  const userMeterings = userMeteringsResponse?.data || [];

  /**
   * 加载设备计量
   */
  const {
    data: deviceMeteringsResponse,
    loading: deviceMeteringsLoading,
    execute: executeLoadDeviceMeterings,
  } = useSafeApi(
    () =>
      getDeviceMeterings({
        startDate: dateRange[0],
        endDate: dateRange[1],
      }),
    z.object({
      data: z.array(DeviceMeteringSchema),
    }),
    {
      errorMessage: '加载设备计量失败',
      fallbackValue: { data: [] },
    }
  );

  const deviceMeterings = deviceMeteringsResponse?.data || [];

  /**
   * 日期范围变化时重新加载数据
   */
  useEffect(() => {
    executeLoadUserMeterings();
    executeLoadDeviceMeterings();
  }, [dateRange, executeLoadUserMeterings, executeLoadDeviceMeterings]);

  /**
   * 日期范围变更处理
   */
  const handleDateRangeChange = useCallback((dates: any) => {
    if (dates) {
      setDateRange([dates[0]!.format('YYYY-MM-DD'), dates[1]!.format('YYYY-MM-DD')]);
    }
  }, []);

  return {
    overview: overview || null,
    userMeterings,
    deviceMeterings,
    loading: userMeteringsLoading || deviceMeteringsLoading,
    dateRange,
    trendType,
    setTrendType,
    handleDateRangeChange,
  };
};
