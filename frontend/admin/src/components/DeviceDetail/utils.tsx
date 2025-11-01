import { Tag } from 'antd';
import { DEVICE_STATUS_MAP } from './constants';

export const getStatusTag = (status: string) => {
  const config = DEVICE_STATUS_MAP[status] || { color: 'default', text: status };
  return <Tag color={config.color}>{config.text}</Tag>;
};
