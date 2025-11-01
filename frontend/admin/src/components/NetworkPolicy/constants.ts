import type { SelectProps } from 'antd';

/**
 * 网络策略方向配置
 */
export const DIRECTION_OPTIONS: SelectProps['options'] = [
  { label: '入站', value: 'inbound' },
  { label: '出站', value: 'outbound' },
  { label: '双向', value: 'both' },
];

export const DIRECTION_CONFIG: Record<string, { color: string; text: string }> = {
  inbound: { color: 'blue', text: '入站' },
  outbound: { color: 'green', text: '出站' },
  both: { color: 'purple', text: '双向' },
};

/**
 * 网络协议配置
 */
export const PROTOCOL_OPTIONS: SelectProps['options'] = [
  { label: '全部', value: 'all' },
  { label: 'TCP', value: 'tcp' },
  { label: 'UDP', value: 'udp' },
  { label: 'ICMP', value: 'icmp' },
];

/**
 * 策略动作配置
 */
export const ACTION_OPTIONS: SelectProps['options'] = [
  { label: '允许', value: 'allow' },
  { label: '拒绝', value: 'deny' },
];

/**
 * 测试协议配置
 */
export const TEST_PROTOCOL_OPTIONS: SelectProps['options'] = [
  { label: 'TCP', value: 'tcp' },
  { label: 'UDP', value: 'udp' },
  { label: 'ICMP (Ping)', value: 'icmp' },
];

/**
 * 表单默认值
 */
export const DEFAULT_FORM_VALUES = {
  direction: 'both',
  protocol: 'all',
  action: 'allow',
  priority: 100,
  isEnabled: true,
};

/**
 * 优先级范围
 */
export const PRIORITY_RANGE = {
  min: 1,
  max: 1000,
};

/**
 * 带宽限制范围 (Mbps)
 */
export const BANDWIDTH_RANGE = {
  min: 1,
  max: 10000,
};

/**
 * 端口范围
 */
export const PORT_RANGE = {
  min: 1,
  max: 65535,
};

/**
 * 分页配置
 */
export const TABLE_PAGE_SIZE = 10;
