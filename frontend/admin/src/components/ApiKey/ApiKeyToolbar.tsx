import { memo } from 'react';
import { Space, Input, Button } from 'antd';
import { ReloadOutlined, PlusOutlined } from '@ant-design/icons';

interface ApiKeyToolbarProps {
  filterUserId: string;
  onFilterUserIdChange: (value: string) => void;
  onRefresh: () => void;
  onCreate: () => void;
}

export const ApiKeyToolbar = memo<ApiKeyToolbarProps>(({
  filterUserId,
  onFilterUserIdChange,
  onRefresh,
  onCreate,
}) => {
  return (
    <Space>
      <Input
        placeholder="用户ID"
        value={filterUserId}
        onChange={(e) => onFilterUserIdChange(e.target.value)}
        style={{ width: 200 }}
        allowClear
      />
      <Button icon={<ReloadOutlined />} onClick={onRefresh}>
        刷新
      </Button>
      <Button type="primary" icon={<PlusOutlined />} onClick={onCreate}>
        新建密钥
      </Button>
    </Space>
  );
});

ApiKeyToolbar.displayName = 'ApiKeyToolbar';
