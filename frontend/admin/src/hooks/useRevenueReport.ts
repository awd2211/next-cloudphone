import { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { getRevenueStats, exportRevenueReport } from '@/services/billing';
import type { DailyStats, PlanStats } from '@/types/revenue';

export const useRevenueReport = () => {
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().subtract(30, 'days'),
    dayjs(),
  ]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [avgOrderValue, setAvgOrderValue] = useState(0);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [planStats, setPlanStats] = useState<PlanStats[]>([]);

  const loadRevenueStats = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getRevenueStats(
        dateRange[0].format('YYYY-MM-DD'),
        dateRange[1].format('YYYY-MM-DD')
      );
      setTotalRevenue(data.totalRevenue);
      setTotalOrders(data.totalOrders);
      setAvgOrderValue(data.avgOrderValue);
      setDailyStats(data.dailyStats || []);
      setPlanStats(data.planStats || []);
    } catch (error) {
      message.error('加载收入统计失败');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    loadRevenueStats();
  }, [loadRevenueStats]);

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
