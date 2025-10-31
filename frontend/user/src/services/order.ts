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
export const getMyOrders = (params?: PaginationParams) => {
  return request.get<PaginatedResponse<Order>>('/billing/orders/my', { params });
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
export const getUsageRecords = (
  params?: PaginationParams & { startDate?: string; endDate?: string }
) => {
  return request.get<PaginatedResponse<any>>('/billing/usage/my', { params });
};
