/**
 * Failover 常量和类型定义
 */

export interface FailoverRecord {
  id: string;
  deviceId: string;
  deviceName: string;
  sourceNode: string;
  targetNode: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'rolled_back';
  failureReason?: string;
  triggerType: 'manual' | 'automatic' | 'health_check';
  startedAt: string;
  completedAt?: string;
  duration?: number;
  errorMessage?: string;
}

export const STATUS_OPTIONS = [
  { value: 'pending', label: '等待中' },
  { value: 'in_progress', label: '进行中' },
  { value: 'completed', label: '已完成' },
  { value: 'failed', label: '失败' },
  { value: 'rolled_back', label: '已回滚' },
];

export const STATUS_CONFIG: Record<string, { color: string; text: string }> = {
  pending: { color: 'default', text: '等待中' },
  in_progress: { color: 'processing', text: '进行中' },
  completed: { color: 'success', text: '已完成' },
  failed: { color: 'error', text: '失败' },
  rolled_back: { color: 'warning', text: '已回滚' },
};

export const TRIGGER_TYPE_MAP: Record<string, string> = {
  manual: '手动',
  automatic: '自动',
  health_check: '健康检查',
};
