import React from 'react';
import { Card, Space, Input, Select, Button } from 'antd';
import {
  ReloadOutlined,
  SearchOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { STATUS_OPTIONS } from './constants';

interface FailoverFilterBarProps {
  deviceId: string;
  status?: string;
  onDeviceIdChange: (value: string) => void;
  onStatusChange: (value: string | undefined) => void;
  onSearch: () => void;
  onRefresh: () => void;
  onTrigger: () => void;
}

export const FailoverFilterBar: React.FC<FailoverFilterBarProps> = React.memo(
  ({
    deviceId,
    status,
    onDeviceIdChange,
    onStatusChange,
    onSearch,
    onRefresh,
    onTrigger,
  }) => {
    return (
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input
            placeholder="设备ID"
            value={deviceId}
            onChange={(e) => onDeviceIdChange(e.target.value)}
            style={{ width: 200 }}
          />
          <Select
            placeholder="状态"
            value={status}
            onChange={onStatusChange}
            style={{ width: 120 }}
            allowClear
            options={STATUS_OPTIONS}
          />
          <Button type="primary" icon={<SearchOutlined />} onClick={onSearch}>
            搜索
          </Button>
          <Button icon={<ReloadOutlined />} onClick={onRefresh}>
            刷新
          </Button>
          <Button
            type="primary"
            icon={<ThunderboltOutlined />}
            onClick={onTrigger}
            danger
          >
            触发故障转移
          </Button>
        </Space>
      </Card>
    );
  }
);

FailoverFilterBar.displayName = 'FailoverFilterBar';
