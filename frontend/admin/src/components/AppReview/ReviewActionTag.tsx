/**
 * ReviewActionTag - 审核操作类型组件
 * 使用 React.memo 优化，避免不必要的重渲染
 */
import { memo } from 'react';

type ReviewAction = 'submit' | 'approve' | 'reject' | 'request_changes';

interface ReviewActionTagProps {
  action: string;
}

const REVIEW_ACTION_MAP = {
  submit: '提交审核',
  approve: '批准',
  reject: '拒绝',
  request_changes: '请求修改',
} as const;

/**
 * ReviewActionTag 组件
 * 将英文操作类型转换为中文显示
 */
export const ReviewActionTag = memo<ReviewActionTagProps>(({ action }) => {
  return <>{REVIEW_ACTION_MAP[action as ReviewAction] || action}</>;
});

ReviewActionTag.displayName = 'ReviewActionTag';
