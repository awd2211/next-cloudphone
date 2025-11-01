/**
 * 用户模块常量定义
 */

// 用户状态选项
export const USER_STATUS_OPTIONS = [
  { label: '活跃', value: 'active' },
  { label: '禁用', value: 'inactive' },
  { label: '封禁', value: 'banned' },
] as const;

// 默认分页配置
export const DEFAULT_PAGE_SIZE = 10;
export const DEFAULT_PAGE = 1;

// 表格配置
export const TABLE_SCROLL_X = 1200;

// 余额操作类型
export const BALANCE_OPERATION_TYPES = {
  RECHARGE: 'recharge',
  DEDUCT: 'deduct',
} as const;

// 导出/导入相关
export const EXPORT_FILENAME_PREFIX = 'users_export_';
export const IMPORT_TEMPLATE_FILENAME = 'users_import_template.xlsx';

// 表单验证规则
export const VALIDATION_RULES = {
  USERNAME: {
    required: true,
    message: '请输入用户名',
    min: 3,
    max: 20,
  },
  EMAIL: {
    required: true,
    type: 'email' as const,
    message: '请输入有效的邮箱地址',
  },
  PASSWORD: {
    required: true,
    message: '请输入密码',
    min: 6,
    max: 20,
  },
  PHONE: {
    pattern: /^1[3-9]\d{9}$/,
    message: '请输入有效的手机号',
  },
} as const;
