import { useState, useCallback } from 'react';
import { z } from 'zod';
import dayjs from 'dayjs';
import type { TrendType } from '@/components/Metering';
import {
  getMeteringOverview,
  getUserMeterings,
  getDeviceMeterings,
} from '@/services/billing';
import { useValidatedQuery } from '@/hooks/utils';
import {
  MeteringOverviewSchema,
  UserMeteringSchema,
  DeviceMeteringSchema,
} from '@/schemas/api.schemas';

/**
 * 计量仪表板业务逻辑 Hook
 *
 * 功能:
 * 1. 数据加载 (概览、用户计量、设备计量) - 使用 useValidatedQuery + Zod 验证
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

  // ===== 数据加载 (使用 useValidatedQuery) =====

  /**
   * 加载概览数据
   */
  const { data: overview } = useValidatedQuery({
    queryKey: ['metering-overview'],
    queryFn: getMeteringOverview,
    schema: MeteringOverviewSchema,
    apiErrorMessage: '加载概览数据失败',
    staleTime: 5 * 60 * 1000, // 概览数据5分钟缓存
  });

  /**
   * 加载用户计量
   */
  const {
    data: userMeteringsResponse,
    isLoading: userMeteringsLoading,
  } = useValidatedQuery({
    queryKey: ['user-meterings', dateRange[0], dateRange[1]],
    queryFn: () =>
      getUserMeterings({
        startDate: dateRange[0],
        endDate: dateRange[1],
      }),
    schema: z.object({
      data: z.array(UserMeteringSchema),
    }),
    apiErrorMessage: '加载用户计量失败',
    fallbackValue: { data: [] },
    staleTime: 60 * 1000, // 计量数据1分钟缓存
  });

  const userMeterings = userMeteringsResponse?.data || [];

  /**
   * 加载设备计量
   */
  const {
    data: deviceMeteringsResponse,
    isLoading: deviceMeteringsLoading,
  } = useValidatedQuery({
    queryKey: ['device-meterings', dateRange[0], dateRange[1]],
    queryFn: () =>
      getDeviceMeterings({
        startDate: dateRange[0],
        endDate: dateRange[1],
      }),
    schema: z.object({
      data: z.array(DeviceMeteringSchema),
    }),
    apiErrorMessage: '加载设备计量失败',
    fallbackValue: { data: [] },
    staleTime: 60 * 1000, // 计量数据1分钟缓存
  });

  const deviceMeterings = deviceMeteringsResponse?.data || [];

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
