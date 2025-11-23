import { useState, useCallback } from 'react';
import { z } from 'zod';
import dayjs, { type Dayjs } from 'dayjs';
import {
  getPaymentStatistics,
  getPaymentMethodsStats,
  getDailyStatistics,
} from '@/services/payment-admin';
import { useValidatedQuery } from '@/hooks/utils';
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

  // ✅ 使用 useValidatedQuery 加载所有统计数据（并发请求）
  const {
    data: dashboardData,
    isLoading: loading,
    refetch,
  } = useValidatedQuery({
    queryKey: ['payment-dashboard', dateRange[0].format('YYYY-MM-DD'), dateRange[1].format('YYYY-MM-DD')],
    queryFn: async () => {
      const [startDate, endDate] = dateRange;
      return await Promise.all([
        getPaymentStatistics(startDate.format('YYYY-MM-DD'), endDate.format('YYYY-MM-DD')),
        getPaymentMethodsStats(startDate.format('YYYY-MM-DD'), endDate.format('YYYY-MM-DD')),
        getDailyStatistics(30),
      ]);
    },
    schema: PaymentDashboardDataSchema,
    apiErrorMessage: '加载统计数据失败',
    fallbackValue: [null, [], []], // [statistics, methodStats, dailyStats]
    staleTime: 60 * 1000, // 支付统计数据1分钟缓存
  });

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
    refetch, // ✅ 暴露刷新方法
  };
};
