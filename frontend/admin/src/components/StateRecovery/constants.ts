/**
 * State Recovery 常量
 */

export interface StateRecoveryRecord {
  id: string;
  deviceId: string;
  deviceName: string;
  previousState: string;
  currentState: string;
  targetState: string;
  recoveryType: 'automatic' | 'manual' | 'rollback';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  reason?: string;
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
}

export const STATUS_OPTIONS = [
  { value: 'pending', label: '等待中' },
  { value: 'in_progress', label: '进行中' },
  { value: 'completed', label: '已完成' },
  { value: 'failed', label: '失败' },
];

export const TARGET_STATE_OPTIONS = [
  { value: 'running', label: '运行中' },
  { value: 'stopped', label: '已停止' },
  { value: 'paused', label: '已暂停' },
  { value: 'error', label: '错误' },
];

export const RECOVERY_TYPE_MAP: Record<string, string> = {
  automatic: '自动',
  manual: '手动',
  rollback: '回滚',
};

export const STATUS_CONFIG: Record<string, { color: string; text: string }> = {
  pending: { color: 'default', text: '等待中' },
  in_progress: { color: 'processing', text: '进行中' },
  completed: { color: 'success', text: '已完成' },
  failed: { color: 'error', text: '失败' },
};
