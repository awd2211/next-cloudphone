import request from '@/utils/request';
import type { DashboardStats } from '@/types';

// 仪表盘统计数据
export const getDashboardStats = () => {
  return request.get<DashboardStats>('/stats/dashboard');
};

// 实时在线设备数
export const getOnlineDevicesCount = () => {
  return request.get<{ count: number }>('/stats/devices/online');
};

// 今日新增用户
export const getTodayNewUsers = () => {
  return request.get<{ count: number }>('/stats/users/today');
};

// 今日收入
export const getTodayRevenue = () => {
  return request.get<{ revenue: number }>('/stats/revenue/today');
};

// 本月收入
export const getMonthRevenue = () => {
  return request.get<{ revenue: number }>('/stats/revenue/month');
};

// 设备状态分布
export const getDeviceStatusDistribution = () => {
  return request.get<{
    idle: number;
    running: number;
    stopped: number;
    error: number;
  }>('/stats/devices/distribution');
};

// 用户活跃度
export const getUserActivityStats = (days: number = 7) => {
  return request.get<{
    date: string;
    activeUsers: number;
    newUsers: number;
  }[]>('/stats/users/activity', { params: { days } });
};

// 收入趋势
export const getRevenueTrend = (days: number = 30) => {
  return request.get<{
    date: string;
    revenue: number;
    orders: number;
  }[]>('/stats/revenue/trend', { params: { days } });
};

// 用户增长统计
export const getUserGrowthStats = (days: number = 30) => {
  return request.get<{
    date: string;
    newUsers: number;
    totalUsers: number;
  }[]>('/stats/users/growth', { params: { days } });
};

// 套餐分布统计
export const getPlanDistributionStats = () => {
  return request.get<{
    planName: string;
    userCount: number;
    revenue: number;
  }[]>('/stats/plans/distribution');
};
