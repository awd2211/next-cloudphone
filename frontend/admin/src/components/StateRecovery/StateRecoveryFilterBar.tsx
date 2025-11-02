import React from 'react';
import { Card, Space, Input, Select, Button } from 'antd';
import {
  ReloadOutlined,
  RollbackOutlined,
  SearchOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { STATUS_OPTIONS } from './constants';

interface StateRecoveryFilterBarProps {
  deviceId: string;
  status?: string;
  validateLoading: boolean;
  onDeviceIdChange: (value: string) => void;
  onStatusChange: (value: string | undefined) => void;
  onSearch: () => void;
  onRefresh: () => void;
  onValidate: () => void;
  onRecovery: () => void;
}

export const StateRecoveryFilterBar: React.FC<StateRecoveryFilterBarProps> = React.memo(
  ({
    deviceId,
    status,
    validateLoading,
    onDeviceIdChange,
    onStatusChange,
    onSearch,
    onRefresh,
    onValidate,
    onRecovery,
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
            icon={<CheckCircleOutlined />}
            onClick={onValidate}
            loading={validateLoading}
          >
            验证一致性
          </Button>
          <Button type="primary" icon={<RollbackOutlined />} onClick={onRecovery}>
            恢复状态
          </Button>
        </Space>
      </Card>
    );
  }
);

StateRecoveryFilterBar.displayName = 'StateRecoveryFilterBar';
