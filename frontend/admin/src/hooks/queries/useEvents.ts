/**
 * Events React Query Hooks
 *
 * 基于 @/services/events
 * 使用 React Query + Zod 进行数据获取和验证
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import * as eventsService from '@/services/events';
import { useValidatedQuery } from './useValidatedQuery';

/**
 * Query Keys
 */
export const eventKeys = {
  all: ['events'] as const,
  userHistory: (userId: string) => [...eventKeys.all, 'user', userId, 'history'] as const,
  recentEvents: (eventType?: string, limit?: number) =>
    [...eventKeys.all, 'recent', { eventType, limit }] as const,
  stats: (eventType?: string) => [...eventKeys.all, 'stats', eventType] as const,
};

/**
 * 获取用户事件历史
 */
export const useUserEventHistory = (userId: string) => {
  return useValidatedQuery({
    queryKey: eventKeys.userHistory(userId),
    queryFn: () => eventsService.getUserEventHistory(userId).then(res => res.data),
    schema: undefined as any,
    enabled: !!userId,
  });
};

/**
 * 获取最近的事件列表
 */
export const useRecentEvents = (eventType?: string, limit: number = 50) => {
  return useQuery({
    queryKey: eventKeys.recentEvents(eventType, limit),
    queryFn: () => eventsService.getRecentEvents(eventType, limit).then(res => res.data),
  });
};

/**
 * 获取事件统计信息
 */
export const useEventStats = (eventType?: string) => {
  return useValidatedQuery({
    queryKey: eventKeys.stats(eventType),
    queryFn: () => eventsService.getEventStats(eventType).then(res => res.data),
    schema: undefined as any,
    staleTime: 60 * 1000, // 1分钟
  });
};

/**
 * 重放用户事件 Mutation
 */
export const useReplayUserEvents = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => eventsService.replayUserEvents(userId),
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: eventKeys.userHistory(userId) });
      message.success('事件重放成功');
    },
    onError: () => {
      message.error('事件重放失败');
    },
  });
};

/**
 * 重放到特定版本 Mutation
 */
export const useReplayToVersion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, version }: { userId: string; version: number }) =>
      eventsService.replayToVersion(userId, version),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: eventKeys.userHistory(userId) });
      message.success('已重放到指定版本');
    },
    onError: () => {
      message.error('重放失败');
    },
  });
};

/**
 * 时间旅行（重放到特定时间点）Mutation
 */
export const useTimeTravel = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, timestamp }: { userId: string; timestamp: string }) =>
      eventsService.timeTravel(userId, timestamp),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: eventKeys.userHistory(userId) });
      message.success('时间旅行成功');
    },
    onError: () => {
      message.error('时间旅行失败');
    },
  });
};
