import { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import dayjs from 'dayjs';
import type { MeteringOverview, UserMetering, DeviceMetering, TrendType } from '@/components/Metering';
import {
  getMeteringOverview,
  getUserMeterings,
  getDeviceMeterings,
} from '@/services/billing';

export const useMeteringDashboard = () => {
  const [overview, setOverview] = useState<MeteringOverview | null>(null);
  const [userMeterings, setUserMeterings] = useState<UserMetering[]>([]);
  const [deviceMeterings, setDeviceMeterings] = useState<DeviceMetering[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<[string, string]>([
    dayjs().subtract(30, 'days').format('YYYY-MM-DD'),
    dayjs().format('YYYY-MM-DD'),
  ]);
  const [trendType, setTrendType] = useState<TrendType>('daily');

  // 加载概览数据
  const loadOverview = useCallback(async () => {
    try {
      const data = await getMeteringOverview();
      setOverview(data as MeteringOverview);
    } catch (error) {
      message.error('加载概览数据失败');
    }
  }, []);

  // 加载用户计量
  const loadUserMeterings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getUserMeterings({
        startDate: dateRange[0],
        endDate: dateRange[1],
      });
      setUserMeterings(res.data as UserMetering[]);
    } catch (error) {
      message.error('加载用户计量失败');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  // 加载设备计量
  const loadDeviceMeterings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getDeviceMeterings({
        startDate: dateRange[0],
        endDate: dateRange[1],
      });
      setDeviceMeterings(res.data as DeviceMetering[]);
    } catch (error) {
      message.error('加载设备计量失败');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    loadOverview();
    loadUserMeterings();
    loadDeviceMeterings();
  }, [dateRange, loadOverview, loadUserMeterings, loadDeviceMeterings]);

  const handleDateRangeChange = useCallback((dates: any) => {
    if (dates) {
      setDateRange([dates[0]!.format('YYYY-MM-DD'), dates[1]!.format('YYYY-MM-DD')]);
    }
  }, []);

  return {
    overview,
    userMeterings,
    deviceMeterings,
    loading,
    dateRange,
    trendType,
    setTrendType,
    handleDateRangeChange,
  };
};
