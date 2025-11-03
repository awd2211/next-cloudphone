import { Tag } from 'antd';
import {
  InfoCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
import { RESOURCE_TYPE_CONFIG, METHOD_CONFIG, STATUS_CONFIG } from './constants';
import type { AuditLog } from './constants';
import type { AuditLevel, AuditAction } from '@/types';

export const getResourceTypeTag = (type: AuditLog['resourceType']) => {
  const config = RESOURCE_TYPE_CONFIG[type];
  return <Tag color={config.color}>{config.text}</Tag>;
};

export const getMethodTag = (method: AuditLog['method']) => {
  const config = METHOD_CONFIG[method];
  return <Tag color={config.color}>{config.text}</Tag>;
};

export const getStatusTag = (status: AuditLog['status']) => {
  const config = STATUS_CONFIG[status];
  return <Tag color={config.color}>{config.text}</Tag>;
};

// Level 相关工具函数
export const getLevelIcon = (level: AuditLevel | 'info' | 'warning' | 'error') => {
  const icons = {
    info: <InfoCircleOutlined />,
    warning: <WarningOutlined />,
    error: <CloseCircleOutlined />,
  };
  return icons[level as 'info' | 'warning' | 'error'] || icons.info;
};

export const getLevelColor = (level: AuditLevel | 'info' | 'warning' | 'error') => {
  const colors = {
    info: 'blue',
    warning: 'orange',
    error: 'red',
  };
  return colors[level as 'info' | 'warning' | 'error'] || 'blue';
};

export const getLevelLabel = (level: AuditLevel | 'info' | 'warning' | 'error') => {
  const labels = {
    info: '信息',
    warning: '警告',
    error: '错误',
  };
  return labels[level as 'info' | 'warning' | 'error'] || '信息';
};

// Action 相关工具函数
export const getActionLabel = (action: AuditAction | string) => {
  const labels: Record<string, string> = {
    create: '创建',
    update: '更新',
    delete: '删除',
    login: '登录',
    logout: '登出',
    view: '查看',
  };
  return labels[action] || action;
};

export const getActionCategory = (action: AuditAction | string) => {
  const categories: Record<string, string> = {
    create: '数据操作',
    update: '数据操作',
    delete: '数据操作',
    login: '身份认证',
    logout: '身份认证',
    view: '数据访问',
  };
  return categories[action] || '其他';
};
