/**
 * GPU 模块常量定义
 */

// 表格配置
export const GPU_TABLE_SCROLL_X = 1400;
export const ALLOCATION_TABLE_SCROLL_X = 1000;

// 分页配置
export const DEFAULT_PAGE_SIZE = 10;

// 状态配置
export const STATUS_CONFIG = {
  online: { color: 'success', text: '在线' },
  offline: { color: 'error', text: '离线' },
  error: { color: 'error', text: '错误' },
} as const;

// 分配模式配置
export const ALLOCATION_MODE_CONFIG = {
  exclusive: { color: 'red', text: '独占' },
  shared: { color: 'blue', text: '共享' },
  available: { color: 'green', text: '可用' },
} as const;

// 温度阈值
export const TEMP_WARNING = 70;
export const TEMP_DANGER = 80;

// 使用率阈值
export const UTILIZATION_WARNING = 80;
