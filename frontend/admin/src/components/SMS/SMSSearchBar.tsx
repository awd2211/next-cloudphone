import { memo } from 'react';
import { Card, Space, Input, Select, DatePicker, Button } from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  SendOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { STATUS_OPTIONS, PROVIDER_OPTIONS } from './constants';

const { RangePicker } = DatePicker;

export interface SMSSearchBarProps {
  phone: string;
  status: string | undefined;
  provider: string | undefined;
  dateRange: any;
  onPhoneChange: (value: string) => void;
  onStatusChange: (value: string | undefined) => void;
  onProviderChange: (value: string | undefined) => void;
  onDateRangeChange: (dates: any) => void;
  onSearch: () => void;
  onReset: () => void;
  onSendClick: () => void;
}

/**
 * SMS 搜索区域组件
 */
export const SMSSearchBar = memo<SMSSearchBarProps>(
  ({
    phone,
    status,
    provider,
    dateRange,
    onPhoneChange,
    onStatusChange,
    onProviderChange,
    onDateRangeChange,
    onSearch,
    onReset,
    onSendClick,
  }) => {
    return (
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input
            placeholder="手机号"
            value={phone}
            onChange={(e) => onPhoneChange(e.target.value)}
            style={{ width: 150 }}
          />
          <Select
            placeholder="状态"
            value={status}
            onChange={onStatusChange}
            style={{ width: 120 }}
            allowClear
            options={STATUS_OPTIONS}
          />
          <Select
            placeholder="供应商"
            value={provider}
            onChange={onProviderChange}
            style={{ width: 120 }}
            allowClear
            options={PROVIDER_OPTIONS}
          />
          <RangePicker value={dateRange} onChange={onDateRangeChange} />
          <Button type="primary" icon={<SearchOutlined />} onClick={onSearch}>
            搜索
          </Button>
          <Button icon={<ReloadOutlined />} onClick={onReset}>
            重置
          </Button>
          <Button type="primary" icon={<SendOutlined />} onClick={onSendClick}>
            发送短信
          </Button>
          <Button icon={<SettingOutlined />}>供应商配置</Button>
        </Space>
      </Card>
    );
  },
);

SMSSearchBar.displayName = 'SMSSearchBar';
