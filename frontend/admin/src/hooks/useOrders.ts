import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import * as orderService from '@/services/order';
import type { Order, PaginationParams } from '@/types';

/**
 * Order Query Keys
 */
export const orderKeys = {
  all: ['orders'] as const,
  lists: () => [...orderKeys.all, 'list'] as const,
  list: (params?: PaginationParams) => [...orderKeys.lists(), params] as const,
  details: () => [...orderKeys.all, 'detail'] as const,
  detail: (id: string) => [...orderKeys.details(), id] as const,
  stats: () => [...orderKeys.all, 'stats'] as const,
};

/**
 * 获取订单列表
 */
export function useOrders(params?: PaginationParams) {
  return useQuery({
    queryKey: orderKeys.list(params),
    queryFn: () => orderService.getOrders(params),
    staleTime: 30 * 1000,
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
 * 获取订单统计
 */
export function useOrderStats() {
  return useQuery({
    queryKey: orderKeys.stats(),
    queryFn: () => orderService.getOrderStats(),
    staleTime: 60 * 1000,
  });
}

/**
 * 取消订单
 */
export function useCancelOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: orderService.cancelOrder,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: orderKeys.detail(id) });

      const previousOrder = queryClient.getQueryData<Order>(orderKeys.detail(id));

      if (previousOrder) {
        queryClient.setQueryData<Order>(orderKeys.detail(id), {
          ...previousOrder,
          status: 'cancelled',
        });
      }

      return { previousOrder };
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: orderKeys.stats() });
      message.success('订单已取消');
    },
    onError: (error: any, id, context) => {
      if (context?.previousOrder) {
        queryClient.setQueryData(orderKeys.detail(id), context.previousOrder);
      }
      message.error(`取消失败: ${error.response?.data?.message || error.message}`);
    },
  });
}

/**
 * 退款
 */
export function useRefundOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      orderService.refundOrder(id, reason),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: orderKeys.stats() });
      message.success('退款成功');
    },
    onError: (error: any) => {
      message.error(`退款失败: ${error.response?.data?.message || error.message}`);
    },
  });
}

/**
 * 确认订单
 */
export function useConfirmOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: orderService.confirmOrder,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: orderKeys.detail(id) });

      const previousOrder = queryClient.getQueryData<Order>(orderKeys.detail(id));

      if (previousOrder) {
        queryClient.setQueryData<Order>(orderKeys.detail(id), {
          ...previousOrder,
          status: 'confirmed',
        });
      }

      return { previousOrder };
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: orderKeys.stats() });
      message.success('订单已确认');
    },
    onError: (error: any, id, context) => {
      if (context?.previousOrder) {
        queryClient.setQueryData(orderKeys.detail(id), context.previousOrder);
      }
      message.error(`确认失败: ${error.response?.data?.message || error.message}`);
    },
  });
}
