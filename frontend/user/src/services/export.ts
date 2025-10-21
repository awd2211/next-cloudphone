import request from '@/utils/request';

// 导出数据类型
export enum ExportDataType {
  ORDERS = 'orders',           // 订单数据
  DEVICES = 'devices',         // 设备数据
  TICKETS = 'tickets',         // 工单数据
  BILLING = 'billing',         // 账单数据
  USAGE = 'usage',             // 使用记录
  MESSAGES = 'messages',       // 消息通知
  TRANSACTIONS = 'transactions', // 交易记录
}

// 导出格式
export enum ExportFormat {
  CSV = 'csv',
  EXCEL = 'excel',
  PDF = 'pdf',
  JSON = 'json',
}

// 导出状态
export enum ExportStatus {
  PENDING = 'pending',       // 等待中
  PROCESSING = 'processing', // 处理中
  COMPLETED = 'completed',   // 已完成
  FAILED = 'failed',         // 失败
  EXPIRED = 'expired',       // 已过期
}

// 导出任务
export interface ExportTask {
  id: string;
  dataType: ExportDataType;
  format: ExportFormat;
  status: ExportStatus;
  fileName: string;
  fileSize?: number;        // 文件大小（字节）
  downloadUrl?: string;     // 下载链接
  recordCount?: number;     // 记录数量
  filters?: Record<string, any>; // 筛选条件
  errorMessage?: string;    // 错误信息
  createdAt: string;
  completedAt?: string;
  expiresAt?: string;       // 过期时间
  userId: string;
}

// 导出请求参数
export interface ExportRequest {
  dataType: ExportDataType;
  format: ExportFormat;
  startDate?: string;       // 开始日期
  endDate?: string;         // 结束日期
  filters?: Record<string, any>; // 其他筛选条件
  columns?: string[];       // 指定导出的列
}

// 导出任务列表查询参数
export interface ExportTaskListQuery {
  page?: number;
  pageSize?: number;
  dataType?: ExportDataType;
  status?: ExportStatus;
  startDate?: string;
  endDate?: string;
}

// 导出任务列表响应
export interface ExportTaskListResponse {
  items: ExportTask[];
  total: number;
  page: number;
  pageSize: number;
}

// 导出统计
export interface ExportStats {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  totalSize: number;        // 总文件大小（字节）
  byDataType: Record<ExportDataType, number>;
  byFormat: Record<ExportFormat, number>;
}

// 数据类型配置
export interface DataTypeConfig {
  label: string;
  description: string;
  icon: string;
  color: string;
  availableFormats: ExportFormat[];
  maxRecords?: number;      // 最大导出记录数
  estimatedSize?: string;   // 预估大小
}

/**
 * 创建导出任务
 */
export const createExportTask = (data: ExportRequest): Promise<ExportTask> => {
  return request({
    url: '/export/tasks',
    method: 'POST',
    data,
  });
};

/**
 * 获取导出任务列表
 */
export const getExportTasks = (params?: ExportTaskListQuery): Promise<ExportTaskListResponse> => {
  return request({
    url: '/export/tasks',
    method: 'GET',
    params,
  });
};

/**
 * 获取导出任务详情
 */
export const getExportTask = (id: string): Promise<ExportTask> => {
  return request({
    url: `/export/tasks/${id}`,
    method: 'GET',
  });
};

/**
 * 删除导出任务
 */
export const deleteExportTask = (id: string): Promise<void> => {
  return request({
    url: `/export/tasks/${id}`,
    method: 'DELETE',
  });
};

/**
 * 批量删除导出任务
 */
export const deleteExportTasks = (ids: string[]): Promise<void> => {
  return request({
    url: '/export/tasks/batch-delete',
    method: 'POST',
    data: { ids },
  });
};

/**
 * 下载导出文件
 */
export const downloadExportFile = (id: string): Promise<Blob> => {
  return request({
    url: `/export/tasks/${id}/download`,
    method: 'GET',
    responseType: 'blob',
  });
};

/**
 * 获取导出统计
 */
export const getExportStats = (): Promise<ExportStats> => {
  return request({
    url: '/export/stats',
    method: 'GET',
  });
};

/**
 * 获取数据类型配置
 */
export const getDataTypeConfigs = (): Promise<Record<ExportDataType, DataTypeConfig>> => {
  return request({
    url: '/export/data-types',
    method: 'GET',
  });
};

/**
 * 重试失败的导出任务
 */
export const retryExportTask = (id: string): Promise<ExportTask> => {
  return request({
    url: `/export/tasks/${id}/retry`,
    method: 'POST',
  });
};

/**
 * 取消导出任务
 */
export const cancelExportTask = (id: string): Promise<void> => {
  return request({
    url: `/export/tasks/${id}/cancel`,
    method: 'POST',
  });
};

/**
 * 清空已完成的导出任务
 */
export const clearCompletedTasks = (): Promise<void> => {
  return request({
    url: '/export/tasks/clear-completed',
    method: 'POST',
  });
};

/**
 * 清空已失败的导出任务
 */
export const clearFailedTasks = (): Promise<void> => {
  return request({
    url: '/export/tasks/clear-failed',
    method: 'POST',
  });
};

/**
 * 获取预估导出记录数
 */
export const getEstimatedRecordCount = (data: Omit<ExportRequest, 'format'>): Promise<{ count: number; estimatedSize: string }> => {
  return request({
    url: '/export/estimate',
    method: 'POST',
    data,
  });
};

/**
 * 文件大小格式化
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
};

/**
 * 下载文件（触发浏览器下载）
 */
export const triggerDownload = (blob: Blob, fileName: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};
