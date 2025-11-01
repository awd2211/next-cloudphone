import { CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import type { ApiKeyStatus, ApiKey } from '@/types';

export const getStatusColor = (status: ApiKeyStatus): string => {
  switch (status) {
    case 'active':
      return 'green';
    case 'revoked':
      return 'red';
    case 'expired':
      return 'default';
    default:
      return 'default';
  }
};

export const getStatusLabel = (status: ApiKeyStatus): string => {
  switch (status) {
    case 'active':
      return '激活';
    case 'revoked':
      return '已撤销';
    case 'expired':
      return '已过期';
    default:
      return '未知';
  }
};

export const getStatusIcon = (status: ApiKeyStatus) => {
  switch (status) {
    case 'active':
      return <CheckCircleOutlined />;
    case 'revoked':
      return <CloseCircleOutlined />;
    case 'expired':
      return <ClockCircleOutlined />;
    default:
      return null;
  }
};

export const getMaskedKey = (apiKey: ApiKey): string => {
  return `${apiKey.prefix}***${apiKey.key.slice(-4)}`;
};

export const commonScopes = [
  { value: '*', label: '所有权限' },
  { value: 'devices:read', label: '设备-读取' },
  { value: 'devices:write', label: '设备-写入' },
  { value: 'devices:control', label: '设备-控制' },
  { value: 'apps:read', label: '应用-读取' },
  { value: 'apps:write', label: '应用-写入' },
  { value: 'billing:read', label: '计费-读取' },
  { value: 'user:read', label: '用户-读取' },
];
