import { Tag } from 'antd';
import { CheckCircleOutlined, WarningOutlined, CloseCircleOutlined } from '@ant-design/icons';

/**
 * Consul Monitor 工具函数
 */

// 状态配置
export const STATUS_CONFIG: Record<string, { color: string; icon: React.ReactNode; text: string }> =
  {
    passing: {
      color: 'success',
      icon: <CheckCircleOutlined />,
      text: '健康',
    },
    warning: {
      color: 'warning',
      icon: <WarningOutlined />,
      text: '警告',
    },
    critical: {
      color: 'error',
      icon: <CloseCircleOutlined />,
      text: '异常',
    },
  };

/**
 * 获取状态标签
 */
export const getStatusTag = (status: string) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.critical;
  return (
    <Tag icon={config.icon} color={config.color}>
      {config.text}
    </Tag>
  );
};
