import React from 'react';
import { Space, Button } from 'antd';
import {
  ArrowLeftOutlined,
  DashboardOutlined,
  CameraOutlined,
} from '@ant-design/icons';

interface DeviceHeaderActionsProps {
  onBack: () => void;
  onMonitor: () => void;
  onSnapshots: () => void;
}

/**
 * 设备详情页头部操作按钮组
 * 包含返回、监控、快照按钮
 */
export const DeviceHeaderActions: React.FC<DeviceHeaderActionsProps> = React.memo(({
  onBack,
  onMonitor,
  onSnapshots,
}) => {
  return (
    <Space style={{ marginBottom: 24 }}>
      <Button icon={<ArrowLeftOutlined />} onClick={onBack}>
        返回设备列表
      </Button>
      <Button
        type="primary"
        icon={<DashboardOutlined />}
        onClick={onMonitor}
      >
        实时监控
      </Button>
      <Button icon={<CameraOutlined />} onClick={onSnapshots}>
        快照管理
      </Button>
    </Space>
  );
});

DeviceHeaderActions.displayName = 'DeviceHeaderActions';
