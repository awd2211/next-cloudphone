import React from 'react';
import { Button, Space } from 'antd';
import { ArrowLeftOutlined, ReloadOutlined } from '@ant-design/icons';

interface HeaderActionsProps {
  deviceId: string;
  loading: boolean;
  autoRefresh: boolean;
  onBack: () => void;
  onRefresh: () => void;
  onToggleAutoRefresh: () => void;
}

/**
 * 头部操作按钮组件
 *
 * 优化点：
 * - 使用 React.memo 优化
 * - 3 个操作按钮：返回、刷新、自动刷新切换
 */
export const HeaderActions: React.FC<HeaderActionsProps> = React.memo(
  ({ loading, autoRefresh, onBack, onRefresh, onToggleAutoRefresh }) => {
    return (
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={onBack}>
          返回设备详情
        </Button>
        <Button icon={<ReloadOutlined />} onClick={onRefresh} loading={loading}>
          手动刷新
        </Button>
        <Button type={autoRefresh ? 'primary' : 'default'} onClick={onToggleAutoRefresh}>
          {autoRefresh ? '停止自动刷新' : '开启自动刷新'}
        </Button>
      </Space>
    );
  }
);

HeaderActions.displayName = 'HeaderActions';
