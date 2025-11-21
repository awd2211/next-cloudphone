import request from '@/utils/request';
import type {
  Order,
  CreateOrderDto,
  Payment,
  CreatePaymentDto,
  PaginationParams,
  PaginatedResponse,
} from '@/types';

// 创建订单
export const createOrder = (data: CreateOrderDto) => {
  return request.post<Order>('/billing/orders', data);
};

// 获取我的订单列表
// 后端使用 /billing/orders/:userId 而不是 /billing/orders/my
export const getMyOrders = (params?: PaginationParams) => {
  const userId = localStorage.getItem('userId') || '';
  if (!userId) {
    return Promise.resolve({ data: [], total: 0, page: 1, pageSize: 10 } as PaginatedResponse<Order>);
  }
  return request.get<PaginatedResponse<Order>>(`/billing/orders/${userId}`, { params });
};

// 获取订单详情
export const getOrder = (id: string) => {
  return request.get<Order>(`/billing/orders/${id}`);
};

// 取消订单
export const cancelOrder = (id: string) => {
  return request.post(`/billing/orders/${id}/cancel`);
};

// 创建支付
export const createPayment = (data: CreatePaymentDto) => {
  return request.post<Payment>('/payments', data);
};

// 查询支付状态
export const queryPaymentStatus = (paymentNo: string) => {
  return request.post<Payment>('/payments/query', { paymentNo });
};

// 获取支付详情
export const getPayment = (id: string) => {
  return request.get<Payment>(`/payments/${id}`);
};

// 获取使用记录
// 后端使用 /billing/usage/:userId 而不是 /billing/usage/my
export const getUsageRecords = (
  params?: PaginationParams & { startDate?: string; endDate?: string }
) => {
  const userId = localStorage.getItem('userId') || '';
  if (!userId) {
    return Promise.resolve({ data: [], total: 0, page: 1, pageSize: 10 } as PaginatedResponse<any>);
  }
  return request.get<PaginatedResponse<any>>(`/billing/usage/${userId}`, { params });
};
