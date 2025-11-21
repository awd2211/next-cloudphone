/**
 * 活动中心 React Query Hooks (用户端)
 *
 * 提供营销活动、优惠券管理、参与记录等功能
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  return useQuery<{
    data: Activity[];
    total: number;
    page: number;
    pageSize: number;
  }>({
    queryKey: activityKeys.list(params),
    queryFn: () => activityService.getActivities(params),
    staleTime: StaleTimeConfig.activities, // 1分钟
    placeholderData: (previousData) => previousData,
  });
};

/**
 * 获取活动详情
 */
export const useActivityDetail = (id: string, options?: { enabled?: boolean }) => {
  return useQuery<Activity>({
    queryKey: activityKeys.detail(id),
    queryFn: () => activityService.getActivityDetail(id),
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
  return useQuery<{
    data: Participation[];
    total: number;
    page: number;
    pageSize: number;
  }>({
    queryKey: activityKeys.participations(params),
    queryFn: () => activityService.getMyParticipations(params),
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
  return useQuery<{
    data: Coupon[];
    total: number;
    page: number;
    pageSize: number;
  }>({
    queryKey: couponKeys.list(params),
    queryFn: () => activityService.getMyCoupons(params),
    staleTime: StaleTimeConfig.MEDIUM, // 30秒
    placeholderData: (previousData) => previousData,
  });
};

/**
 * 获取活动统计
 */
export const useActivityStats = () => {
  return useQuery<{
    totalActivities: number;
    ongoingActivities: number;
    myCoupons: number;
    availableCoupons: number;
    totalParticipations: number;
    totalRewards: number;
  }>({
    queryKey: activityKeys.stats(),
    queryFn: () => activityService.getActivityStats(),
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
