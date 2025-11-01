import { CheckCircleOutlined, CloseCircleOutlined, QuestionCircleOutlined } from '@ant-design/icons';

export const statusConfig = {
  online: {
    color: 'success' as const,
    icon: <CheckCircleOutlined />,
    text: '在线',
  },
  offline: {
    color: 'default' as const,
    icon: <CloseCircleOutlined />,
    text: '离线',
  },
  unregistered: {
    color: 'warning' as const,
    icon: <QuestionCircleOutlined />,
    text: '未注册',
  },
};

export type DeviceStatus = keyof typeof statusConfig;
