import React from 'react';
import { Button, Tag, Space, Progress, Popconfirm } from 'antd';
import type { GlobalToken } from 'antd';
import {
  DownloadOutlined,
  DeleteOutlined,
  ReloadOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import {
  ExportDataType,
  ExportFormat,
  ExportStatus,
  formatFileSize,
  type ExportTask,
} from '@/services/export';

interface ExportTableActionsProps {
  onDownload: (task: ExportTask) => void;
  onDelete: (id: string) => void;
  onRetry: (id: string) => void;
  token?: GlobalToken;
}

// 获取数据类型配置（支持主题 token）
const getDataTypeConfigWithToken = (token?: GlobalToken): Record<ExportDataType, { label: string; color: string }> => ({
  [ExportDataType.ORDERS]: { label: '订单数据', color: token?.colorPrimary || '#1677ff' },
  [ExportDataType.DEVICES]: { label: '设备数据', color: token?.colorSuccess || '#52c41a' },
  [ExportDataType.TICKETS]: { label: '工单数据', color: token?.colorWarning || '#faad14' },
  [ExportDataType.BILLING]: { label: '账单数据', color: token?.magenta || '#eb2f96' },
  [ExportDataType.USAGE]: { label: '使用记录', color: token?.cyan || '#13c2c2' },
  [ExportDataType.MESSAGES]: { label: '消息通知', color: token?.purple || '#722ed1' },
  [ExportDataType.TRANSACTIONS]: { label: '交易记录', color: token?.orange || '#fa8c16' },
});

// 数据类型配置（兼容旧代码）
const dataTypeConfig = getDataTypeConfigWithToken();

// 获取格式配置（支持主题 token）
const getFormatConfigWithToken = (token?: GlobalToken): Record<ExportFormat, { label: string; icon: React.ReactNode; color: string }> => ({
  [ExportFormat.CSV]: { label: 'CSV', icon: <FileTextOutlined />, color: token?.colorSuccess || '#52c41a' },
  [ExportFormat.EXCEL]: { label: 'Excel', icon: <FileExcelOutlined />, color: token?.colorPrimary || '#1677ff' },
  [ExportFormat.PDF]: { label: 'PDF', icon: <FilePdfOutlined />, color: token?.colorError || '#f5222d' },
  [ExportFormat.JSON]: { label: 'JSON', icon: <FileTextOutlined />, color: token?.colorWarning || '#faad14' },
});

// 格式配置（兼容旧代码）
const formatConfig = getFormatConfigWithToken();

// 状态配置
const statusConfig: Record<ExportStatus, { label: string; icon: React.ReactNode; color: string }> = {
  [ExportStatus.PENDING]: { label: '等待中', icon: <ClockCircleOutlined />, color: 'default' },
  [ExportStatus.PROCESSING]: { label: '处理中', icon: <SyncOutlined spin />, color: 'processing' },
  [ExportStatus.COMPLETED]: { label: '已完成', icon: <CheckCircleOutlined />, color: 'success' },
  [ExportStatus.FAILED]: { label: '失败', icon: <CloseCircleOutlined />, color: 'error' },
  [ExportStatus.EXPIRED]: { label: '已过期', icon: <CloseCircleOutlined />, color: 'warning' },
};

/**
 * 创建导出任务表格列配置
 */
export const createExportTableColumns = (
  actions: ExportTableActionsProps
): ColumnsType<ExportTask> => [
  {
    title: '文件名',
    dataIndex: 'fileName',
    key: 'fileName',
    width: 250,
    ellipsis: true,
  },
  {
    title: '数据类型',
    dataIndex: 'dataType',
    key: 'dataType',
    width: 120,
    render: (type: ExportDataType) => {
      const typeConfig = actions.token ? getDataTypeConfigWithToken(actions.token) : dataTypeConfig;
      const config = typeConfig[type];
      return (
        <Tag color={config.color} icon={<FileTextOutlined />}>
          {config.label}
        </Tag>
      );
    },
  },
  {
    title: '格式',
    dataIndex: 'format',
    key: 'format',
    width: 100,
    render: (format: ExportFormat) => {
      const fmtConfig = actions.token ? getFormatConfigWithToken(actions.token) : formatConfig;
      const config = fmtConfig[format];
      return (
        <Tag color={config.color} icon={config.icon}>
          {config.label}
        </Tag>
      );
    },
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 120,
    render: (status: ExportStatus, record: ExportTask) => {
      const config = statusConfig[status];
      return (
        <Space direction="vertical" size="small">
          <Tag color={config.color} icon={config.icon}>
            {config.label}
          </Tag>
          {status === ExportStatus.PROCESSING && record.recordCount && (
            <Progress percent={50} size="small" status="active" showInfo={false} />
          )}
        </Space>
      );
    },
  },
  {
    title: '文件大小',
    dataIndex: 'fileSize',
    key: 'fileSize',
    width: 100,
    render: (size?: number) => (size ? formatFileSize(size) : '-'),
  },
  {
    title: '记录数',
    dataIndex: 'recordCount',
    key: 'recordCount',
    width: 100,
    render: (count?: number) => count || '-',
  },
  {
    title: '创建时间',
    dataIndex: 'createdAt',
    key: 'createdAt',
    width: 180,
    render: (time: string) => dayjs(time).format('YYYY-MM-DD HH:mm:ss'),
  },
  {
    title: '操作',
    key: 'action',
    width: 150,
    fixed: 'right',
    render: (_: any, record: ExportTask) => (
      <Space size="small">
        {record.status === ExportStatus.COMPLETED && (
          <Button
            type="link"
            size="small"
            icon={<DownloadOutlined />}
            onClick={() => actions.onDownload(record)}
          >
            下载
          </Button>
        )}
        {record.status === ExportStatus.FAILED && (
          <Button
            type="link"
            size="small"
            icon={<ReloadOutlined />}
            onClick={() => actions.onRetry(record.id)}
          >
            重试
          </Button>
        )}
        <Popconfirm title="确认删除此任务？" onConfirm={() => actions.onDelete(record.id)}>
          <Button type="link" size="small" danger icon={<DeleteOutlined />}>
            删除
          </Button>
        </Popconfirm>
      </Space>
    ),
  },
];
