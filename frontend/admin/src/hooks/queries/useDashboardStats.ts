/**
 * Dashboard 统计数据 React Query Hooks
 *
 * 提供:
 * - 自动缓存管理
 * - 自动后台刷新
 * - Zod 运行时验证
 * - 类型安全
 *
 * @example
 * ```typescript
 * function Dashboard() {
 *   const { data, isLoading, error, refetch } = useDashboardStats();
 *
 *   if (isLoading) return <Spin />;
 *   if (error) return <ErrorAlert error={error} />;
 *
 *   return <DashboardView stats={data.data} />;
 * }
 * ```
 */

import * as statsService from '@/services/stats';
import {
  DashboardStatsSchema,
  UserGrowthStatsSchema,
  PlanDistributionStatsSchema,
  OnlineDevicesCountSchema,
  TodayNewUsersSchema,
  RevenueSchema,
  DeviceStatusDistributionSchema,
  UserActivityStatsSchema,
  RevenueTrendSchema,
} from '@/schemas/stats.schema';
import { useValidatedQuery } from './useValidatedQuery';

/**
 * Dashboard 主统计数据
 *
 * 包含: 总用户数、活跃设备、今日/本月收入、订单数等
 *
 * 缓存策略: 5分钟有效期
 */
export const useDashboardStats = () => {
  return useValidatedQuery({
    queryKey: ['stats', 'dashboard'],
    queryFn: statsService.getDashboardStats,
    schema: DashboardStatsSchema,
    // 5 分钟内认为数据是新鲜的
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * 在线设备数
 *
 * 实时性要求高,缓存时间较短
 */
export const useOnlineDevicesCount = () => {
  return useValidatedQuery({
    queryKey: ['stats', 'devices', 'online'],
    queryFn: statsService.getOnlineDevicesCount,
    schema: OnlineDevicesCountSchema,
    // 30 秒刷新一次
    staleTime: 30 * 1000,
    // 启用自动刷新 (每 30 秒)
    refetchInterval: 30 * 1000,
  });
};

/**
 * 今日新增用户
 */
export const useTodayNewUsers = () => {
  return useValidatedQuery({
    queryKey: ['stats', 'users', 'today'],
    queryFn: statsService.getTodayNewUsers,
    schema: TodayNewUsersSchema,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * 今日收入
 */
export const useTodayRevenue = () => {
  return useValidatedQuery({
    queryKey: ['stats', 'revenue', 'today'],
    queryFn: statsService.getTodayRevenue,
    schema: RevenueSchema,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * 本月收入
 */
export const useMonthRevenue = () => {
  return useValidatedQuery({
    queryKey: ['stats', 'revenue', 'month'],
    queryFn: statsService.getMonthRevenue,
    schema: RevenueSchema,
    staleTime: 10 * 60 * 1000, // 10 分钟
  });
};

/**
 * 设备状态分布
 */
export const useDeviceStatusDistribution = () => {
  return useValidatedQuery({
    queryKey: ['stats', 'devices', 'distribution'],
    queryFn: statsService.getDeviceStatusDistribution,
    schema: DeviceStatusDistributionSchema,
    staleTime: 2 * 60 * 1000, // 2 分钟
  });
};

/**
 * 用户活跃度统计
 *
 * @param days - 统计天数 (默认 7 天)
 */
export const useUserActivityStats = (days: number = 7) => {
  return useValidatedQuery({
    queryKey: ['stats', 'users', 'activity', days],
    queryFn: () => statsService.getUserActivityStats(days),
    schema: UserActivityStatsSchema,
    staleTime: 10 * 60 * 1000, // 10 分钟
  });
};

/**
 * 收入趋势
 *
 * @param days - 统计天数 (默认 30 天)
 */
export const useRevenueTrend = (days: number = 30) => {
  return useValidatedQuery({
    queryKey: ['stats', 'revenue', 'trend', days],
    queryFn: () => statsService.getRevenueTrend(days),
    schema: RevenueTrendSchema,
    staleTime: 10 * 60 * 1000,
  });
};

/**
 * 用户增长统计
 *
 * @param days - 统计天数 (默认 30 天)
 */
export const useUserGrowthStats = (days: number = 30) => {
  return useValidatedQuery({
    queryKey: ['stats', 'users', 'growth', days],
    queryFn: () => statsService.getUserGrowthStats(days),
    schema: UserGrowthStatsSchema,
    staleTime: 10 * 60 * 1000,
  });
};

/**
 * 套餐分布统计
 */
export const usePlanDistributionStats = () => {
  return useValidatedQuery({
    queryKey: ['stats', 'plans', 'distribution'],
    queryFn: statsService.getPlanDistributionStats,
    schema: PlanDistributionStatsSchema,
    staleTime: 30 * 60 * 1000, // 30 分钟
  });
};
