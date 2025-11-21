/**
 * 数据导出服务 API
 *
 * ⚠️ 注意：后端暂未实现导出相关控制器
 * 所有端点返回占位数据，待后端实现后替换
 */

// 导出数据类型
export enum ExportDataType {
  ORDERS = 'orders', // 订单数据
  DEVICES = 'devices', // 设备数据
  TICKETS = 'tickets', // 工单数据
  BILLING = 'billing', // 账单数据
  USAGE = 'usage', // 使用记录
  MESSAGES = 'messages', // 消息通知
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
  PENDING = 'pending', // 等待中
  PROCESSING = 'processing', // 处理中
  COMPLETED = 'completed', // 已完成
  FAILED = 'failed', // 失败
  EXPIRED = 'expired', // 已过期
}

// 导出任务
export interface ExportTask {
  id: string;
  dataType: ExportDataType;
  format: ExportFormat;
  status: ExportStatus;
  fileName: string;
  fileSize?: number; // 文件大小（字节）
  downloadUrl?: string; // 下载链接
  recordCount?: number; // 记录数量
  filters?: Record<string, any>; // 筛选条件
  errorMessage?: string; // 错误信息
  createdAt: string;
  completedAt?: string;
  expiresAt?: string; // 过期时间
  userId: string;
}

// 导出请求参数
export interface ExportRequest {
  dataType: ExportDataType;
  format: ExportFormat;
  startDate?: string; // 开始日期
  endDate?: string; // 结束日期
  filters?: Record<string, any>; // 其他筛选条件
  columns?: string[]; // 指定导出的列
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
  totalSize: number; // 总文件大小（字节）
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
  maxRecords?: number; // 最大导出记录数
  estimatedSize?: string; // 预估大小
}

// ==================== 占位数据 ====================

const MOCK_DATA_TYPE_CONFIGS: Record<ExportDataType, DataTypeConfig> = {
  [ExportDataType.ORDERS]: {
    label: '订单数据',
    description: '导出您的所有订单记录',
    icon: 'shopping-cart',
    color: '#1890ff',
    availableFormats: [ExportFormat.CSV, ExportFormat.EXCEL, ExportFormat.PDF],
    maxRecords: 10000,
    estimatedSize: '约 1-5 MB',
  },
  [ExportDataType.DEVICES]: {
    label: '设备数据',
    description: '导出您的云手机设备信息',
    icon: 'mobile',
    color: '#52c41a',
    availableFormats: [ExportFormat.CSV, ExportFormat.EXCEL, ExportFormat.JSON],
    maxRecords: 1000,
    estimatedSize: '约 100 KB - 1 MB',
  },
  [ExportDataType.TICKETS]: {
    label: '工单数据',
    description: '导出您的客服工单记录',
    icon: 'customer-service',
    color: '#722ed1',
    availableFormats: [ExportFormat.CSV, ExportFormat.EXCEL, ExportFormat.PDF],
    maxRecords: 5000,
    estimatedSize: '约 500 KB - 2 MB',
  },
  [ExportDataType.BILLING]: {
    label: '账单数据',
    description: '导出您的账单和费用明细',
    icon: 'account-book',
    color: '#faad14',
    availableFormats: [ExportFormat.CSV, ExportFormat.EXCEL, ExportFormat.PDF],
    maxRecords: 10000,
    estimatedSize: '约 1-3 MB',
  },
  [ExportDataType.USAGE]: {
    label: '使用记录',
    description: '导出设备使用时长和资源消耗记录',
    icon: 'line-chart',
    color: '#13c2c2',
    availableFormats: [ExportFormat.CSV, ExportFormat.EXCEL],
    maxRecords: 50000,
    estimatedSize: '约 2-10 MB',
  },
  [ExportDataType.MESSAGES]: {
    label: '消息通知',
    description: '导出您收到的系统通知记录',
    icon: 'bell',
    color: '#eb2f96',
    availableFormats: [ExportFormat.CSV, ExportFormat.JSON],
    maxRecords: 10000,
    estimatedSize: '约 500 KB - 2 MB',
  },
  [ExportDataType.TRANSACTIONS]: {
    label: '交易记录',
    description: '导出充值、消费等交易流水',
    icon: 'transaction',
    color: '#fa541c',
    availableFormats: [ExportFormat.CSV, ExportFormat.EXCEL, ExportFormat.PDF],
    maxRecords: 20000,
    estimatedSize: '约 1-5 MB',
  },
};

const MOCK_EXPORT_STATS: ExportStats = {
  total: 0,
  pending: 0,
  processing: 0,
  completed: 0,
  failed: 0,
  totalSize: 0,
  byDataType: {
    [ExportDataType.ORDERS]: 0,
    [ExportDataType.DEVICES]: 0,
    [ExportDataType.TICKETS]: 0,
    [ExportDataType.BILLING]: 0,
    [ExportDataType.USAGE]: 0,
    [ExportDataType.MESSAGES]: 0,
    [ExportDataType.TRANSACTIONS]: 0,
  },
  byFormat: {
    [ExportFormat.CSV]: 0,
    [ExportFormat.EXCEL]: 0,
    [ExportFormat.PDF]: 0,
    [ExportFormat.JSON]: 0,
  },
};

// ==================== API 函数（后端未实现，返回占位数据）====================

/**
 * 创建导出任务
 * 后端暂未实现此端点
 */
export const createExportTask = (_data: ExportRequest): Promise<ExportTask> => {
  console.warn('createExportTask: 后端暂未实现此端点');
  return Promise.reject(new Error('导出功能暂未实现'));
};

/**
 * 获取导出任务列表
 * 后端暂未实现此端点
 */
export const getExportTasks = (params?: ExportTaskListQuery): Promise<ExportTaskListResponse> => {
  console.warn('getExportTasks: 后端暂未实现此端点，返回空列表');
  return Promise.resolve({
    items: [],
    total: 0,
    page: params?.page || 1,
    pageSize: params?.pageSize || 10,
  });
};

/**
 * 获取导出任务详情
 * 后端暂未实现此端点
 */
export const getExportTask = (_id: string): Promise<ExportTask> => {
  console.warn('getExportTask: 后端暂未实现此端点');
  return Promise.reject(new Error('导出功能暂未实现'));
};

/**
 * 删除导出任务
 * 后端暂未实现此端点
 */
export const deleteExportTask = (_id: string): Promise<void> => {
  console.warn('deleteExportTask: 后端暂未实现此端点');
  return Promise.resolve();
};

/**
 * 批量删除导出任务
 * 后端暂未实现此端点
 */
export const deleteExportTasks = (_ids: string[]): Promise<void> => {
  console.warn('deleteExportTasks: 后端暂未实现此端点');
  return Promise.resolve();
};

/**
 * 下载导出文件
 * 后端暂未实现此端点
 */
export const downloadExportFile = (_id: string): Promise<Blob> => {
  console.warn('downloadExportFile: 后端暂未实现此端点');
  return Promise.reject(new Error('导出功能暂未实现'));
};

/**
 * 获取导出统计
 * 后端暂未实现此端点
 */
export const getExportStats = (): Promise<ExportStats> => {
  console.warn('getExportStats: 后端暂未实现此端点，返回占位数据');
  return Promise.resolve(MOCK_EXPORT_STATS);
};

/**
 * 获取数据类型配置
 * 后端暂未实现此端点，返回本地配置
 */
export const getDataTypeConfigs = (): Promise<Record<ExportDataType, DataTypeConfig>> => {
  console.warn('getDataTypeConfigs: 后端暂未实现此端点，返回本地配置');
  return Promise.resolve(MOCK_DATA_TYPE_CONFIGS);
};

/**
 * 重试失败的导出任务
 * 后端暂未实现此端点
 */
export const retryExportTask = (_id: string): Promise<ExportTask> => {
  console.warn('retryExportTask: 后端暂未实现此端点');
  return Promise.reject(new Error('导出功能暂未实现'));
};

/**
 * 取消导出任务
 * 后端暂未实现此端点
 */
export const cancelExportTask = (_id: string): Promise<void> => {
  console.warn('cancelExportTask: 后端暂未实现此端点');
  return Promise.resolve();
};

/**
 * 清空已完成的导出任务
 * 后端暂未实现此端点
 */
export const clearCompletedTasks = (): Promise<void> => {
  console.warn('clearCompletedTasks: 后端暂未实现此端点');
  return Promise.resolve();
};

/**
 * 清空已失败的导出任务
 * 后端暂未实现此端点
 */
export const clearFailedTasks = (): Promise<void> => {
  console.warn('clearFailedTasks: 后端暂未实现此端点');
  return Promise.resolve();
};

/**
 * 获取预估导出记录数
 * 后端暂未实现此端点
 */
export const getEstimatedRecordCount = (
  _data: Omit<ExportRequest, 'format'>
): Promise<{ count: number; estimatedSize: string }> => {
  console.warn('getEstimatedRecordCount: 后端暂未实现此端点，返回占位数据');
  return Promise.resolve({
    count: 0,
    estimatedSize: '未知',
  });
};

// ==================== 工具函数（纯前端，无需后端）====================

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

/**
 * 获取导出状态的显示文本
 */
export const getExportStatusText = (status: ExportStatus): string => {
  const statusMap: Record<ExportStatus, string> = {
    [ExportStatus.PENDING]: '等待中',
    [ExportStatus.PROCESSING]: '处理中',
    [ExportStatus.COMPLETED]: '已完成',
    [ExportStatus.FAILED]: '失败',
    [ExportStatus.EXPIRED]: '已过期',
  };
  return statusMap[status] || status;
};

/**
 * 获取导出状态的颜色
 */
export const getExportStatusColor = (status: ExportStatus): string => {
  const colorMap: Record<ExportStatus, string> = {
    [ExportStatus.PENDING]: 'default',
    [ExportStatus.PROCESSING]: 'processing',
    [ExportStatus.COMPLETED]: 'success',
    [ExportStatus.FAILED]: 'error',
    [ExportStatus.EXPIRED]: 'warning',
  };
  return colorMap[status] || 'default';
};

/**
 * 获取导出格式的显示文本
 */
export const getExportFormatText = (format: ExportFormat): string => {
  const formatMap: Record<ExportFormat, string> = {
    [ExportFormat.CSV]: 'CSV 文件',
    [ExportFormat.EXCEL]: 'Excel 文件',
    [ExportFormat.PDF]: 'PDF 文件',
    [ExportFormat.JSON]: 'JSON 文件',
  };
  return formatMap[format] || format;
};

/**
 * 获取数据类型的显示文本
 */
export const getDataTypeText = (dataType: ExportDataType): string => {
  return MOCK_DATA_TYPE_CONFIGS[dataType]?.label || dataType;
};
