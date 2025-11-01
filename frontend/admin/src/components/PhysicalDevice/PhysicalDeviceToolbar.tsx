import { memo } from 'react';
import { Space, Button } from 'antd';
import { ScanOutlined, PlusOutlined } from '@ant-design/icons';

interface PhysicalDeviceToolbarProps {
  onScanNetwork: () => void;
  onManualRegister: () => void;
}

export const PhysicalDeviceToolbar = memo<PhysicalDeviceToolbarProps>(
  ({ onScanNetwork, onManualRegister }) => {
    return (
      <Space style={{ marginBottom: '16px' }}>
        <Button type="primary" icon={<ScanOutlined />} onClick={onScanNetwork}>
          扫描网络设备
        </Button>
        <Button icon={<PlusOutlined />} onClick={onManualRegister}>
          手动注册
        </Button>
      </Space>
    );
  }
);

PhysicalDeviceToolbar.displayName = 'PhysicalDeviceToolbar';
