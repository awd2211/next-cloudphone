import request from '@/utils/request';
import type {
  Order,
  CreateOrderDto,
  Payment,
  CreatePaymentDto,
  UsageRecord,
  PaginationParams,
  PaginatedResponse,
  UserBill,
  RevenueStats,
} from '@/types';

// ========== 订单相关 ==========

// 订单列表
export const getOrders = (params?: PaginationParams & { userId?: string; status?: string }) => {
  return request.get<PaginatedResponse<Order>>('/billing/orders', { params });
};

// 获取订单详情
export const getOrder = (id: string) => {
  return request.get<Order>(`/billing/orders/${id}`);
};

// 创建订单
export const createOrder = (data: CreateOrderDto) => {
  return request.post<Order>('/billing/orders', data);
};

// 取消订单
export const cancelOrder = (id: string, reason?: string) => {
  return request.post(`/billing/orders/${id}/cancel`, { reason });
};

// 批量取消订单
export const batchCancelOrders = (ids: string[], reason?: string) => {
  return request.post('/billing/orders/batch/cancel', { ids, reason });
};

// 订单统计
export const getOrderStats = () => {
  return request.get<{
    total: number;
    pending: number;
    paid: number;
    cancelled: number;
    refunded: number;
  }>('/billing/orders/stats');
};

// ========== 支付相关 ==========

// 支付列表
export const getPayments = (params?: PaginationParams) => {
  return request.get<PaginatedResponse<Payment>>('/payments', { params });
};

// 获取支付详情
export const getPayment = (id: string) => {
  return request.get<Payment>(`/payments/${id}`);
};

// 创建支付
export const createPayment = (data: CreatePaymentDto) => {
  return request.post<Payment>('/payments', data);
};

// 查询支付状态
export const queryPaymentStatus = (paymentNo: string) => {
  return request.post<Payment>('/payments/query', { paymentNo });
};

// 申请退款
export const refundPayment = (id: string, amount: number, reason: string) => {
  return request.post(`/payments/${id}/refund`, { amount, reason });
};

// 订单退款
export const refundOrder = (orderId: string, amount: number, reason: string) => {
  return request.post(`/billing/orders/${orderId}/refund`, { amount, reason });
};

// ========== 使用记录相关 ==========

// 使用记录列表
export const getUsageRecords = (
  params?: PaginationParams & { userId?: string; deviceId?: string }
) => {
  return request.get<PaginatedResponse<UsageRecord>>('/billing/usage', { params });
};

// 用户使用统计
export const getUserUsageStats = (userId: string, startDate?: string, endDate?: string) => {
  return request.get(`/metering/users/${userId}`, {
    params: { startDate, endDate },
  });
};

// 设备使用统计
export const getDeviceUsageStats = (deviceId: string, startDate?: string, endDate?: string) => {
  return request.get(`/metering/devices/${deviceId}`, {
    params: { startDate, endDate },
  });
};

// ========== 计量相关 ==========

// 计量概览
export const getMeteringOverview = () => {
  return request.get('/metering/overview');
};

// 用户计量列表
export const getUserMeterings = (params?: PaginationParams & { startDate?: string; endDate?: string }) => {
  return request.get('/metering/users', { params });
};

// 设备计量列表
export const getDeviceMeterings = (params?: PaginationParams & { startDate?: string; endDate?: string }) => {
  return request.get('/metering/devices', { params });
};

// 计量趋势数据
export const getMeteringTrend = (type: 'daily' | 'weekly' | 'monthly', startDate?: string, endDate?: string) => {
  return request.get('/metering/trend', {
    params: { type, startDate, endDate },
  });
};

// 资源使用分析
export const getResourceUsageAnalysis = (resourceType?: 'cpu' | 'memory' | 'storage' | 'bandwidth') => {
  return request.get('/metering/resource-analysis', {
    params: { resourceType },
  });
};

// ========== 报表相关 ==========

// 用户账单
export const getUserBill = (userId: string, startDate: string, endDate: string) => {
  return request.get<UserBill>(`/reports/bills/${userId}`, {
    params: { startDate, endDate },
  });
};

// 收入统计
export const getRevenueStats = (startDate: string, endDate: string) => {
  return request.get<{
    totalRevenue: number;
    totalOrders: number;
    avgOrderValue: number;
    dailyStats: RevenueStats[];
    planStats: {
      planId: string;
      planName: string;
      revenue: number;
      orders: number;
    }[];
  }>('/reports/revenue', {
    params: { startDate, endDate },
  });
};

// 使用趋势
export const getUsageTrend = (startDate: string, endDate: string) => {
  return request.get('/reports/usage-trend', {
    params: { startDate, endDate },
  });
};

// 导出用户账单
export const exportUserBill = (userId: string, startDate: string, endDate: string, format: 'excel' | 'csv' = 'excel') => {
  return request.get(`/reports/bills/${userId}/export`, {
    params: { startDate, endDate, format },
    responseType: 'blob',
  });
};

// 导出收入报表
export const exportRevenueReport = (startDate: string, endDate: string, format: 'excel' | 'csv' = 'excel') => {
  return request.get('/reports/revenue/export', {
    params: { startDate, endDate, format },
    responseType: 'blob',
  });
};

// ========== 计费规则相关 ==========

// 获取计费规则列表
export const getBillingRules = (params?: PaginationParams & { isActive?: boolean }) => {
  return request.get('/billing/rules', { params });
};

// 获取计费规则详情
export const getBillingRule = (id: string) => {
  return request.get(`/billing/rules/${id}`);
};

// 创建计费规则
export const createBillingRule = (data: any) => {
  return request.post('/billing/rules', data);
};

// 更新计费规则
export const updateBillingRule = (id: string, data: any) => {
  return request.put(`/billing/rules/${id}`, data);
};

// 删除计费规则
export const deleteBillingRule = (id: string) => {
  return request.delete(`/billing/rules/${id}`);
};

// 激活/停用计费规则
export const toggleBillingRule = (id: string, isActive: boolean) => {
  return request.patch(`/billing/rules/${id}/toggle`, { isActive });
};

// 测试计费规则
export const testBillingRule = (ruleId: string, testData: any) => {
  return request.post(`/billing/rules/${ruleId}/test`, testData);
};

// 获取计费规则模板
export const getBillingRuleTemplates = () => {
  return request.get('/billing/rules/templates');
};
