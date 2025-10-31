import request from '@/utils/request';

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
export const getOrders = (params?: any) => {
  return request.get('/billing/orders', { params });
};

/**
 * 获取订单详情
 */
export const getOrderById = (id: string) => {
  return request.get(`/billing/orders/${id}`);
};

/**
 * 创建订单
 */
export const createOrder = (data: any) => {
  return request.post('/billing/orders', data);
};

/**
 * 更新订单
 */
export const updateOrder = (id: string, data: any) => {
  return request.put(`/billing/orders/${id}`, data);
};

/**
 * 删除订单
 */
export const deleteOrder = (id: string) => {
  return request.delete(`/billing/orders/${id}`);
};
