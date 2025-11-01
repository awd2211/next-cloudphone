/**
 * QuickActionsCard - 快捷操作卡片组件
 * 使用 React.memo 优化，避免不必要的重渲染
 */
import { memo } from 'react';
import { Card, Space, Button } from 'antd';
import { UserOutlined, DashboardOutlined } from '@ant-design/icons';

interface QuickActionsCardProps {
  onTestUserAccess: () => void;
  onViewStats: () => void;
}

/**
 * QuickActionsCard 组件
 * 快捷操作按钮
 */
export const QuickActionsCard = memo<QuickActionsCardProps>(
  ({ onTestUserAccess, onViewStats }) => {
    return (
      <Card title="快捷操作">
        <Space direction="vertical" style={{ width: '100%' }}>
          <Button block icon={<UserOutlined />} onClick={onTestUserAccess}>
            测试用户菜单访问
          </Button>
          <Button block icon={<DashboardOutlined />} onClick={onViewStats}>
            查看缓存统计详情
          </Button>
        </Space>
      </Card>
    );
  }
);

QuickActionsCard.displayName = 'QuickActionsCard';
