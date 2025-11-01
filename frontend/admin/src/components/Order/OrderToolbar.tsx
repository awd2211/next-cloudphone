import { memo } from 'react';
import { Space, Button, Dropdown } from 'antd';
import { DownloadOutlined, DownOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';

interface OrderToolbarProps {
  selectedCount: number;
  exportMenuItems: MenuProps['items'];
  onBatchCancel: () => void;
}

export const OrderToolbar = memo<OrderToolbarProps>(
  ({ selectedCount, exportMenuItems, onBatchCancel }) => {
    return (
      <Space style={{ marginBottom: 16 }}>
        {selectedCount > 0 && (
          <Button danger onClick={onBatchCancel}>
            批量取消订单 ({selectedCount})
          </Button>
        )}
        <Dropdown menu={{ items: exportMenuItems }}>
          <Button icon={<DownloadOutlined />}>
            导出 <DownOutlined />
          </Button>
        </Dropdown>
      </Space>
    );
  }
);

OrderToolbar.displayName = 'OrderToolbar';
