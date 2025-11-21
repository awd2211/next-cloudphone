import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import request from '@/utils/request';

interface OverviewData {
  totalUsers: number;
  totalDevices: number;
  totalRevenue: number;
  activeDevices: number;
}

interface TrendsData {
  deviceTrends: Array<{ date: string; count: number }>;
}

interface UserGrowthData {
  data: Array<{ date: string; newUsers: number; totalUsers: number }>;
}

interface DeviceUsageData {
  statusDistribution: Array<{ status: string; count: number; percent: number }>;
}

interface RevenueData {
  data: Array<{ date: string; amount: number }>;
}

interface TopAppsData {
  data: Array<{ id: string; name: string; installCount: number; activeDevices: number }>;
}

export const useStatsDashboard = () => {
  const [timeRange, setTimeRange] = useState<string>('7d');
  const [dateRange, setDateRange] = useState<any>(null);

  // 获取概览统计
  const { data: overview, isLoading: overviewLoading } = useQuery<OverviewData>({
    queryKey: ['stats-overview'],
    queryFn: async () => {
      const response = await request.get('/stats/overview');
      return response as OverviewData;
    },
  });

  // 获取趋势数据
  const { data: trends, isLoading: trendsLoading } = useQuery<TrendsData>({
    queryKey: ['stats-trends', timeRange, dateRange],
    queryFn: async () => {
      const params: any = { range: timeRange };
      if (dateRange) {
        params.startDate = dateRange[0].toISOString();
        params.endDate = dateRange[1].toISOString();
      }
      const response = await request.get('/stats/trends', { params });
      return response as TrendsData;
    },
  });

  // 获取用户增长数据
  const { data: userGrowth } = useQuery<UserGrowthData>({
    queryKey: ['stats-user-growth', timeRange],
    queryFn: async () => {
      const response = await request.get('/stats/user-growth', {
        params: { range: timeRange },
      });
      return response as UserGrowthData;
    },
  });

  // 获取设备使用情况
  const { data: deviceUsage } = useQuery<DeviceUsageData>({
    queryKey: ['stats-device-usage'],
    queryFn: async () => {
      const response = await request.get('/stats/device-usage');
      return response as DeviceUsageData;
    },
  });

  // 获取收入统计
  const { data: revenue } = useQuery<RevenueData>({
    queryKey: ['stats-revenue', timeRange],
    queryFn: async () => {
      const response = await request.get('/stats/revenue', {
        params: { range: timeRange },
      });
      return response as RevenueData;
    },
  });

  // 获取热门应用
  const { data: topApps } = useQuery<TopAppsData>({
    queryKey: ['stats-top-apps'],
    queryFn: async () => {
      const response = await request.get('/stats/top-apps', {
        params: { limit: 10 },
      });
      return response as TopAppsData;
    },
  });

  return {
    timeRange,
    setTimeRange,
    setDateRange,
    overview,
    overviewLoading,
    trends,
    trendsLoading,
    userGrowth,
    deviceUsage,
    revenue,
    topApps,
  };
};
