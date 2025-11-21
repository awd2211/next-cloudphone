/**
 * PendingAppActions - 待审核应用操作按钮组件
 * 使用 React.memo 优化，避免不必要的重渲染
 */
import { memo } from 'react';
import { Space, Button } from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  EditOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import type { Application } from '@/types';

interface PendingAppActionsProps {
  app: Application;
  onViewDetail: (app: Application) => void;
  onApprove: (app: Application) => void;
  onReject: (app: Application) => void;
  onRequestChanges: (app: Application) => void;
}

/**
 * PendingAppActions 组件
 * 提供待审核应用的操作按钮：详情、批准、拒绝、请求修改
 */
export const PendingAppActions = memo<PendingAppActionsProps>(
  ({ app, onViewDetail, onApprove, onReject, onRequestChanges }) => {
    return (
      <Space size="small">
        <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => onViewDetail(app)}>
          详情
        </Button>
        <Button
          type="primary"
          size="small"
          icon={<CheckCircleOutlined />}
          onClick={() => onApprove(app)}
        >
          批准
        </Button>
        <Button danger size="small" icon={<CloseCircleOutlined />} onClick={() => onReject(app)}>
          拒绝
        </Button>
        <Button size="small" icon={<EditOutlined />} onClick={() => onRequestChanges(app)}>
          请求修改
        </Button>
      </Space>
    );
  }
);

PendingAppActions.displayName = 'PendingAppActions';
