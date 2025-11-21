import request from '@/utils/request';

/**
 * 短信服务 API (用户端)
 * 提供用户短信接收、验证码查询等功能
 */

// ==================== 类型定义 ====================

export interface SMSRecord {
  id: string;
  phone: string;
  content: string;
  sender?: string;
  provider: string;
  status: 'pending' | 'received' | 'failed' | 'expired';
  deviceId?: string;
  verificationCode?: string;
  codeType?: 'login' | 'register' | 'payment' | 'bind' | 'reset' | 'other';
  receivedAt?: string;
  expiredAt?: string;
  createdAt: string;
}

export interface SMSStats {
  totalReceived: number;
  todayReceived: number;
  thisMonthReceived: number;
  successRate: number;
}

export interface SMSListParams {
  page?: number;
  limit?: number;
  phone?: string;
  deviceId?: string;
  status?: string;
  codeType?: string;
  startDate?: string;
  endDate?: string;
}

export interface SMSListResponse {
  data: SMSRecord[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
}

export interface VerificationCode {
  id: string;
  phone: string;
  code: string;
  codeType: 'login' | 'register' | 'payment' | 'bind' | 'reset' | 'other';
  sender?: string;
  content: string;
  receivedAt: string;
  expiredAt: string;
  used: boolean;
  createdAt: string;
}

export interface SMSNumber {
  id: string;
  phone: string;
  provider: string;
  country: string;
  status: 'available' | 'in_use' | 'cooldown' | 'unavailable';
  quality: number;
  acquiredAt?: string;
  expiresAt?: string;
  createdAt: string;
}

// ==================== 短信记录 ====================

/**
 * 获取我的短信列表
 */
export const getMySMS = (params?: SMSListParams) => {
  return request.get<SMSListResponse>('/sms/my', { params });
};

/**
 * 获取短信详情
 */
export const getSMSDetail = (id: string) => {
  return request.get<SMSRecord>(`/sms/${id}`);
};

/**
 * 获取我的短信统计
 */
export const getMySMSStats = () => {
  return request.get<SMSStats>('/sms/my/stats');
};

/**
 * 删除短信记录
 */
export const deleteSMS = (id: string) => {
  return request.delete(`/sms/${id}`);
};

/**
 * 批量删除短信
 */
export const batchDeleteSMS = (ids: string[]) => {
  return request.post('/sms/batch/delete', { ids });
};

// ==================== 验证码管理 ====================

/**
 * 获取我的验证码列表
 */
export const getMyVerificationCodes = (params?: {
  page?: number;
  limit?: number;
  codeType?: string;
  phone?: string;
  unused?: boolean;
}) => {
  return request.get<{
    data: VerificationCode[];
    meta: {
      total: number;
      page: number;
      limit: number;
    };
  }>('/sms/my-codes', { params });
};

/**
 * 根据手机号查询验证码
 */
export const getVerificationCodeByPhone = (phone: string) => {
  return request.get<VerificationCode[]>(`/sms/verification-code/${phone}`);
};

/**
 * 获取最新验证码
 */
export const getLatestVerificationCode = (params?: {
  phone?: string;
  codeType?: string;
}) => {
  return request.get<VerificationCode>('/sms/latest-code', { params });
};

/**
 * 标记验证码为已使用
 */
export const markCodeAsUsed = (codeId: string) => {
  return request.post(`/sms/verification-code/${codeId}/mark-used`);
};

// ==================== 号码管理 ====================

/**
 * 获取我的号码列表
 */
export const getMyNumbers = (params?: {
  page?: number;
  limit?: number;
  status?: string;
  country?: string;
}) => {
  return request.get<{
    data: SMSNumber[];
    meta: {
      total: number;
      page: number;
      limit: number;
    };
  }>('/sms/my-numbers', { params });
};

/**
 * 获取号码详情
 */
export const getNumberDetail = (numberId: string) => {
  return request.get<SMSNumber>(`/sms/numbers/${numberId}`);
};

/**
 * 获取一个号码 (分配)
 */
export const acquireNumber = (data?: {
  country?: string;
  provider?: string;
  duration?: number; // minutes
}) => {
  return request.post<SMSNumber>('/sms/acquire-number', data);
};

/**
 * 释放号码
 */
export const releaseNumber = (numberId: string) => {
  return request.post(`/sms/numbers/${numberId}/release`);
};

/**
 * 续期号码
 */
export const renewNumber = (numberId: string, duration: number) => {
  return request.post(`/sms/numbers/${numberId}/renew`, { duration });
};

// ==================== 设备短信 ====================

/**
 * 获取设备接收的短信
 */
export const getDeviceSMS = (deviceId: string, params?: {
  startDate?: string;
  endDate?: string;
  limit?: number;
}) => {
  return request.get<SMSRecord[]>(`/sms/device/${deviceId}/messages`, { params });
};

/**
 * 获取设备的最新验证码
 */
export const getDeviceLatestCode = (deviceId: string, params?: {
  codeType?: string;
}) => {
  return request.get<VerificationCode>(`/sms/device/${deviceId}/latest-code`, { params });
};

/**
 * 获取设备绑定的号码
 */
export const getDeviceNumber = (deviceId: string) => {
  return request.get<SMSNumber>(`/sms/device/${deviceId}/number`);
};

// ==================== 产品信息 ====================

/**
 * 获取可用号码列表 (浏览购买)
 */
export const getAvailableNumbers = (params?: {
  country?: string;
  provider?: string;
  limit?: number;
}) => {
  return request.get<SMSNumber[]>('/sms/available-numbers', { params });
};

/**
 * 获取号码价格信息
 */
export const getNumberPricing = (params?: {
  country?: string;
  provider?: string;
  duration?: number;
}) => {
  return request.get<{
    basePrice: number;
    pricePerDay: number;
    currency: string;
    discounts?: Array<{
      duration: number;
      discount: number;
    }>;
  }>('/sms/pricing', { params });
};

// ==================== 使用历史 ====================

/**
 * 获取短信使用历史
 */
export const getSMSUsageHistory = (params?: {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
}) => {
  return request.get<{
    data: Array<{
      id: string;
      numberId: string;
      phone: string;
      startTime: string;
      endTime?: string;
      messagesReceived: number;
      cost: number;
      status: 'active' | 'completed' | 'expired';
    }>;
    meta: {
      total: number;
      page: number;
      limit: number;
    };
  }>('/sms/usage-history', { params });
};
