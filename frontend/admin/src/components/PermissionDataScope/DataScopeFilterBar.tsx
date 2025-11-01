import { memo } from 'react';
import { Space, Button, Select } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { Role } from '@/types';
import { resourceTypes } from './constants';

interface DataScopeFilterBarProps {
  roles: Role[];
  filterRoleId: string | undefined;
  filterResourceType: string | undefined;
  onRoleChange: (value: string | undefined) => void;
  onResourceTypeChange: (value: string | undefined) => void;
  onCreate: () => void;
}

export const DataScopeFilterBar = memo<DataScopeFilterBarProps>(
  ({ roles, filterRoleId, filterResourceType, onRoleChange, onResourceTypeChange, onCreate }) => {
    return (
      <Space style={{ marginBottom: 16 }} size="middle">
        <Select
          placeholder="选择角色筛选"
          style={{ width: 200 }}
          allowClear
          value={filterRoleId}
          onChange={onRoleChange}
        >
          {roles.map((role) => (
            <Select.Option key={role.id} value={role.id}>
              {role.name}
            </Select.Option>
          ))}
        </Select>

        <Select
          placeholder="选择资源类型筛选"
          style={{ width: 200 }}
          allowClear
          value={filterResourceType}
          onChange={onResourceTypeChange}
        >
          {resourceTypes.map((type) => (
            <Select.Option key={type.value} value={type.value}>
              {type.label}
            </Select.Option>
          ))}
        </Select>

        <Button type="primary" icon={<PlusOutlined />} onClick={onCreate}>
          创建配置
        </Button>
      </Space>
    );
  }
);

DataScopeFilterBar.displayName = 'DataScopeFilterBar';
