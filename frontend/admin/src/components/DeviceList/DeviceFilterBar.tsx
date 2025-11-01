import { memo } from 'react';
import { Space, Input, Select, DatePicker, Button, Badge } from 'antd';
import { SearchOutlined, WifiOutlined } from '@ant-design/icons';

const { Search } = Input;
const { RangePicker } = DatePicker;

interface DeviceFilterBarProps {
  onSearch: (value: string) => void;
  onStatusChange: (value: string | undefined) => void;
  onAndroidVersionChange: (value: string | undefined) => void;
  onDateRangeChange: (dates: any, dateStrings: [string, string]) => void;
  isConnected: boolean;
  realtimeEnabled: boolean;
  onRealtimeToggle: () => void;
}

/**
 * 设备筛选栏组件
 * 包含搜索、状态筛选、Android版本筛选、日期范围筛选、实时更新开关
 */
export const DeviceFilterBar = memo<DeviceFilterBarProps>(
  ({
    onSearch,
    onStatusChange,
    onAndroidVersionChange,
    onDateRangeChange,
    isConnected,
    realtimeEnabled,
    onRealtimeToggle,
  }) => {
    return (
      <Space wrap>
        <Search
          placeholder="搜索设备名称或ID"
          allowClear
          style={{ width: 250 }}
          onSearch={onSearch}
          prefix={<SearchOutlined />}
        />

        <Select
          placeholder="状态筛选"
          allowClear
          style={{ width: 120 }}
          onChange={onStatusChange}
          options={[
            { label: '空闲', value: 'idle' },
            { label: '运行中', value: 'running' },
            { label: '已停止', value: 'stopped' },
            { label: '错误', value: 'error' },
          ]}
        />

        <Select
          placeholder="Android版本"
          allowClear
          style={{ width: 150 }}
          onChange={onAndroidVersionChange}
          options={[
            { label: 'Android 12', value: 'android-12' },
            { label: 'Android 13', value: 'android-13' },
            { label: 'Android 14', value: 'android-14' },
          ]}
        />

        <RangePicker onChange={onDateRangeChange} />

        <Badge dot={isConnected} status={isConnected ? 'success' : 'error'}>
          <Button
            icon={<WifiOutlined />}
            onClick={onRealtimeToggle}
            type={realtimeEnabled ? 'primary' : 'default'}
          >
            实时更新
          </Button>
        </Badge>
      </Space>
    );
  }
);

DeviceFilterBar.displayName = 'DeviceFilterBar';
