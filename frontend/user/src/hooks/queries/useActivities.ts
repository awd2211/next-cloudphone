/**
 * 活动中心 React Query Hooks (用户端)
 *
 * 提供营销活动、优惠券管理、参与记录等功能
 * ✅ 使用 Zod Schema 验证 API 响应
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  Activity,
  ActivityType,
  ActivityStatus,
  Coupon,
  CouponStatus,
  Participation,
} from '@/services/activity';
import * as activityService from '@/services/activity';
import {
  handleMutationError,
  handleMutationSuccess,
} from '../utils/errorHandler';
import { StaleTimeConfig } from '../utils/cacheConfig';
import { useValidatedQuery } from '../utils/useValidatedQuery';
import { ActivitySchema, CouponSchema } from '@/schemas/api.schemas';
import { z } from 'zod';

// 活动列表响应 Schema
const ActivityListResponseSchema = z.object({
  data: z.array(ActivitySchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
});

// 参与记录 Schema
const ParticipationSchema = z.object({
  id: z.string(),
  activityId: z.string(),
  userId: z.string().optional(),
  status: z.string().optional(),
  rewards: z.array(z.string()).optional(),
  createdAt: z.string().optional(),
}).passthrough();

const ParticipationListResponseSchema = z.object({
  data: z.array(ParticipationSchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
});

// 优惠券列表响应 Schema
const CouponListResponseSchema = z.object({
  data: z.array(CouponSchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
});

// 活动统计 Schema
const ActivityStatsSchema = z.object({
  totalActivities: z.number().int().nonnegative(),
  ongoingActivities: z.number().int().nonnegative(),
  myCoupons: z.number().int().nonnegative(),
  availableCoupons: z.number().int().nonnegative(),
  totalParticipations: z.number().int().nonnegative(),
  totalRewards: z.number().nonnegative(),
});

// ==================== Query Keys ====================

export const activityKeys = {
  all: ['activities'] as const,
  lists: () => [...activityKeys.all, 'list'] as const,
  list: (params?: { type?: ActivityType; status?: ActivityStatus; page?: number; pageSize?: number }) =>
    [...activityKeys.lists(), params] as const,
  details: () => [...activityKeys.all, 'detail'] as const,
  detail: (id: string) => [...activityKeys.details(), id] as const,
  participations: (params?: any) => [...activityKeys.all, 'participations', params] as const,
  stats: () => [...activityKeys.all, 'stats'] as const,
};

export const couponKeys = {
  all: ['coupons'] as const,
  lists: () => [...couponKeys.all, 'list'] as const,
  list: (params?: { status?: CouponStatus; page?: number; pageSize?: number }) =>
    [...couponKeys.lists(), params] as const,
};

// ==================== 类型定义 ====================

export interface ActivityListResponse {
  data: Activity[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ParticipationListResponse {
  data: Participation[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CouponListResponse {
  data: Coupon[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ActivityStats {
  totalActivities: number;
  ongoingActivities: number;
  myCoupons: number;
  availableCoupons: number;
  totalParticipations: number;
  totalRewards: number;
}

// ==================== Query Hooks ====================

/**
 * 获取活动列表
 */
export const useActivities = (params?: {
  type?: ActivityType;
  status?: ActivityStatus;
  page?: number;
  pageSize?: number;
}) => {
  return useValidatedQuery<ActivityListResponse>({
    queryKey: activityKeys.list(params),
    queryFn: () => activityService.getActivities(params),
    schema: ActivityListResponseSchema,
    staleTime: StaleTimeConfig.activities, // 1分钟
    placeholderData: (previousData) => previousData,
  });
};

/**
 * 获取活动详情
 */
export const useActivityDetail = (id: string, options?: { enabled?: boolean }) => {
  return useValidatedQuery<Activity>({
    queryKey: activityKeys.detail(id),
    queryFn: () => activityService.getActivityDetail(id),
    schema: ActivitySchema,
    enabled: options?.enabled !== false && !!id,
    staleTime: StaleTimeConfig.activities,
  });
};

/**
 * 获取我的参与记录
 */
export const useMyParticipations = (params?: {
  activityId?: string;
  page?: number;
  pageSize?: number;
}) => {
  return useValidatedQuery<ParticipationListResponse>({
    queryKey: activityKeys.participations(params),
    queryFn: () => activityService.getMyParticipations(params),
    schema: ParticipationListResponseSchema,
    staleTime: StaleTimeConfig.MEDIUM, // 30秒
  });
};

/**
 * 获取我的优惠券列表
 */
export const useMyCoupons = (params?: {
  status?: CouponStatus;
  page?: number;
  pageSize?: number;
}) => {
  return useValidatedQuery<CouponListResponse>({
    queryKey: couponKeys.list(params),
    queryFn: () => activityService.getMyCoupons(params),
    schema: CouponListResponseSchema,
    staleTime: StaleTimeConfig.MEDIUM, // 30秒
    placeholderData: (previousData) => previousData,
  });
};

/**
 * 获取活动统计
 */
export const useActivityStats = () => {
  return useValidatedQuery<ActivityStats>({
    queryKey: activityKeys.stats(),
    queryFn: () => activityService.getActivityStats(),
    schema: ActivityStatsSchema,
    staleTime: StaleTimeConfig.MEDIUM, // 30秒
  });
};

// ==================== Mutation Hooks ====================

/**
 * 参与活动
 */
export const useParticipateActivity = () => {
  const queryClient = useQueryClient();

  return useMutation<
    {
      participation: Participation;
      rewards: string[];
      message: string;
    },
    unknown,
    string
  >({
    mutationFn: (activityId) => activityService.participateActivity(activityId),
    onSuccess: (result, activityId) => {
      handleMutationSuccess(result.message || '参与成功！');
      // 刷新活动详情、参与记录、统计
      queryClient.invalidateQueries({ queryKey: activityKeys.detail(activityId) });
      queryClient.invalidateQueries({ queryKey: activityKeys.participations() });
      queryClient.invalidateQueries({ queryKey: activityKeys.stats() });
    },
    onError: (error) => {
      handleMutationError(error, '参与失败');
    },
  });
};

/**
 * 领取优惠券
 */
export const useClaimCoupon = () => {
  const queryClient = useQueryClient();

  return useMutation<
    {
      coupon: Coupon;
      message: string;
    },
    unknown,
    string
  >({
    mutationFn: (activityId) => activityService.claimCoupon(activityId),
    onSuccess: (result, activityId) => {
      handleMutationSuccess(result.message || '领取成功！');
      // 刷新优惠券列表、活动详情、统计
      queryClient.invalidateQueries({ queryKey: couponKeys.lists() });
      queryClient.invalidateQueries({ queryKey: activityKeys.detail(activityId) });
      queryClient.invalidateQueries({ queryKey: activityKeys.stats() });
    },
    onError: (error) => {
      handleMutationError(error, '领取失败');
    },
  });
};

/**
 * 使用优惠券
 */
export const useUseCoupon = () => {
  const queryClient = useQueryClient();

  return useMutation<
    {
      success: boolean;
      message: string;
      discount: number;
    },
    unknown,
    { couponId: string; orderId: string }
  >({
    mutationFn: ({ couponId, orderId }) => activityService.useCoupon(couponId, orderId),
    onSuccess: (result) => {
      handleMutationSuccess(result.message || '优惠券已使用');
      // 刷新优惠券列表和统计
      queryClient.invalidateQueries({ queryKey: couponKeys.lists() });
      queryClient.invalidateQueries({ queryKey: activityKeys.stats() });
    },
    onError: (error) => {
      handleMutationError(error, '使用失败');
    },
  });
};
