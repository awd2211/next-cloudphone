import request from '@/utils/request';

// ==================== 类型定义 ====================

export interface PaymentStatistics {
  overview: {
    totalTransactions: number;
    successfulTransactions: number;
    failedTransactions: number;
    refundedTransactions: number;
    successRate: string;
  };
  revenue: {
    totalRevenue: string;
    totalRefunded: string;
    netRevenue: string;
  };
  period: {
    startDate: string;
    endDate: string;
  };
}

export interface PaymentMethodStat {
  method: string;
  count: number;
  percentage: string;
  totalAmount: string;
  amountPercentage: string;
}

export interface DailyStat {
  date: string;
  totalTransactions: number;
  successfulTransactions: number;
  revenue: string;
}

export interface PaymentListParams {
  page?: number;
  limit?: number;
  status?: string;
  method?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  message?: string;
}

export interface PaymentDetail {
  id: string;
  paymentNo: string;
  orderId: string;
  userId: string;
  amount: number;
  currency: string;
  method: string;
  status: string;
  transactionId?: string;
  customerId?: string;
  paymentUrl?: string;
  clientSecret?: string;
  metadata?: any;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
  order?: any;
}

export interface RefundRequest {
  amount?: number;
  reason: string;
  adminNote?: string;
}

export interface PaymentConfig {
  enabledMethods: string[];
  enabledCurrencies: string[];
  providers: {
    [key: string]: {
      enabled: boolean;
      mode: string;
      connected: {
        success: boolean;
        message: string;
      };
    };
  };
}

// ==================== API 方法 ====================

/**
 * 获取支付统计数据
 */
export const getPaymentStatistics = (startDate?: string, endDate?: string) => {
  return request.get<PaymentStatistics>('/admin/payments/statistics', {
    params: { startDate, endDate },
  });
};

/**
 * 获取支付方式统计
 */
export const getPaymentMethodsStats = (startDate?: string, endDate?: string) => {
  return request.get<PaymentMethodStat[]>('/admin/payments/statistics/payment-methods', {
    params: { startDate, endDate },
  });
};

/**
 * 获取每日统计
 */
export const getDailyStatistics = (days: number = 30) => {
  return request.get<DailyStat[]>('/admin/payments/statistics/daily', {
    params: { days },
  });
};

/**
 * 获取所有支付记录（管理员）
 */
export const getAdminPayments = (params: PaymentListParams) => {
  return request.get<PaginatedResponse<PaymentDetail>>('/admin/payments', { params });
};

/**
 * 获取支付详情（管理员）
 */
export const getAdminPaymentDetail = (id: string) => {
  return request.get<PaymentDetail>(`/admin/payments/${id}`);
};

/**
 * 手动发起退款
 */
export const manualRefund = (paymentId: string, data: RefundRequest) => {
  return request.post(`/admin/payments/${paymentId}/refund`, data);
};

/**
 * 获取待审核退款列表
 */
export const getPendingRefunds = () => {
  return request.get<PaymentDetail[]>('/admin/payments/refunds/pending');
};

/**
 * 批准退款
 */
export const approveRefund = (paymentId: string, adminNote?: string) => {
  return request.post(`/admin/payments/refunds/${paymentId}/approve`, { adminNote });
};

/**
 * 拒绝退款
 */
export const rejectRefund = (paymentId: string, reason: string, adminNote?: string) => {
  return request.post(`/admin/payments/refunds/${paymentId}/reject`, { reason, adminNote });
};

/**
 * 获取异常支付列表
 */
export const getExceptionPayments = (page: number = 1, limit: number = 20) => {
  return request.get<PaginatedResponse<PaymentDetail>>('/admin/payments/exceptions/list', {
    params: { page, limit },
  });
};

/**
 * 手动同步支付状态
 */
export const syncPaymentStatus = (paymentId: string) => {
  return request.post(`/admin/payments/${paymentId}/sync`);
};

/**
 * 导出支付数据为 Excel
 */
export const exportPaymentsToExcel = (params: {
  startDate?: string;
  endDate?: string;
  status?: string;
  method?: string;
}) => {
  return request.get('/admin/payments/export/excel', {
    params,
    responseType: 'blob',
  });
};

/**
 * 获取支付配置
 */
export const getPaymentConfig = () => {
  return request.get<PaymentConfig>('/admin/payments/config/all');
};

/**
 * 更新支付配置
 */
export const updatePaymentConfig = (config: Partial<PaymentConfig>) => {
  return request.put('/admin/payments/config', config);
};

/**
 * 测试支付提供商连接
 */
export const testProviderConnection = (provider: string) => {
  return request.post(`/admin/payments/config/test/${provider}`);
};

/**
 * 获取 Webhook 日志
 */
export const getWebhookLogs = (params: { page?: number; limit?: number; provider?: string }) => {
  return request.get('/admin/payments/webhooks/logs', { params });
};

/**
 * 下载 Excel 文件（辅助函数）
 */
export const downloadExcelFile = async (params: {
  startDate?: string;
  endDate?: string;
  status?: string;
  method?: string;
}) => {
  try {
    const response = await exportPaymentsToExcel(params);

    // 创建 Blob
    const blob = new Blob([response as any], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    // 创建下载链接
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `payments_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(link);
    link.click();

    // 清理
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    return true;
  } catch (error) {
    console.error('下载失败:', error);
    throw error;
  }
};
