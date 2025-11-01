import {
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';

/**
 * 快照相关常量
 */

// 状态配置
export const STATUS_CONFIG = {
  creating: { color: 'processing' as const, icon: <ClockCircleOutlined />, text: '创建中' },
  ready: { color: 'success' as const, icon: <CheckCircleOutlined />, text: '就绪' },
  restoring: { color: 'processing' as const, icon: <ClockCircleOutlined />, text: '恢复中' },
  failed: { color: 'error' as const, icon: <ExclamationCircleOutlined />, text: '失败' },
};

// 状态筛选选项
export const STATUS_FILTER_OPTIONS = [
  { label: '创建中', value: 'creating' },
  { label: '就绪', value: 'ready' },
  { label: '恢复中', value: 'restoring' },
  { label: '失败', value: 'failed' },
];

// 压缩状态筛选
export const COMPRESSED_FILTERS = [
  { text: '已压缩', value: true },
  { text: '未压缩', value: false },
];

// 最大存储容量 (100GB)
export const MAX_STORAGE_SIZE = 100 * 1024 * 1024 * 1024;
