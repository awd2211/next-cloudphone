/**
 * 用户订单管理 React Query Hooks
 *
 * ✅ 统一使用 const 箭头函数风格
 * ✅ 使用类型化的错误处理
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { PaginationParams } from '@/types';
import * as orderService from '@/services/order';
import {
  handleMutationError,
  handleMutationSuccess,
} from '../utils/errorHandler';
import { StaleTimeConfig } from '../utils/cacheConfig';

// ==================== Query Keys ====================

export const orderKeys = {
  all: ['orders'] as const,
  lists: () => [...orderKeys.all, 'list'] as const,
  list: (params: PaginationParams) => [...orderKeys.lists(), params] as const,
  details: () => [...orderKeys.all, 'detail'] as const,
  detail: (id: string) => [...orderKeys.details(), id] as const,
};

// ==================== Query Hooks ====================

/**
 * 获取我的订单列表
 */
export const useMyOrders = (params: PaginationParams) => {
  return useQuery({
    queryKey: orderKeys.list(params),
    queryFn: () => orderService.getMyOrders(params),
    staleTime: StaleTimeConfig.orders,
    placeholderData: (previousData) => previousData,
  });
};

/**
 * 获取订单详情
 */
export const useOrder = (id: string, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: orderKeys.detail(id),
    queryFn: () => orderService.getOrder(id),
    enabled: options?.enabled !== false && !!id,
    staleTime: StaleTimeConfig.orderDetail,
  });
};

// ==================== Mutation Hooks ====================

/**
 * 创建订单（购买套餐）
 */
export const useCreateOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (planId: string) => orderService.createOrder({ planId }),
    onSuccess: () => {
      handleMutationSuccess('订单创建成功');
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
    },
    onError: (error: Error) => {
      handleMutationError(error, '订单创建失败');
    },
  });
};

/**
 * 取消订单
 */
export const useCancelOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderId: string) => orderService.cancelOrder(orderId),
    onSuccess: (_: void, orderId: string) => {
      handleMutationSuccess('订单已取消');
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(orderId) });
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
    },
    onError: (error: Error) => {
      handleMutationError(error, '订单取消失败');
    },
  });
};
