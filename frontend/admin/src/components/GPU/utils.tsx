/**
 * GPU 模块工具函数
 */
import { Tag } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { STATUS_CONFIG, ALLOCATION_MODE_CONFIG } from './constants';
import { SEMANTIC } from '@/theme';

/**
 * 获取状态标签
 */
export const getStatusTag = (status: string) => {
  const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.offline;
  const icon = status === 'online' ? <CheckCircleOutlined /> : <CloseCircleOutlined />;
  return (
    <Tag color={config.color} icon={icon}>
      {status}
    </Tag>
  );
};

/**
 * 获取分配模式标签
 */
export const getAllocationModeTag = (mode: string) => {
  const config =
    ALLOCATION_MODE_CONFIG[mode as keyof typeof ALLOCATION_MODE_CONFIG] ||
    ALLOCATION_MODE_CONFIG.available;
  return <Tag color={config.color}>{config.text}</Tag>;
};

/**
 * 获取温度颜色
 */
export const getTemperatureColor = (temp: number): string => {
  if (temp > 80) return SEMANTIC.error.main;
  if (temp > 70) return SEMANTIC.warning.main;
  return SEMANTIC.success.main;
};
