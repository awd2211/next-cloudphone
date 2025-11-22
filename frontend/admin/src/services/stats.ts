/**
 * 统计数据服务 API
 * 使用 api 包装器自动解包响应
 */
import { api } from '@/utils/api';
import type { DashboardStats } from '@/types';

// 仪表盘统计数据
export const getDashboardStats = (): Promise<DashboardStats> =>
  api.get<DashboardStats>('/stats/dashboard');

// 实时在线设备数
export const getOnlineDevicesCount = (): Promise<{ count: number }> =>
  api.get<{ count: number }>('/stats/devices/online');

// 今日新增用户
export const getTodayNewUsers = (): Promise<{ count: number }> =>
  api.get<{ count: number }>('/stats/users/today');

// 今日收入
export const getTodayRevenue = (): Promise<{ revenue: number }> =>
  api.get<{ revenue: number }>('/stats/revenue/today');

// 本月收入
export const getMonthRevenue = (): Promise<{ revenue: number }> =>
  api.get<{ revenue: number }>('/stats/revenue/month');

// 设备状态分布
export const getDeviceStatusDistribution = (): Promise<{
  idle: number;
  running: number;
  stopped: number;
  error: number;
}> =>
  api.get<{
    idle: number;
    running: number;
    stopped: number;
    error: number;
  }>('/stats/devices/distribution');

// 用户活跃度
export const getUserActivityStats = (days: number = 7): Promise<
  {
    date: string;
    activeUsers: number;
    newUsers: number;
  }[]
> =>
  api.get<
    {
      date: string;
      activeUsers: number;
      newUsers: number;
    }[]
  >('/stats/users/activity', { params: { days } });

// 收入趋势
export const getRevenueTrend = (days: number = 30): Promise<
  {
    date: string;
    revenue: number;
    orders: number;
  }[]
> =>
  api.get<
    {
      date: string;
      revenue: number;
      orders: number;
    }[]
  >('/stats/revenue/trend', { params: { days } });

// 用户增长统计
export const getUserGrowthStats = (days: number = 30): Promise<
  {
    date: string;
    newUsers: number;
    totalUsers: number;
  }[]
> =>
  api.get<
    {
      date: string;
      newUsers: number;
      totalUsers: number;
    }[]
  >('/stats/users/growth', { params: { days } });

// 套餐分布统计
export const getPlanDistributionStats = (): Promise<
  {
    planName: string;
    userCount: number;
    revenue: number;
  }[]
> =>
  api.get<
    {
      planName: string;
      userCount: number;
      revenue: number;
    }[]
  >('/stats/plans/distribution');
