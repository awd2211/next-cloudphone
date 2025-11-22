/**
 * Stats React Query Hooks
 *
 * 基于 @/services/stats
 * 使用 React Query + Zod 进行数据获取和验证
 */

import { useQuery } from '@tanstack/react-query';
import * as statsService from '@/services/stats';
import { useValidatedQuery } from '../utils/useValidatedQuery';

/**
 * Query Keys
 */
export const statsKeys = {
  all: ['stats'] as const,
  dashboard: () => [...statsKeys.all, 'dashboard'] as const,
  onlineDevices: () => [...statsKeys.all, 'devices', 'online'] as const,
  todayNewUsers: () => [...statsKeys.all, 'users', 'today'] as const,
  todayRevenue: () => [...statsKeys.all, 'revenue', 'today'] as const,
  monthRevenue: () => [...statsKeys.all, 'revenue', 'month'] as const,
  deviceDistribution: () => [...statsKeys.all, 'devices', 'distribution'] as const,
  userActivity: (days: number) => [...statsKeys.all, 'users', 'activity', days] as const,
  revenueTrend: (days: number) => [...statsKeys.all, 'revenue', 'trend', days] as const,
  userGrowth: (days: number) => [...statsKeys.all, 'users', 'growth', days] as const,
  planDistribution: () => [...statsKeys.all, 'plans', 'distribution'] as const,
};

/**
 * 获取仪表盘统计数据
 */
export const useDashboardStats = () => {
  return useValidatedQuery({
    queryKey: statsKeys.dashboard(),
    queryFn: () => statsService.getDashboardStats(),
    schema: undefined as any,
    staleTime: 30 * 1000, // 30秒
    refetchInterval: 60 * 1000, // 每分钟自动刷新
  });
};

/**
 * 获取实时在线设备数
 */
export const useOnlineDevicesCount = () => {
  return useQuery({
    queryKey: statsKeys.onlineDevices(),
    queryFn: () => statsService.getOnlineDevicesCount(),
    staleTime: 10 * 1000, // 10秒
    refetchInterval: 30 * 1000, // 每30秒自动刷新
  });
};

/**
 * 获取今日新增用户
 */
export const useTodayNewUsers = () => {
  return useQuery({
    queryKey: statsKeys.todayNewUsers(),
    queryFn: () => statsService.getTodayNewUsers(),
    staleTime: 60 * 1000, // 1分钟
  });
};

/**
 * 获取今日收入
 */
export const useTodayRevenue = () => {
  return useQuery({
    queryKey: statsKeys.todayRevenue(),
    queryFn: () => statsService.getTodayRevenue(),
    staleTime: 60 * 1000, // 1分钟
  });
};

/**
 * 获取本月收入
 */
export const useMonthRevenue = () => {
  return useQuery({
    queryKey: statsKeys.monthRevenue(),
    queryFn: () => statsService.getMonthRevenue(),
    staleTime: 5 * 60 * 1000, // 5分钟
  });
};

/**
 * 获取设备状态分布
 */
export const useDeviceStatusDistribution = () => {
  return useQuery({
    queryKey: statsKeys.deviceDistribution(),
    queryFn: () => statsService.getDeviceStatusDistribution(),
    staleTime: 30 * 1000, // 30秒
  });
};

/**
 * 获取用户活跃度
 */
export const useUserActivityStats = (days: number = 7) => {
  return useQuery({
    queryKey: statsKeys.userActivity(days),
    queryFn: () => statsService.getUserActivityStats(days),
    staleTime: 60 * 1000, // 1分钟
  });
};

/**
 * 获取收入趋势
 */
export const useRevenueTrend = (days: number = 30) => {
  return useQuery({
    queryKey: statsKeys.revenueTrend(days),
    queryFn: () => statsService.getRevenueTrend(days),
    staleTime: 60 * 1000, // 1分钟
  });
};

/**
 * 获取用户增长统计
 */
export const useUserGrowthStats = (days: number = 30) => {
  return useQuery({
    queryKey: statsKeys.userGrowth(days),
    queryFn: () => statsService.getUserGrowthStats(days),
    staleTime: 60 * 1000, // 1分钟
  });
};

/**
 * 获取套餐分布统计
 */
export const usePlanDistributionStats = () => {
  return useQuery({
    queryKey: statsKeys.planDistribution(),
    queryFn: () => statsService.getPlanDistributionStats(),
    staleTime: 5 * 60 * 1000, // 5分钟
  });
};
