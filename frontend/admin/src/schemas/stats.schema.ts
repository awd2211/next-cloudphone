/**
 * Dashboard 统计数据 Zod Schemas
 *
 * 为 Dashboard API 响应提供运行时验证,确保类型安全
 */

import { z } from 'zod';

/**
 * 标准 API 响应包装
 */
const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema,
  });

// ===== Dashboard 统计数据 =====

export const DashboardStatsDataSchema = z.object({
  totalUsers: z.number().int().nonnegative(),
  activeDevices: z.number().int().nonnegative(),
  todayRevenue: z.number().nonnegative(),
  monthRevenue: z.number().nonnegative(),
  todayOrders: z.number().int().nonnegative(),
  pendingOrders: z.number().int().nonnegative(),
  lastUpdated: z.string().datetime(),
});

export const DashboardStatsSchema = ApiResponseSchema(DashboardStatsDataSchema);

export type DashboardStatsData = z.infer<typeof DashboardStatsDataSchema>;
export type DashboardStatsResponse = z.infer<typeof DashboardStatsSchema>;

// ===== 在线设备数 =====

export const OnlineDevicesCountSchema = ApiResponseSchema(
  z.object({
    count: z.number().int().nonnegative(),
  })
);

export type OnlineDevicesCountResponse = z.infer<typeof OnlineDevicesCountSchema>;

// ===== 今日新增用户 =====

export const TodayNewUsersSchema = ApiResponseSchema(
  z.object({
    count: z.number().int().nonnegative(),
  })
);

export type TodayNewUsersResponse = z.infer<typeof TodayNewUsersSchema>;

// ===== 今日/本月收入 =====

export const RevenueSchema = ApiResponseSchema(
  z.object({
    revenue: z.number().nonnegative(),
  })
);

export type RevenueResponse = z.infer<typeof RevenueSchema>;

// ===== 设备状态分布 =====

export const DeviceStatusDistributionSchema = ApiResponseSchema(
  z.object({
    idle: z.number().int().nonnegative(),
    running: z.number().int().nonnegative(),
    stopped: z.number().int().nonnegative(),
    error: z.number().int().nonnegative(),
  })
);

export type DeviceStatusDistributionResponse = z.infer<typeof DeviceStatusDistributionSchema>;

// ===== 用户活跃度 =====

export const UserActivityItemSchema = z.object({
  date: z.string(), // ISO 8601 date string
  activeUsers: z.number().int().nonnegative(),
  newUsers: z.number().int().nonnegative(),
});

export const UserActivityStatsSchema = ApiResponseSchema(z.array(UserActivityItemSchema));

export type UserActivityItem = z.infer<typeof UserActivityItemSchema>;
export type UserActivityStatsResponse = z.infer<typeof UserActivityStatsSchema>;

// ===== 收入趋势 =====

export const RevenueTrendItemSchema = z.object({
  date: z.string(),
  revenue: z.number().nonnegative(),
  orders: z.number().int().nonnegative(),
});

export const RevenueTrendSchema = ApiResponseSchema(z.array(RevenueTrendItemSchema));

export type RevenueTrendItem = z.infer<typeof RevenueTrendItemSchema>;
export type RevenueTrendResponse = z.infer<typeof RevenueTrendSchema>;

// ===== 用户增长统计 =====

export const UserGrowthItemSchema = z.object({
  date: z.string(),
  newUsers: z.number().int().nonnegative(),
  totalUsers: z.number().int().nonnegative(),
});

export const UserGrowthStatsSchema = ApiResponseSchema(z.array(UserGrowthItemSchema));

export type UserGrowthItem = z.infer<typeof UserGrowthItemSchema>;
export type UserGrowthStatsResponse = z.infer<typeof UserGrowthStatsSchema>;

// ===== 套餐分布统计 =====

export const PlanDistributionItemSchema = z.object({
  planName: z.string(),
  userCount: z.number().int().nonnegative(),
  revenue: z.number().nonnegative(),
});

export const PlanDistributionStatsSchema = ApiResponseSchema(z.array(PlanDistributionItemSchema));

export type PlanDistributionItem = z.infer<typeof PlanDistributionItemSchema>;
export type PlanDistributionStatsResponse = z.infer<typeof PlanDistributionStatsSchema>;
