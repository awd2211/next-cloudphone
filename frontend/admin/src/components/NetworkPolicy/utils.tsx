import React from 'react';
import { Tag } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { DIRECTION_CONFIG } from './constants';

/**
 * 获取方向标签
 */
export const getDirectionTag = (direction: string): React.ReactNode => {
  const config = DIRECTION_CONFIG[direction] || DIRECTION_CONFIG.both;
  return <Tag color={config?.color}>{config?.text}</Tag>;
};

/**
 * 获取动作标签
 */
export const getActionTag = (action: string): React.ReactNode => {
  return action === 'allow' ? (
    <Tag color="success" icon={<CheckCircleOutlined />}>
      允许
    </Tag>
  ) : (
    <Tag color="error" icon={<CloseCircleOutlined />}>
      拒绝
    </Tag>
  );
};

/**
 * 格式化目标地址
 */
export const formatDestination = (destIp?: string, destPort?: string): string => {
  const dest = destIp || '*';
  const port = destPort ? `:${destPort}` : '';
  return `${dest}${port}`;
};

/**
 * 格式化带宽限制
 */
export const formatBandwidth = (limit?: number): string => {
  return limit ? `${limit} Mbps` : '-';
};
