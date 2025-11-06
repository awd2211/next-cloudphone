/**
 * 用户订单管理 React Query Hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { PaginationParams } from '@/types';
import { message } from 'antd';
import * as orderService from '@/services/order';

export const orderKeys = {
  all: ['orders'] as const,
  lists: () => [...orderKeys.all, 'list'] as const,
  list: (params: PaginationParams) => [...orderKeys.lists(), params] as const,
  details: () => [...orderKeys.all, 'detail'] as const,
  detail: (id: string) => [...orderKeys.details(), id] as const,
};

/**
 * 获取我的订单列表
 */
export function useMyOrders(params: PaginationParams) {
  return useQuery({
    queryKey: orderKeys.list(params),
    queryFn: () => orderService.getMyOrders(params),
    staleTime: 30 * 1000,
    placeholderData: (previousData) => previousData,
  });
}

/**
 * 获取订单详情
 */
export function useOrder(id: string) {
  return useQuery({
    queryKey: orderKeys.detail(id),
    queryFn: () => orderService.getOrder(id),
    enabled: !!id,
    staleTime: 30 * 1000,
  });
}

/**
 * 创建订单（购买套餐）
 */
export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (planId: string) => orderService.createOrder({ planId }),
    onSuccess: () => {
      message.success('订单创建成功');
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '订单创建失败');
    },
  });
}

/**
 * 取消订单
 */
export function useCancelOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderId: string) => orderService.cancelOrder(orderId),
    onSuccess: (_, orderId) => {
      message.success('订单已取消');
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(orderId) });
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '订单取消失败');
    },
  });
}
