import { memo } from 'react';
import { Space, Input, Select, DatePicker, Button } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import type { AuditLevel } from '@/types';

const { RangePicker } = DatePicker;

export interface AuditFilterBarProps {
  filterUserId: string;
  filterLevel: AuditLevel | undefined;
  filterResourceType: string;
  filterSuccess: boolean | undefined;
  onUserIdChange: (value: string) => void;
  onLevelChange: (value: AuditLevel | undefined) => void;
  onResourceTypeChange: (value: string) => void;
  onSuccessChange: (value: boolean | undefined) => void;
  onDateRangeChange: (dates: any) => void;
  onRefresh: () => void;
}

/**
 * 审计日志筛选栏组件
 */
export const AuditFilterBar = memo<AuditFilterBarProps>(
  ({
    filterUserId,
    filterLevel,
    filterResourceType,
    filterSuccess,
    onUserIdChange,
    onLevelChange,
    onResourceTypeChange,
    onSuccessChange,
    onDateRangeChange,
    onRefresh,
  }) => {
    return (
      <Space wrap>
        <Input
          placeholder="用户ID"
          value={filterUserId}
          onChange={(e) => onUserIdChange(e.target.value)}
          style={{ width: 150 }}
          allowClear
        />
        <Select
          placeholder="级别"
          value={filterLevel}
          onChange={onLevelChange}
          style={{ width: 120 }}
          allowClear
        >
          <Select.Option value="info">信息</Select.Option>
          <Select.Option value="warning">警告</Select.Option>
          <Select.Option value="error">错误</Select.Option>
          <Select.Option value="critical">严重</Select.Option>
        </Select>
        <Input
          placeholder="资源类型"
          value={filterResourceType}
          onChange={(e) => onResourceTypeChange(e.target.value)}
          style={{ width: 120 }}
          allowClear
        />
        <Select
          placeholder="状态"
          value={filterSuccess}
          onChange={onSuccessChange}
          style={{ width: 100 }}
          allowClear
        >
          <Select.Option value={true}>成功</Select.Option>
          <Select.Option value={false}>失败</Select.Option>
        </Select>
        <RangePicker showTime onChange={onDateRangeChange} style={{ width: 350 }} />
        <Button icon={<ReloadOutlined />} onClick={onRefresh}>
          刷新
        </Button>
      </Space>
    );
  }
);

AuditFilterBar.displayName = 'AuditFilterBar';
