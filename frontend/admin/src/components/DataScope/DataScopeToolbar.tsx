import { memo } from 'react';
import { Button, Space } from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';

interface DataScopeToolbarProps {
  onCreate: () => void;
  onRefresh: () => void;
}

export const DataScopeToolbar = memo<DataScopeToolbarProps>(({ onCreate, onRefresh }) => {
  return (
    <Space style={{ marginBottom: 16 }}>
      <Button type="primary" icon={<PlusOutlined />} onClick={onCreate}>
        新建配置
      </Button>
      <Button icon={<ReloadOutlined />} onClick={onRefresh}>
        刷新
      </Button>
    </Space>
  );
});

DataScopeToolbar.displayName = 'DataScopeToolbar';
