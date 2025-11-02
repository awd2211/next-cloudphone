import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import request from '@/utils/request';

export const useStatsDashboard = () => {
  const [timeRange, setTimeRange] = useState<string>('7d');
  const [dateRange, setDateRange] = useState<any>(null);

  // 获取概览统计
  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['stats-overview'],
    queryFn: async () => {
      const response = await request.get('/stats/overview');
      return response;
    },
  });

  // 获取趋势数据
  const { data: trends, isLoading: trendsLoading } = useQuery({
    queryKey: ['stats-trends', timeRange, dateRange],
    queryFn: async () => {
      const params: any = { range: timeRange };
      if (dateRange) {
        params.startDate = dateRange[0].toISOString();
        params.endDate = dateRange[1].toISOString();
      }
      const response = await request.get('/stats/trends', { params });
      return response;
    },
  });

  // 获取用户增长数据
  const { data: userGrowth } = useQuery({
    queryKey: ['stats-user-growth', timeRange],
    queryFn: async () => {
      const response = await request.get('/stats/user-growth', {
        params: { range: timeRange },
      });
      return response;
    },
  });

  // 获取设备使用情况
  const { data: deviceUsage } = useQuery({
    queryKey: ['stats-device-usage'],
    queryFn: async () => {
      const response = await request.get('/stats/device-usage');
      return response;
    },
  });

  // 获取收入统计
  const { data: revenue } = useQuery({
    queryKey: ['stats-revenue', timeRange],
    queryFn: async () => {
      const response = await request.get('/stats/revenue', {
        params: { range: timeRange },
      });
      return response;
    },
  });

  // 获取热门应用
  const { data: topApps } = useQuery({
    queryKey: ['stats-top-apps'],
    queryFn: async () => {
      const response = await request.get('/stats/top-apps', {
        params: { limit: 10 },
      });
      return response;
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
