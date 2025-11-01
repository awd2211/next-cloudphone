/**
 * QuotaActions - 配额操作按钮组件
 * 使用 React.memo 优化，避免不必要的重渲染
 */
import { memo } from 'react';
import { Space, Button } from 'antd';

interface QuotaActionsProps {
  onEdit: () => void;
  onDetail: () => void;
}

/**
 * QuotaActions 组件
 * 配额表格的操作按钮（编辑、详情）
 */
export const QuotaActions = memo<QuotaActionsProps>(({ onEdit, onDetail }) => {
  return (
    <Space>
      <Button type="link" size="small" onClick={onEdit}>
        编辑
      </Button>
      <Button type="link" size="small" onClick={onDetail}>
        详情
      </Button>
    </Space>
  );
});

QuotaActions.displayName = 'QuotaActions';
