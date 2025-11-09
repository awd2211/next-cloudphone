import { memo } from 'react';
import { Space, Button, Select, Dropdown } from 'antd';
import { PlusOutlined, DownloadOutlined, BarChartOutlined, MoreOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';
import type { Role } from '@/types';
import { resourceTypes } from './constants';

interface DataScopeFilterBarProps {
  roles: Role[];
  filterRoleId: string | undefined;
  filterResourceType: string | undefined;
  totalCount?: number;
  onRoleChange: (value: string | undefined) => void;
  onResourceTypeChange: (value: string | undefined) => void;
  onCreate: () => void;
  onExport?: () => void;
  onShowStatistics?: () => void;
  onBatchDelete?: () => void;
}

export const DataScopeFilterBar = memo<DataScopeFilterBarProps>(
  ({
    roles,
    filterRoleId,
    filterResourceType,
    totalCount = 0,
    onRoleChange,
    onResourceTypeChange,
    onCreate,
    onExport,
    onShowStatistics,
    onBatchDelete,
  }) => {
    // 更多操作菜单
    const moreMenuItems: MenuProps['items'] = [
      {
        key: 'export',
        label: '导出配置',
        icon: <DownloadOutlined />,
        onClick: onExport,
      },
      {
        key: 'statistics',
        label: '统计概览',
        icon: <BarChartOutlined />,
        onClick: onShowStatistics,
      },
      {
        type: 'divider',
      },
      {
        key: 'batchDelete',
        label: '批量删除',
        danger: true,
        onClick: onBatchDelete,
      },
    ];

    return (
      <div style={{ marginBottom: 16 }}>
        <Space size="middle" wrap>
          <Select
            placeholder="选择角色筛选"
            style={{ width: 200 }}
            allowClear
            value={filterRoleId}
            onChange={onRoleChange}
            showSearch
            optionFilterProp="children"
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
            showSearch
            optionFilterProp="children"
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

          {(onExport || onShowStatistics || onBatchDelete) && (
            <Dropdown menu={{ items: moreMenuItems }} placement="bottomRight">
              <Button icon={<MoreOutlined />}>
                更多操作
              </Button>
            </Dropdown>
          )}

          <span style={{ color: '#666', marginLeft: 8 }}>
            共 {totalCount} 条配置
          </span>
        </Space>
      </div>
    );
  }
);

DataScopeFilterBar.displayName = 'DataScopeFilterBar';
