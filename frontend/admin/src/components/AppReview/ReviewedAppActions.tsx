/**
 * ReviewedAppActions - 已审核应用操作按钮组件
 * 使用 React.memo 优化，避免不必要的重渲染
 */
import { memo } from 'react';
import { Space, Button } from 'antd';
import { EyeOutlined, HistoryOutlined } from '@ant-design/icons';

interface Application {
  id: string;
  [key: string]: any;
}

interface ReviewedAppActionsProps {
  app: Application;
  onViewDetail: (app: Application) => void;
  onViewHistory: (app: Application) => void;
}

/**
 * ReviewedAppActions 组件
 * 提供已审核应用的操作按钮：详情、历史
 */
export const ReviewedAppActions = memo<ReviewedAppActionsProps>(
  ({ app, onViewDetail, onViewHistory }) => {
    return (
      <Space size="small">
        <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => onViewDetail(app)}>
          详情
        </Button>
        <Button
          type="link"
          size="small"
          icon={<HistoryOutlined />}
          onClick={() => onViewHistory(app)}
        >
          历史
        </Button>
      </Space>
    );
  }
);

ReviewedAppActions.displayName = 'ReviewedAppActions';
