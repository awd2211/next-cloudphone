/**
 * 订单管理服务 API
 * 使用 api 包装器自动解包响应
 */
import { api } from '@/utils/api';

export interface Order {
  id: string;
  userId: string;
  planId: string;
  amount: number;
  status: string;
  createdAt: string;
}

/**
 * 获取订单列表
 */
export const getOrders = (params?: any): Promise<any> =>
  api.get('/billing/orders', { params });

/**
 * 获取订单详情
 */
export const getOrderById = (id: string): Promise<Order> =>
  api.get<Order>(`/billing/orders/${id}`);

/**
 * 创建订单
 */
export const createOrder = (data: any): Promise<Order> =>
  api.post<Order>('/billing/orders', data);

/**
 * 更新订单
 */
export const updateOrder = (id: string, data: any): Promise<Order> =>
  api.put<Order>(`/billing/orders/${id}`, data);

/**
 * 删除订单
 */
export const deleteOrder = (id: string): Promise<void> =>
  api.delete<void>(`/billing/orders/${id}`);

/**
 * 获取订单详情（别名）
 */
export const getOrder = getOrderById;

/**
 * 获取订单统计
 */
export const getOrderStats = (): Promise<any> =>
  api.get('/billing/orders/stats');

/**
 * 取消订单
 */
export const cancelOrder = (id: string, reason?: string): Promise<void> =>
  api.post<void>(`/billing/orders/${id}/cancel`, { reason });

/**
 * 退款订单
 */
export const refundOrder = (id: string, amount?: number, reason?: string): Promise<void> =>
  api.post<void>(`/billing/orders/${id}/refund`, { amount, reason });

/**
 * 确认订单
 */
export const confirmOrder = (id: string): Promise<void> =>
  api.post<void>(`/billing/orders/${id}/confirm`);
