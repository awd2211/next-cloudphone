import { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import {
  getPaymentStatistics,
  getPaymentMethodsStats,
  getDailyStatistics,
  type PaymentStatistics,
  type PaymentMethodStat,
  type DailyStat,
} from '@/services/payment-admin';

export const usePaymentDashboard = () => {
  const [loading, setLoading] = useState(false);
  const [statistics, setStatistics] = useState<PaymentStatistics | null>(null);
  const [methodStats, setMethodStats] = useState<PaymentMethodStat[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStat[]>([]);
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().subtract(30, 'days'),
    dayjs(),
  ]);

  // 加载统计数据
  const loadStatistics = useCallback(async () => {
    setLoading(true);
    try {
      const [startDate, endDate] = dateRange;
      const [statsRes, methodsRes, dailyRes] = await Promise.all([
        getPaymentStatistics(startDate.format('YYYY-MM-DD'), endDate.format('YYYY-MM-DD')),
        getPaymentMethodsStats(startDate.format('YYYY-MM-DD'), endDate.format('YYYY-MM-DD')),
        getDailyStatistics(30),
      ]);

      setStatistics(statsRes);
      setMethodStats(methodsRes);
      setDailyStats(dailyRes);
    } catch (error) {
      message.error('加载统计数据失败');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    loadStatistics();
  }, [loadStatistics]);

  // 日期范围变更
  const handleDateRangeChange = useCallback((dates: [Dayjs, Dayjs]) => {
    setDateRange(dates);
  }, []);

  return {
    loading,
    statistics,
    methodStats,
    dailyStats,
    dateRange,
    handleDateRangeChange,
  };
};
