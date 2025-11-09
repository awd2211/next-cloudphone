import { memo, useMemo } from 'react';
import { Table, Tag, Space, Button, Typography } from 'antd';
import { EyeOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import type { AuditLog, AuditLevel, AuditAction } from '@/types';
import {
  getLevelIcon,
  getLevelColor,
  getLevelLabel,
  getActionLabel,
  getActionCategory
} from './utils';

const TABLE_SCROLL_X = 1800; // 表格横向滚动宽度

const { Text } = Typography;

export interface AuditTableProps {
  logs: AuditLog[];
  loading: boolean;
  onViewDetail: (log: AuditLog) => void;
}

/**
 * 审计日志表格组件
 */
export const AuditTable = memo<AuditTableProps>(({ logs, loading, onViewDetail }) => {
  const columns = useMemo(
    () => [
      {
        title: '时间',
        dataIndex: 'createdAt',
        key: 'createdAt',
        width: 170,
        render: (date: string) => new Date(date).toLocaleString('zh-CN'),
        sorter: (a: AuditLog, b: AuditLog) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      },
      {
        title: '级别',
        dataIndex: 'level',
        key: 'level',
        width: 100,
        sorter: (a, b) => a.level.localeCompare(b.level),
        render: (level: AuditLevel) => (
          <Tag icon={getLevelIcon(level)} color={getLevelColor(level)}>
            {getLevelLabel(level)}
          </Tag>
        ),
      },
      {
        title: '操作',
        dataIndex: 'action',
        key: 'action',
        width: 150,
        sorter: (a, b) => a.action.localeCompare(b.action),
        render: (action: AuditAction) => (
          <Space direction="vertical" size={0}>
            <Text strong>{getActionLabel(action)}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {getActionCategory(action)}
            </Text>
          </Space>
        ),
      },
      {
        title: '用户ID',
        dataIndex: 'userId',
        key: 'userId',
        width: 120,
        ellipsis: true,
        sorter: (a, b) => a.userId.localeCompare(b.userId),
      },
      {
        title: '资源类型',
        dataIndex: 'resourceType',
        key: 'resourceType',
        width: 120,
        sorter: (a, b) => a.resourceType.localeCompare(b.resourceType),
        render: (type: string) => <Tag color="geekblue">{type}</Tag>,
      },
      {
        title: '资源ID',
        dataIndex: 'resourceId',
        key: 'resourceId',
        width: 120,
        ellipsis: true,
        sorter: (a, b) => (a.resourceId || '').localeCompare(b.resourceId || ''),
        render: (id?: string) => id || <span style={{ color: '#999' }}>-</span>,
      },
      {
        title: '描述',
        dataIndex: 'description',
        key: 'description',
        width: 250,
        ellipsis: true,
      },
      {
        title: 'IP地址',
        dataIndex: 'ipAddress',
        key: 'ipAddress',
        width: 130,
        render: (ip?: string) => ip || <span style={{ color: '#999' }}>-</span>,
      },
      {
        title: '状态',
        dataIndex: 'success',
        key: 'success',
        width: 80,
        sorter: (a, b) => Number(a.success) - Number(b.success),
        render: (success: boolean) =>
          success ? (
            <Tag icon={<CheckCircleOutlined />} color="success">
              成功
            </Tag>
          ) : (
            <Tag icon={<CloseCircleOutlined />} color="error">
              失败
            </Tag>
          ),
      },
      {
        title: '操作',
        key: 'action',
        width: 100,
        fixed: 'right' as const,
        render: (_: any, record: AuditLog) => (
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => onViewDetail(record)}
          >
            详情
          </Button>
        ),
      },
    ],
    [onViewDetail]
  );

  return (
    <Table
      columns={columns}
      dataSource={logs}
      rowKey="id"
      loading={loading}
      scroll={{ x: TABLE_SCROLL_X, y: 600 }}
      virtual
      pagination={{
        showSizeChanger: true,
        pageSizeOptions: ['20', '50', '100', '200'],
        showQuickJumper: true,
        showTotal: (total) => `共 ${total} 条`,
      }}
    />
  );
});

AuditTable.displayName = 'AuditTable';
