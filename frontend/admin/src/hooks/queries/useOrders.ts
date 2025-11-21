/**
 * Orders React Query Hooks
 *
 * 基于 @/services/order
 * 使用 React Query + Zod 进行数据获取和验证
 */

import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import { message } from 'antd';
import * as orderService from '@/services/order';
import { useValidatedQuery } from './useValidatedQuery';
import { OrderSchema, OrderStatsSchema } from '@/schemas/api.schemas';
import type { Order, PaginatedResponse } from '@/types';

// Re-export for convenience
export type { Order } from '@/types';

/**
 * Query Keys
 */
export const orderKeys = {
  all: ['orders'] as const,
  lists: () => [...orderKeys.all, 'list'] as const,
  list: (params?: any) => [...orderKeys.lists(), params] as const,
  details: () => [...orderKeys.all, 'detail'] as const,
  detail: (id: string) => [...orderKeys.details(), id] as const,
  stats: () => [...orderKeys.all, 'stats'] as const,
};

/**
 * 获取订单列表
 */
export const useOrders = (params?: any) => {
  return useQuery({
    queryKey: orderKeys.list(params),
    queryFn: async () => {
      const response = await orderService.getOrders(params);
      return response as PaginatedResponse<Order>;
    },
  });
};

/**
 * 获取订单详情
 */
export const useOrder = (id: string, options?: Omit<UseQueryOptions<any, Error>, 'queryKey' | 'queryFn'>) => {
  return useValidatedQuery({
    queryKey: orderKeys.detail(id),
    queryFn: () => orderService.getOrder(id),
    schema: OrderSchema,
    enabled: !!id,
    ...options,
  });
};

/**
 * 获取订单统计
 */
export const useOrderStats = () => {
  return useValidatedQuery({
    queryKey: orderKeys.stats(),
    queryFn: () => orderService.getOrderStats(),
    schema: OrderStatsSchema,
    staleTime: 60 * 1000, // 1分钟
  });
};

/**
 * 创建订单 Mutation
 */
export const useCreateOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => orderService.createOrder(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: orderKeys.stats() });
      message.success('订单创建成功');
    },
    onError: () => {
      message.error('订单创建失败');
    },
  });
};

/**
 * 更新订单 Mutation
 */
export const useUpdateOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      orderService.updateOrder(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(id) });
      message.success('订单更新成功');
    },
    onError: () => {
      message.error('订单更新失败');
    },
  });
};

/**
 * 删除订单 Mutation
 */
export const useDeleteOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => orderService.deleteOrder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: orderKeys.stats() });
      message.success('订单删除成功');
    },
    onError: () => {
      message.error('订单删除失败');
    },
  });
};

/**
 * 取消订单 Mutation
 */
export const useCancelOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      orderService.cancelOrder(id, reason),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(id) });
      message.success('订单已取消');
    },
    onError: () => {
      message.error('取消订单失败');
    },
  });
};

/**
 * 退款订单 Mutation
 */
export const useRefundOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, amount, reason }: { id: string; amount?: number; reason?: string }) =>
      orderService.refundOrder(id, amount, reason),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(id) });
      message.success('退款成功');
    },
    onError: () => {
      message.error('退款失败');
    },
  });
};

/**
 * 确认订单 Mutation
 */
export const useConfirmOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => orderService.confirmOrder(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(id) });
      message.success('订单已确认');
    },
    onError: () => {
      message.error('确认订单失败');
    },
  });
};
