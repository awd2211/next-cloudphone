import { Tag } from 'antd';
import { STATUS_CONFIG, MAX_STORAGE_SIZE } from './constants';

/**
 * 快照工具函数
 */

/**
 * 格式化文件大小
 */
export const formatSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

/**
 * 渲染快照状态标签
 */
export const renderStatus = (status: string) => {
  const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.ready;
  return (
    <Tag icon={config.icon} color={config.color}>
      {config.text}
    </Tag>
  );
};

/**
 * 计算存储使用率
 */
export const calculateStorageUsage = (totalSize: number): number => {
  if (!totalSize) return 0;
  return Math.min((totalSize / MAX_STORAGE_SIZE) * 100, 100);
};
