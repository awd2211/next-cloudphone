/**
 * API 密钥模块工具函数
 */
import { Tag } from 'antd';
import { STATUS_CONFIG } from './constants';

export type ApiKeyStatus = 'active' | 'inactive' | 'expired';

/**
 * 获取状态标签
 */
export const getStatusTag = (status: ApiKeyStatus) => {
  const config = STATUS_CONFIG[status];
  return <Tag color={config.color}>{config.text}</Tag>;
};

/**
 * 格式化使用次数
 */
export const formatUsageCount = (count: number): string => {
  if (count >= 10000) {
    return `${(count / 10000).toFixed(1)}万`;
  }
  return count.toLocaleString();
};

/**
 * 掩码 Secret Key
 */
export const maskSecret = (secret: string, isVisible: boolean): string => {
  if (isVisible) return secret;
  return secret.substring(0, 12) + '*********************';
};
