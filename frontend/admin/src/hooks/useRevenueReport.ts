import { useState, useCallback } from 'react';
import { message } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { getRevenueStats, exportRevenueReport } from '@/services/billing';
import { useValidatedQuery } from '@/hooks/utils';
import { RevenueStatsSchema } from '@/schemas/api.schemas';

export const useRevenueReport = () => {
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().subtract(30, 'days'),
    dayjs(),
  ]);

  // ✅ 使用 useValidatedQuery 加载收入统计
  const {
    data: revenueData,
    isLoading: loading,
  } = useValidatedQuery({
    queryKey: ['revenue-stats', dateRange[0].format('YYYY-MM-DD'), dateRange[1].format('YYYY-MM-DD')],
    queryFn: () =>
      getRevenueStats(dateRange[0].format('YYYY-MM-DD'), dateRange[1].format('YYYY-MM-DD')),
    schema: RevenueStatsSchema,
    apiErrorMessage: '加载收入统计失败',
    fallbackValue: {
      totalRevenue: 0,
      totalOrders: 0,
      avgOrderValue: 0,
      dailyStats: [],
      planStats: [],
    },
    staleTime: 60 * 1000, // 统计数据1分钟缓存
  });

  const totalRevenue = revenueData?.totalRevenue ?? 0;
  const totalOrders = revenueData?.totalOrders ?? 0;
  const avgOrderValue = revenueData?.avgOrderValue ?? 0;
  const dailyStats = revenueData?.dailyStats ?? [];
  const planStats = revenueData?.planStats ?? [];

  const handleExport = useCallback(
    async (format: 'excel' | 'csv') => {
      try {
        const blob = await exportRevenueReport(
          dateRange[0].format('YYYY-MM-DD'),
          dateRange[1].format('YYYY-MM-DD'),
          format
        );
        const url = window.URL.createObjectURL(blob as any);
        const link = document.createElement('a');
        link.href = url;
        link.download = `revenue_report_${dayjs().format('YYYYMMDD')}.${format === 'excel' ? 'xlsx' : 'csv'}`;
        link.click();
        window.URL.revokeObjectURL(url);
        message.success('导出成功');
      } catch (error) {
        message.error('导出失败');
      }
    },
    [dateRange]
  );

  return {
    loading,
    dateRange,
    setDateRange,
    totalRevenue,
    totalOrders,
    avgOrderValue,
    dailyStats,
    planStats,
    handleExport,
  };
};
