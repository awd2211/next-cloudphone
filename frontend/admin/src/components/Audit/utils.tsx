/**
 * Audit 模块工具函数
 */
import React from 'react';
import {
  InfoCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import type { AuditLevel, AuditAction } from '@/types';
import { LEVEL_COLOR_MAP, LEVEL_LABEL_MAP, ACTION_LABEL_MAP } from './constants';

/**
 * 获取级别颜色
 */
export const getLevelColor = (level: AuditLevel): string => {
  return LEVEL_COLOR_MAP[level] || 'default';
};

/**
 * 获取级别图标
 */
export const getLevelIcon = (level: AuditLevel): React.ReactNode => {
  const icons: Record<AuditLevel, React.ReactNode> = {
    info: <InfoCircleOutlined />,
    warning: <WarningOutlined />,
    error: <CloseCircleOutlined />,
    critical: <ExclamationCircleOutlined />,
  };
  return icons[level];
};

/**
 * 获取级别标签
 */
export const getLevelLabel = (level: AuditLevel): string => {
  return LEVEL_LABEL_MAP[level] || level;
};

/**
 * 获取操作标签
 */
export const getActionLabel = (action: AuditAction): string => {
  return ACTION_LABEL_MAP[action] || action;
};

/**
 * 获取操作分类
 */
export const getActionCategory = (action: AuditAction): string => {
  if (action.startsWith('user_') || action.startsWith('password_')) return '用户';
  if (action.startsWith('quota_')) return '配额';
  if (action.startsWith('balance_')) return '余额';
  if (action.startsWith('device_')) return '设备';
  if (action.startsWith('role_') || action.startsWith('permission_')) return '权限';
  if (action.startsWith('config_') || action.startsWith('system_')) return '系统';
  if (action.startsWith('api_')) return 'API';
  return '其他';
};
