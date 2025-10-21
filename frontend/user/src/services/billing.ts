import request from '@/utils/request';

// 账单类型
export enum BillType {
  SUBSCRIPTION = 'subscription',   // 订阅费
  USAGE = 'usage',                 // 使用费
  RECHARGE = 'recharge',           // 充值
  REFUND = 'refund',               // 退款
  PENALTY = 'penalty',             // 违约金
  DISCOUNT = 'discount',           // 折扣
  COUPON = 'coupon',               // 优惠券
  COMMISSION = 'commission',       // 佣金
}

// 账单状态
export enum BillStatus {
  PENDING = 'pending',             // 待支付
  PAID = 'paid',                   // 已支付
  CANCELLED = 'cancelled',         // 已取消
  REFUNDED = 'refunded',           // 已退款
  OVERDUE = 'overdue',             // 已逾期
  PARTIAL = 'partial',             // 部分支付
}

// 支付方式
export enum PaymentMethod {
  BALANCE = 'balance',             // 余额支付
  ALIPAY = 'alipay',               // 支付宝
  WECHAT = 'wechat',               // 微信支付
  CREDIT_CARD = 'credit_card',     // 信用卡
  PAYPAL = 'paypal',               // PayPal
}

// 账单周期
export enum BillingCycle {
  DAILY = 'daily',                 // 按日
  WEEKLY = 'weekly',               // 按周
  MONTHLY = 'monthly',             // 按月
  QUARTERLY = 'quarterly',         // 按季度
  YEARLY = 'yearly',               // 按年
  ONE_TIME = 'one_time',           // 一次性
}

// 账单项
export interface BillItem {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  discount?: number;
  tax?: number;
  metadata?: Record<string, any>;
}

// 账单
export interface Bill {
  id: string;
  billNo: string;                  // 账单号
  type: BillType;
  status: BillStatus;
  cycle: BillingCycle;
  userId: string;
  amount: number;                  // 总金额
  paidAmount?: number;             // 已支付金额
  discountAmount?: number;         // 折扣金额
  taxAmount?: number;              // 税额
  finalAmount: number;             // 实付金额
  items: BillItem[];               // 账单项
  paymentMethod?: PaymentMethod;
  paidAt?: string;                 // 支付时间
  dueDate?: string;                // 到期时间
  periodStart?: string;            // 账期开始
  periodEnd?: string;              // 账期结束
  description?: string;
  remark?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

// 账单列表查询参数
export interface BillListQuery {
  page?: number;
  pageSize?: number;
  type?: BillType;
  status?: BillStatus;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
  keyword?: string;
}

// 账单列表响应
export interface BillListResponse {
  items: Bill[];
  total: number;
  page: number;
  pageSize: number;
}

// 账单统计
export interface BillStats {
  total: number;                   // 总账单数
  totalAmount: number;             // 总金额
  paidAmount: number;              // 已支付金额
  unpaidAmount: number;            // 未支付金额
  overdueAmount: number;           // 逾期金额
  refundedAmount: number;          // 已退款金额
  byType: Record<BillType, { count: number; amount: number }>;
  byStatus: Record<BillStatus, { count: number; amount: number }>;
  byCycle: Record<BillingCycle, { count: number; amount: number }>;
  monthlyTrend: Array<{ month: string; amount: number; count: number }>;
}

// 支付请求
export interface PaymentRequest {
  billId: string;
  paymentMethod: PaymentMethod;
  amount?: number;                 // 部分支付金额
}

// 支付结果
export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  redirectUrl?: string;            // 第三方支付跳转链接
  message?: string;
}

// 发票信息
export interface Invoice {
  id: string;
  billId: string;
  invoiceNo: string;
  type: 'personal' | 'company';
  title: string;
  taxId?: string;                  // 税号
  amount: number;
  status: 'pending' | 'issued' | 'rejected';
  issuedAt?: string;
  downloadUrl?: string;
  createdAt: string;
}

// 发票申请
export interface InvoiceRequest {
  billId: string;
  type: 'personal' | 'company';
  title: string;
  taxId?: string;
  email: string;
  address?: string;
  phone?: string;
}

/**
 * 获取账单列表
 */
export const getBills = (params?: BillListQuery): Promise<BillListResponse> => {
  return request({
    url: '/billing/bills',
    method: 'GET',
    params,
  });
};

/**
 * 获取账单详情
 */
export const getBillDetail = (id: string): Promise<Bill> => {
  return request({
    url: `/billing/bills/${id}`,
    method: 'GET',
  });
};

/**
 * 获取账单统计
 */
export const getBillStats = (params?: { startDate?: string; endDate?: string }): Promise<BillStats> => {
  return request({
    url: '/billing/stats',
    method: 'GET',
    params,
  });
};

/**
 * 支付账单
 */
export const payBill = (data: PaymentRequest): Promise<PaymentResult> => {
  return request({
    url: '/billing/pay',
    method: 'POST',
    data,
  });
};

/**
 * 取消账单
 */
export const cancelBill = (id: string): Promise<void> => {
  return request({
    url: `/billing/bills/${id}/cancel`,
    method: 'POST',
  });
};

/**
 * 申请退款
 */
export const requestRefund = (id: string, reason: string): Promise<void> => {
  return request({
    url: `/billing/bills/${id}/refund`,
    method: 'POST',
    data: { reason },
  });
};

/**
 * 下载账单
 */
export const downloadBill = (id: string): Promise<Blob> => {
  return request({
    url: `/billing/bills/${id}/download`,
    method: 'GET',
    responseType: 'blob',
  });
};

/**
 * 申请发票
 */
export const applyInvoice = (data: InvoiceRequest): Promise<Invoice> => {
  return request({
    url: '/billing/invoices',
    method: 'POST',
    data,
  });
};

/**
 * 获取发票列表
 */
export const getInvoices = (params?: { page?: number; pageSize?: number }): Promise<{ items: Invoice[]; total: number }> => {
  return request({
    url: '/billing/invoices',
    method: 'GET',
    params,
  });
};

/**
 * 下载发票
 */
export const downloadInvoice = (id: string): Promise<Blob> => {
  return request({
    url: `/billing/invoices/${id}/download`,
    method: 'GET',
    responseType: 'blob',
  });
};

/**
 * 获取支付方式列表
 */
export const getPaymentMethods = (): Promise<Array<{ method: PaymentMethod; enabled: boolean; icon: string; name: string }>> => {
  return request({
    url: '/billing/payment-methods',
    method: 'GET',
  });
};

/**
 * 格式化金额
 */
export const formatAmount = (amount: number, currency: string = 'CNY'): string => {
  const currencySymbols: Record<string, string> = {
    CNY: '¥',
    USD: '$',
    EUR: '€',
    GBP: '£',
  };

  const symbol = currencySymbols[currency] || currency;
  return `${symbol}${amount.toFixed(2)}`;
};

/**
 * 格式化账单周期
 */
export const formatBillingCycle = (cycle: BillingCycle): string => {
  const cycleLabels: Record<BillingCycle, string> = {
    [BillingCycle.DAILY]: '按日',
    [BillingCycle.WEEKLY]: '按周',
    [BillingCycle.MONTHLY]: '按月',
    [BillingCycle.QUARTERLY]: '按季度',
    [BillingCycle.YEARLY]: '按年',
    [BillingCycle.ONE_TIME]: '一次性',
  };

  return cycleLabels[cycle] || cycle;
};
