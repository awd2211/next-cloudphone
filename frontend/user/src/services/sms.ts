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
 * 后端端点: GET /sms (使用查询参数过滤)
 * 注意: 后端 SMS 服务主要用于发送，接收功能需要 sms-receive-service
 */
export const getMySMS = (params?: SMSListParams) => {
  return request.get<SMSListResponse>('/sms', { params });
};

/**
 * 获取短信详情
 * 后端端点: GET /sms/:id
 */
export const getSMSDetail = (id: string) => {
  return request.get<SMSRecord>(`/sms/${id}`);
};

/**
 * 获取我的短信统计
 * 后端端点: GET /sms/stats
 */
export const getMySMSStats = () => {
  return request.get<SMSStats>('/sms/stats');
};

/**
 * 删除短信记录
 * TODO: 后端需要添加 DELETE /sms/:id 端点
 */
export const deleteSMS = (_id: string) => {
  console.warn('deleteSMS: 后端暂未实现此端点');
  return Promise.resolve();
};

/**
 * 批量删除短信
 * TODO: 后端需要添加 POST /sms/batch/delete 端点
 */
export const batchDeleteSMS = (_ids: string[]) => {
  console.warn('batchDeleteSMS: 后端暂未实现此端点');
  return Promise.resolve();
};

// ==================== 验证码管理 ====================

/**
 * 获取我的验证码列表
 * TODO: 后端需要添加用户验证码列表端点
 */
export const getMyVerificationCodes = (params?: {
  page?: number;
  limit?: number;
  codeType?: string;
  phone?: string;
  unused?: boolean;
}) => {
  console.warn('getMyVerificationCodes: 后端暂未实现此端点');
  return Promise.resolve({
    data: [] as VerificationCode[],
    meta: { total: 0, page: params?.page || 1, limit: params?.limit || 10 },
  });
};

/**
 * 检查手机号是否有活跃验证码
 * 后端端点: GET /sms/otp/active
 */
export const getVerificationCodeByPhone = (phone: string, type?: string) => {
  return request.get<{
    phoneNumber: string;
    type: string;
    hasActive: boolean;
    remainingSeconds: number;
  }>('/sms/otp/active', { params: { phoneNumber: phone, type: type || 'login' } });
};

/**
 * 检查是否有活跃验证码
 * 后端端点: GET /sms/otp/active
 */
export const getLatestVerificationCode = (params?: {
  phone?: string;
  codeType?: string;
}) => {
  return request.get<{
    phoneNumber: string;
    type: string;
    hasActive: boolean;
    remainingSeconds: number;
  }>('/sms/otp/active', {
    params: { phoneNumber: params?.phone, type: params?.codeType || 'login' },
  });
};

/**
 * 验证验证码
 * 后端端点: POST /sms/otp/verify
 */
export const verifyCode = (phone: string, code: string, type?: string) => {
  return request.post<{
    success: boolean;
    message?: string;
  }>('/sms/otp/verify', {
    phoneNumber: phone,
    code,
    type: type || 'login',
  });
};

/**
 * 标记验证码为已使用
 * 注意: 后端使用 verify 端点会自动标记为已使用
 */
export const markCodeAsUsed = (_codeId: string) => {
  console.warn('markCodeAsUsed: 请使用 verifyCode 替代');
  return Promise.resolve();
};

// ==================== 号码管理 ====================
// 注意: 以下端点需要 sms-receive-service 后端实现

/**
 * 获取我的号码列表
 * TODO: 需要后端 sms-receive-service 实现
 */
export const getMyNumbers = (params?: {
  page?: number;
  limit?: number;
  status?: string;
  country?: string;
}) => {
  console.warn('getMyNumbers: 后端暂未实现此端点');
  return Promise.resolve({
    data: [] as SMSNumber[],
    meta: { total: 0, page: params?.page || 1, limit: params?.limit || 10 },
  });
};

/**
 * 获取号码详情
 * TODO: 需要后端 sms-receive-service 实现
 */
export const getNumberDetail = (_numberId: string): Promise<SMSNumber | null> => {
  console.warn('getNumberDetail: 后端暂未实现此端点');
  return Promise.resolve(null);
};

/**
 * 获取一个号码 (分配)
 * TODO: 需要后端 sms-receive-service 实现
 */
export const acquireNumber = (_data?: {
  country?: string;
  provider?: string;
  duration?: number; // minutes
}): Promise<SMSNumber> => {
  console.warn('acquireNumber: 后端暂未实现此端点');
  // 返回占位数据以满足类型要求
  return Promise.reject(new Error('功能暂未实现'));
};

/**
 * 释放号码
 * TODO: 需要后端 sms-receive-service 实现
 */
export const releaseNumber = (_numberId: string): Promise<void> => {
  console.warn('releaseNumber: 后端暂未实现此端点');
  return Promise.resolve();
};

/**
 * 续期号码
 * TODO: 需要后端 sms-receive-service 实现
 */
export const renewNumber = (_numberId: string, _duration: number): Promise<void> => {
  console.warn('renewNumber: 后端暂未实现此端点');
  return Promise.resolve();
};

// ==================== 设备短信 ====================
// 注意: 以下端点需要 sms-receive-service 后端实现

/**
 * 获取设备接收的短信
 * TODO: 需要后端 sms-receive-service 实现
 */
export const getDeviceSMS = (
  _deviceId: string,
  _params?: {
    startDate?: string;
    endDate?: string;
    limit?: number;
  }
): Promise<SMSRecord[]> => {
  console.warn('getDeviceSMS: 后端暂未实现此端点');
  return Promise.resolve([]);
};

/**
 * 获取设备的最新验证码
 * TODO: 需要后端 sms-receive-service 实现
 */
export const getDeviceLatestCode = (
  _deviceId: string,
  _params?: { codeType?: string }
): Promise<VerificationCode | null> => {
  console.warn('getDeviceLatestCode: 后端暂未实现此端点');
  return Promise.resolve(null);
};

/**
 * 获取设备绑定的号码
 * TODO: 需要后端 sms-receive-service 实现
 */
export const getDeviceNumber = (_deviceId: string): Promise<SMSNumber | null> => {
  console.warn('getDeviceNumber: 后端暂未实现此端点');
  return Promise.resolve(null);
};

// ==================== 产品信息 ====================
// 注意: 以下端点需要 sms-receive-service 后端实现

/**
 * 获取可用号码列表 (浏览购买)
 * TODO: 需要后端 sms-receive-service 实现
 */
export const getAvailableNumbers = (_params?: {
  country?: string;
  provider?: string;
  limit?: number;
}): Promise<SMSNumber[]> => {
  console.warn('getAvailableNumbers: 后端暂未实现此端点');
  return Promise.resolve([]);
};

/**
 * 获取号码价格信息
 * TODO: 需要后端 sms-receive-service 实现
 */
export const getNumberPricing = (_params?: {
  country?: string;
  provider?: string;
  duration?: number;
}) => {
  console.warn('getNumberPricing: 后端暂未实现此端点');
  return Promise.resolve({
    basePrice: 0,
    pricePerDay: 0,
    currency: 'CNY',
    discounts: [] as Array<{ duration: number; discount: number }>,
  });
};

// ==================== 使用历史 ====================

/**
 * 获取短信使用历史
 * TODO: 需要后端 sms-receive-service 实现
 */
export const getSMSUsageHistory = (params?: {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
}) => {
  console.warn('getSMSUsageHistory: 后端暂未实现此端点');
  return Promise.resolve({
    data: [] as Array<{
      id: string;
      numberId: string;
      phone: string;
      startTime: string;
      endTime?: string;
      messagesReceived: number;
      cost: number;
      status: 'active' | 'completed' | 'expired';
    }>,
    meta: { total: 0, page: params?.page || 1, limit: params?.limit || 10 },
  });
};

// ==================== 短信状态管理 ====================

/**
 * 标记短信为已读
 * TODO: 需要后端 sms-receive-service 实现
 */
export const markSMSAsRead = (_smsId: string): Promise<void> => {
  console.warn('markSMSAsRead: 后端暂未实现此端点');
  return Promise.resolve();
};

/**
 * 批量标记短信为已读
 * TODO: 需要后端 sms-receive-service 实现
 */
export const batchMarkAsRead = (_smsIds: string[]): Promise<void> => {
  console.warn('batchMarkAsRead: 后端暂未实现此端点');
  return Promise.resolve();
};

// ==================== 号码统计 ====================

/**
 * 号码统计数据类型
 */
export interface NumberStats {
  total: number;
  active: number;
  expired: number;
  totalMessagesReceived: number;
  totalCost: number;
}

/**
 * 获取我的号码统计
 * TODO: 需要后端 sms-receive-service 实现
 */
export const getMyNumberStats = () => {
  console.warn('getMyNumberStats: 后端暂未实现此端点');
  return Promise.resolve({
    total: 0,
    active: 0,
    expired: 0,
    totalMessagesReceived: 0,
    totalCost: 0,
  } as NumberStats);
};

// ==================== 类型别名 ====================

/**
 * PhoneNumber 类型别名（兼容旧代码）
 */
export type PhoneNumber = SMSNumber;
