/**
 * API 密钥模块常量定义
 */

// 表格滚动宽度
export const TABLE_SCROLL_X = 1500;

// 分页配置
export const DEFAULT_PAGE_SIZE = 10;

// 状态配置
export const STATUS_CONFIG = {
  active: { color: 'success' as const, text: '活跃' },
  inactive: { color: 'default' as const, text: '未激活' },
  expired: { color: 'error' as const, text: '已过期' },
} as const;

// 可用权限范围
export const AVAILABLE_SCOPES = [
  { value: 'devices:read', label: '设备-读取' },
  { value: 'devices:write', label: '设备-写入' },
  { value: 'users:read', label: '用户-读取' },
  { value: 'users:write', label: '用户-写入' },
  { value: 'billing:read', label: '账单-读取' },
  { value: 'billing:write', label: '账单-写入' },
  { value: 'quotas:read', label: '配额-读取' },
  { value: 'quotas:write', label: '配额-写入' },
  { value: 'admin:all', label: '管理员-全部权限' },
];

// 环境选项
export const ENVIRONMENT_OPTIONS = [
  { value: 'prod', label: '生产环境' },
  { value: 'test', label: '测试环境' },
  { value: 'dev', label: '开发环境' },
];

// 状态筛选选项
export const STATUS_FILTERS = [
  { text: '活跃', value: 'active' },
  { text: '未激活', value: 'inactive' },
  { text: '已过期', value: 'expired' },
];
