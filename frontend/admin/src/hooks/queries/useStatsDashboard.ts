import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/utils/api';

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
    queryFn: () => api.get<OverviewData>('/stats/overview'),
  });

  // 获取趋势数据
  const { data: trends, isLoading: trendsLoading } = useQuery<TrendsData>({
    queryKey: ['stats-trends', timeRange, dateRange],
    queryFn: () => {
      const params: any = { range: timeRange };
      if (dateRange) {
        params.startDate = dateRange[0].toISOString();
        params.endDate = dateRange[1].toISOString();
      }
      return api.get<TrendsData>('/stats/trends', { params });
    },
  });

  // 获取用户增长数据
  const { data: userGrowth } = useQuery<UserGrowthData>({
    queryKey: ['stats-user-growth', timeRange],
    queryFn: async () => {
      // 后端路径是 /stats/users/growth，使用 days 参数
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const result = await api.get<{ data: Array<{ date: string; newUsers: number; totalUsers: number }> }>('/stats/users/growth', {
        params: { days },
      });
      // 后端返回 { data: [...] }，需要转换为前端期望的格式
      return { data: result.data || [] };
    },
  });

  // 获取设备使用情况
  const { data: deviceUsage } = useQuery<DeviceUsageData>({
    queryKey: ['stats-device-usage'],
    queryFn: () => api.get<DeviceUsageData>('/stats/device-usage'),
  });

  // 获取收入统计
  const { data: revenue } = useQuery<RevenueData>({
    queryKey: ['stats-revenue', timeRange],
    queryFn: () => api.get<RevenueData>('/stats/revenue', {
      params: { range: timeRange },
    }),
  });

  // 获取热门应用
  const { data: topApps } = useQuery<TopAppsData>({
    queryKey: ['stats-top-apps'],
    queryFn: () => api.get<TopAppsData>('/stats/top-apps', {
      params: { limit: 10 },
    }),
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
