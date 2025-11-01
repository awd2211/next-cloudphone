import { memo } from 'react';
import { Space, Input, Select, Button } from 'antd';
import { ReloadOutlined, PlusOutlined } from '@ant-design/icons';
import type { OperationType } from '@/types';

interface FieldPermissionToolbarProps {
  filterRoleId: string;
  filterResourceType: string;
  filterOperation: OperationType | undefined;
  operationTypes: Array<{ value: OperationType; label: string }>;
  onFilterRoleIdChange: (value: string) => void;
  onFilterResourceTypeChange: (value: string) => void;
  onFilterOperationChange: (value: OperationType | undefined) => void;
  onRefresh: () => void;
  onCreate: () => void;
}

export const FieldPermissionToolbar = memo<FieldPermissionToolbarProps>(({
  filterRoleId,
  filterResourceType,
  filterOperation,
  operationTypes,
  onFilterRoleIdChange,
  onFilterResourceTypeChange,
  onFilterOperationChange,
  onRefresh,
  onCreate,
}) => {
  return (
    <Space>
      <Input
        placeholder="角色ID"
        value={filterRoleId}
        onChange={(e) => onFilterRoleIdChange(e.target.value)}
        style={{ width: 150 }}
        allowClear
      />
      <Input
        placeholder="资源类型"
        value={filterResourceType}
        onChange={(e) => onFilterResourceTypeChange(e.target.value)}
        style={{ width: 150 }}
        allowClear
      />
      <Select
        placeholder="操作类型"
        value={filterOperation}
        onChange={onFilterOperationChange}
        style={{ width: 150 }}
        allowClear
        options={operationTypes}
      />
      <Button icon={<ReloadOutlined />} onClick={onRefresh}>
        刷新
      </Button>
      <Button type="primary" icon={<PlusOutlined />} onClick={onCreate}>
        新建配置
      </Button>
    </Space>
  );
});

FieldPermissionToolbar.displayName = 'FieldPermissionToolbar';
