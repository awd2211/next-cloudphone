import { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import { z } from 'zod';
import dayjs, { type Dayjs } from 'dayjs';
import {
  getPaymentStatistics,
  getPaymentMethodsStats,
  getDailyStatistics,
  type PaymentStatistics,
  type PaymentMethodStat,
  type DailyStat,
} from '@/services/payment-admin';
import { useSafeApi } from './useSafeApi';
import { PaymentMethodStatSchema, DailyStatSchema } from '@/schemas/api.schemas';

// 支付统计组合响应 Schema
const PaymentDashboardDataSchema = z.tuple([
  z.any(), // PaymentStatistics - 保持灵活，因为结构可能复杂
  z.array(PaymentMethodStatSchema), // methodStats
  z.array(DailyStatSchema), // dailyStats
]);

export const usePaymentDashboard = () => {
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().subtract(30, 'days'),
    dayjs(),
  ]);

  // ✅ 使用 useSafeApi 加载所有统计数据
  const {
    data: dashboardData,
    loading,
    execute: executeLoad,
  } = useSafeApi(
    async () => {
      const [startDate, endDate] = dateRange;
      return await Promise.all([
        getPaymentStatistics(startDate.format('YYYY-MM-DD'), endDate.format('YYYY-MM-DD')),
        getPaymentMethodsStats(startDate.format('YYYY-MM-DD'), endDate.format('YYYY-MM-DD')),
        getDailyStatistics(30),
      ]);
    },
    PaymentDashboardDataSchema,
    {
      errorMessage: '加载统计数据失败',
      fallbackValue: [null, [], []], // [statistics, methodStats, dailyStats]
    }
  );

  const loadStatistics = useCallback(async () => {
    await executeLoad();
  }, [executeLoad]);

  // 日期范围变更时自动重新加载
  useEffect(() => {
    loadStatistics();
  }, [dateRange, loadStatistics]);

  // 日期范围变更
  const handleDateRangeChange = useCallback((dates: [Dayjs, Dayjs]) => {
    setDateRange(dates);
  }, []);

  return {
    loading,
    statistics: dashboardData?.[0] || null, // ✅ 从 tuple 中提取
    methodStats: dashboardData?.[1] || [], // ✅ 从 tuple 中提取
    dailyStats: dashboardData?.[2] || [], // ✅ 从 tuple 中提取
    dateRange,
    handleDateRangeChange,
  };
};
