/**
 * Audit 模块常量定义
 */
import type { AuditLevel, AuditAction } from '@/types';

// 默认配置
export const TABLE_SCROLL_X = 1600;

// 级别颜色映射
export const LEVEL_COLOR_MAP: Record<AuditLevel, string> = {
  info: 'blue',
  warning: 'orange',
  error: 'red',
  critical: 'purple',
};

// 级别标签映射
export const LEVEL_LABEL_MAP: Record<AuditLevel, string> = {
  info: '信息',
  warning: '警告',
  error: '错误',
  critical: '严重',
};

// 操作标签映射
export const ACTION_LABEL_MAP: Record<AuditAction, string> = {
  // 用户操作
  user_login: '用户登录',
  user_logout: '用户登出',
  user_register: '用户注册',
  user_update: '用户更新',
  user_delete: '用户删除',
  password_change: '密码修改',
  password_reset: '密码重置',
  // 配额操作
  quota_create: '配额创建',
  quota_update: '配额更新',
  quota_deduct: '配额扣除',
  quota_restore: '配额恢复',
  // 余额操作
  balance_recharge: '余额充值',
  balance_consume: '余额消费',
  balance_adjust: '余额调整',
  balance_freeze: '余额冻结',
  balance_unfreeze: '余额解冻',
  // 设备操作
  device_create: '设备创建',
  device_start: '设备启动',
  device_stop: '设备停止',
  device_delete: '设备删除',
  device_update: '设备更新',
  // 权限操作
  role_assign: '角色分配',
  role_revoke: '角色撤销',
  permission_grant: '权限授予',
  permission_revoke: '权限撤销',
  // 系统操作
  config_update: '配置更新',
  system_maintenance: '系统维护',
  // API 操作
  api_key_create: 'API密钥创建',
  api_key_revoke: 'API密钥撤销',
};
