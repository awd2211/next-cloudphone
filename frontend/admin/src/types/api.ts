/**
 * API 类型定义 - 统一管理所有 API 相关类型
 * 这个文件提供了类型安全的 API 接口定义，替代 any 类型
 */

import { AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';

// ========== 基础响应类型 ==========

/**
 * 标准 API 响应
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  code?: number;
  timestamp?: string;
}

/**
 * 分页响应
 */
export interface PaginatedResponse<T = any> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  message?: string;
}

/**
 * 错误响应
 */
export interface ApiError {
  success: false;
  message: string;
  code: number;
  details?: Record<string, any>;
  timestamp: string;
  path?: string;
  requestId?: string;
}

// ========== 请求配置类型 ==========

/**
 * 扩展的 Axios 请求配置
 */
export interface ExtendedAxiosRequestConfig extends AxiosRequestConfig {
  /**
   * 是否启用重试
   */
  retry?: boolean | {
    count?: number;
    condition?: (error: any) => boolean;
  };

  /**
   * 是否显示错误提示
   */
  showError?: boolean;

  /**
   * 是否显示成功提示
   */
  showSuccess?: boolean;

  /**
   * 成功提示文本
   */
  successMessage?: string;

  /**
   * 请求 ID（用于日志追踪）
   */
  requestId?: string;

  /**
   * 是否启用缓存
   */
  cache?: boolean;

  /**
   * 缓存时间（毫秒）
   */
  cacheTime?: number;
}

/**
 * 内部 Axios 请求配置（带请求 ID）
 */
export interface InternalRequestConfig extends InternalAxiosRequestConfig {
  requestId?: string;
  requestStartTime?: number;
}

// ========== 分页相关类型 ==========

/**
 * 分页参数
 */
export interface PaginationParams {
  page?: number;
  pageSize?: number;
  limit?: number;
}

/**
 * 排序参数
 */
export interface SortParams {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc' | 'ascend' | 'descend';
}

/**
 * 筛选参数
 */
export type FilterParams = Record<string, any>;

/**
 * 查询参数（分页 + 排序 + 筛选）
 */
export interface QueryParams extends PaginationParams, SortParams, FilterParams {}

// ========== 批量操作类型 ==========

/**
 * 批量操作请求
 */
export interface BatchRequest<T = string> {
  ids: T[];
}

/**
 * 批量操作响应
 */
export interface BatchResponse {
  success: boolean;
  successCount: number;
  failureCount: number;
  failures?: Array<{
    id: string;
    error: string;
  }>;
}

// ========== 文件上传类型 ==========

/**
 * 文件上传响应
 */
export interface UploadResponse {
  success: boolean;
  data: {
    url: string;
    filename: string;
    size: number;
    mimeType: string;
    key?: string;
  };
}

/**
 * 多文件上传响应
 */
export interface MultiUploadResponse {
  success: boolean;
  data: Array<{
    url: string;
    filename: string;
    size: number;
    mimeType: string;
    key?: string;
  }>;
}

// ========== 搜索相关类型 ==========

/**
 * 搜索请求
 */
export interface SearchRequest extends PaginationParams {
  keyword?: string;
  filters?: FilterParams;
  sort?: SortParams;
}

/**
 * 搜索响应
 */
export interface SearchResponse<T = any> extends PaginatedResponse<T> {
  keyword?: string;
  suggestions?: string[];
}

// ========== 统计相关类型 ==========

/**
 * 统计数据
 */
export interface StatsData {
  [key: string]: number | string | boolean | null;
}

/**
 * 时间序列数据点
 */
export interface TimeSeriesDataPoint {
  timestamp: string;
  value: number;
  label?: string;
}

/**
 * 时间序列数据
 */
export interface TimeSeriesData {
  data: TimeSeriesDataPoint[];
  total?: number;
  average?: number;
  max?: number;
  min?: number;
}

// ========== WebSocket 消息类型 ==========

/**
 * WebSocket 消息
 */
export interface WebSocketMessage<T = any> {
  type: string;
  data: T;
  timestamp: string;
  id?: string;
}

/**
 * WebSocket 错误消息
 */
export interface WebSocketError {
  type: 'error';
  error: string;
  code?: number;
  timestamp: string;
}

// ========== 导出配置类型 ==========

/**
 * 导出请求
 */
export interface ExportRequest {
  format: 'csv' | 'xlsx' | 'json';
  filters?: FilterParams;
  columns?: string[];
  filename?: string;
}

/**
 * 导出响应
 */
export interface ExportResponse {
  success: boolean;
  data: {
    downloadUrl: string;
    filename: string;
    size: number;
    expiresAt: string;
  };
}

// ========== 类型守卫 ==========

/**
 * 检查是否为成功响应
 * @deprecated 使用 api 包装器时，错误会抛出异常，不需要手动检查
 *
 * 兼容新旧两种响应格式：
 * - 旧格式：{ success: true, data: T }
 * - 新格式：直接返回 T（ActionResult 除外）
 */
export function isSuccessResponse<T>(response: ApiResponse<T> | any): response is ApiResponse<T> & { data: T } {
  if (response && typeof response === 'object' && 'success' in response) {
    return response.success === true && response.data !== undefined;
  }
  // 新格式：无 success 字段，直接返回数据视为成功
  return response !== undefined && response !== null;
}

/**
 * 检查是否为错误响应
 * @deprecated 使用 api 包装器时，错误会抛出异常
 */
export function isErrorResponse(response: ApiResponse | ApiError | any): response is ApiError {
  return response && typeof response === 'object' && 'success' in response && response.success === false;
}

/**
 * 检查是否为分页响应
 */
export function isPaginatedResponse<T>(response: any): response is PaginatedResponse<T> {
  return (
    response &&
    typeof response === 'object' &&
    'success' in response &&
    'data' in response &&
    Array.isArray(response.data) &&
    'total' in response &&
    'page' in response &&
    'pageSize' in response
  );
}

// ========== 常用状态类型 ==========

/**
 * 通用状态枚举
 */
export type Status = 'pending' | 'active' | 'inactive' | 'deleted' | 'archived';

/**
 * 审批状态
 */
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

/**
 * 支付状态
 */
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';

/**
 * 订单状态
 */
export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'completed' | 'cancelled';

/**
 * 设备状态
 */
export type DeviceStatus = 'creating' | 'running' | 'stopped' | 'error' | 'deleting';

// ========== 日期时间类型 ==========

/**
 * 日期范围
 */
export interface DateRange {
  startDate: string;
  endDate: string;
}

/**
 * 时间段
 */
export type TimePeriod = 'today' | 'yesterday' | 'last7days' | 'last30days' | 'thisMonth' | 'lastMonth' | 'custom';

// ========== ID 类型 ==========

/**
 * 用户 ID
 */
export type UserId = string;

/**
 * 设备 ID
 */
export type DeviceId = string;

/**
 * 角色 ID
 */
export type RoleId = string;

/**
 * 权限 ID
 */
export type PermissionId = string;

// ========== 辅助类型 ==========

/**
 * 使某些字段可选
 */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * 使某些字段必需
 */
export type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

/**
 * 递归 Partial
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * 递归 Required
 */
export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P];
};
