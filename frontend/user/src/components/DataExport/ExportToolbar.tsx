import React, { useMemo } from 'react';
import { Card, Space, Button, Select, Popconfirm } from 'antd';
import {
  ReloadOutlined,
  DeleteOutlined,
  ClearOutlined,
} from '@ant-design/icons';
import { ExportDataType, ExportStatus } from '@/services/export';

const { Option } = Select;

interface ExportToolbarProps {
  selectedCount: number;
  onRefresh: () => void;
  onBatchDelete: () => void;
  onClearCompleted: () => void;
  onClearFailed: () => void;
  onStatusChange: (status?: ExportStatus) => void;
  onDataTypeChange: (dataType?: ExportDataType) => void;
}

/**
 * 导出工具栏组件
 * 包含刷新、批量操作、筛选功能
 */
export const ExportToolbar: React.FC<ExportToolbarProps> = React.memo(({
  selectedCount,
  onRefresh,
  onBatchDelete,
  onClearCompleted,
  onClearFailed,
  onStatusChange,
  onDataTypeChange,
}) => {
  // 状态配置
  const statusOptions = useMemo(() => [
    { label: '等待中', value: ExportStatus.PENDING },
    { label: '处理中', value: ExportStatus.PROCESSING },
    { label: '已完成', value: ExportStatus.COMPLETED },
    { label: '失败', value: ExportStatus.FAILED },
    { label: '已过期', value: ExportStatus.EXPIRED },
  ], []);

  // 数据类型配置
  const dataTypeOptions = useMemo(() => [
    { label: '订单数据', value: ExportDataType.ORDERS },
    { label: '设备数据', value: ExportDataType.DEVICES },
    { label: '工单数据', value: ExportDataType.TICKETS },
    { label: '账单数据', value: ExportDataType.BILLING },
    { label: '使用记录', value: ExportDataType.USAGE },
    { label: '消息通知', value: ExportDataType.MESSAGES },
    { label: '交易记录', value: ExportDataType.TRANSACTIONS },
  ], []);

  return (
    <Card style={{ marginBottom: 16 }}>
      <Space wrap>
        <Button icon={<ReloadOutlined />} onClick={onRefresh}>
          刷新
        </Button>

        <Button
          danger
          icon={<DeleteOutlined />}
          disabled={selectedCount === 0}
          onClick={onBatchDelete}
        >
          删除选中 ({selectedCount})
        </Button>

        <Popconfirm title="确认清空所有已完成的任务？" onConfirm={onClearCompleted}>
          <Button icon={<ClearOutlined />}>清空已完成</Button>
        </Popconfirm>

        <Popconfirm title="确认清空所有失败的任务？" onConfirm={onClearFailed}>
          <Button icon={<ClearOutlined />}>清空失败</Button>
        </Popconfirm>

        <Select
          placeholder="状态筛选"
          style={{ width: 120 }}
          allowClear
          onChange={onStatusChange}
        >
          {statusOptions.map((option) => (
            <Option key={option.value} value={option.value}>
              {option.label}
            </Option>
          ))}
        </Select>

        <Select
          placeholder="数据类型"
          style={{ width: 120 }}
          allowClear
          onChange={onDataTypeChange}
        >
          {dataTypeOptions.map((option) => (
            <Option key={option.value} value={option.value}>
              {option.label}
            </Option>
          ))}
        </Select>
      </Space>
    </Card>
  );
});

ExportToolbar.displayName = 'ExportToolbar';
